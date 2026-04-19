import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SosIncident, SosStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AdminNotificationService } from '../admin/admin-notification.service';
import { QUEUE_SOS_BROADCAST } from '../jobs/jobs.constants';
import { CreateIncidentDto } from './dto/create-incident.dto';
import {
  AckIncidentDto,
  ResolveIncidentDto,
} from './dto/update-incident.dto';
import { UpsertTrustedContactDto } from './dto/trusted-contact.dto';

/**
 * SOS incidents are latency-critical — every user tap must enqueue a
 * broadcast job within the same request cycle. The broadcast worker then
 * fans out to trusted contacts (SMS via outbox) and on-duty ops (admin
 * notification). Status flow: OPEN → ACKNOWLEDGED → IN_PROGRESS →
 * RESOLVED | FALSE_ALARM. The incident stays queryable after resolution
 * for audit / investor reporting.
 */
@Injectable()
export class SosService {
  private readonly logger = new Logger(SosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly adminNotifications: AdminNotificationService,
    @InjectQueue(QUEUE_SOS_BROADCAST) private readonly broadcastQueue: Queue,
  ) {}

  // ── Trusted contacts ─────────────────────────────────────────────────────

  async listTrustedContacts(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: [{ primary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createTrustedContact(userId: string, dto: UpsertTrustedContactDto) {
    if (dto.primary) {
      await this.prisma.trustedContact.updateMany({
        where: { userId, primary: true },
        data: { primary: false },
      });
    }
    return this.prisma.trustedContact.create({
      data: {
        userId,
        name: dto.name,
        phone: dto.phone,
        relation: dto.relation,
        primary: dto.primary ?? false,
      },
    });
  }

  async updateTrustedContact(
    userId: string,
    id: string,
    dto: UpsertTrustedContactDto,
  ) {
    const existing = await this.prisma.trustedContact.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('trusted contact not found');
    }
    if (dto.primary) {
      await this.prisma.trustedContact.updateMany({
        where: { userId, primary: true, NOT: { id } },
        data: { primary: false },
      });
    }
    return this.prisma.trustedContact.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        relation: dto.relation,
        primary: dto.primary ?? false,
      },
    });
  }

  async deleteTrustedContact(userId: string, id: string) {
    const existing = await this.prisma.trustedContact.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('trusted contact not found');
    }
    await this.prisma.trustedContact.delete({ where: { id } });
    return { success: true };
  }

  // ── Incidents ────────────────────────────────────────────────────────────

  async createIncident(
    userId: string,
    dto: CreateIncidentDto,
  ): Promise<SosIncident> {
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
        select: { guestId: true },
      });
      if (!booking || booking.guestId !== userId) {
        throw new BadRequestException('booking does not belong to user');
      }
    }

    const incident = await this.prisma.sosIncident.create({
      data: {
        userId,
        bookingId: dto.bookingId,
        tier: dto.tier,
        lat: dto.lat,
        lng: dto.lng,
        message: dto.message,
      },
    });

    // High-priority enqueue — broadcast must leave the request path.
    await this.broadcastQueue.add(
      'broadcast',
      { incidentId: incident.id },
      {
        priority: 1,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    );

    // Admin notification row (ops console picks up immediately).
    await this.adminNotifications.create(
      'SOS_OPENED',
      `SOS: ${dto.tier}`,
      `New ${dto.tier} incident at ${dto.lat.toFixed(4)}, ${dto.lng.toFixed(4)}${
        dto.message ? ` — "${dto.message}"` : ''
      }`,
      { incidentId: incident.id, userId, bookingId: dto.bookingId ?? null },
    );

    await this.auditService.log(userId, 'SOS_CREATED', 'sos', incident.id, {
      tier: dto.tier,
      bookingId: dto.bookingId ?? null,
    });

    this.logger.warn(
      `SOS ${incident.id} opened by ${userId} (${dto.tier}) — enqueued broadcast`,
    );
    return incident;
  }

  async getIncidentForUser(userId: string, id: string) {
    const incident = await this.prisma.sosIncident.findUnique({
      where: { id },
      include: { broadcasts: true },
    });
    if (!incident || incident.userId !== userId) {
      throw new NotFoundException('incident not found');
    }
    return incident;
  }

  async listMyIncidents(userId: string) {
    return this.prisma.sosIncident.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: 20,
    });
  }

  // ── Ops console ──────────────────────────────────────────────────────────

  async listIncidents(status?: SosStatus) {
    return this.prisma.sosIncident.findMany({
      where: status ? { status } : undefined,
      orderBy: { openedAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        broadcasts: true,
      },
    });
  }

  async ackIncident(operatorId: string, id: string, _dto: AckIncidentDto) {
    const existing = await this.prisma.sosIncident.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('incident not found');
    if (existing.status !== SosStatus.OPEN) {
      throw new BadRequestException(`incident already ${existing.status}`);
    }
    const updated = await this.prisma.sosIncident.update({
      where: { id },
      data: {
        status: SosStatus.ACKNOWLEDGED,
        ackedAt: new Date(),
        ackedBy: operatorId,
      },
    });
    await this.auditService.log(operatorId, 'SOS_ACKED', 'sos', id, {});
    return updated;
  }

  async startProgress(operatorId: string, id: string) {
    const existing = await this.prisma.sosIncident.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('incident not found');
    if (
      existing.status !== SosStatus.ACKNOWLEDGED &&
      existing.status !== SosStatus.OPEN
    ) {
      throw new BadRequestException(`incident already ${existing.status}`);
    }
    const updated = await this.prisma.sosIncident.update({
      where: { id },
      data: {
        status: SosStatus.IN_PROGRESS,
        ackedAt: existing.ackedAt ?? new Date(),
        ackedBy: existing.ackedBy ?? operatorId,
      },
    });
    await this.auditService.log(operatorId, 'SOS_IN_PROGRESS', 'sos', id, {});
    return updated;
  }

  async resolveIncident(
    operatorId: string,
    id: string,
    dto: ResolveIncidentDto,
  ) {
    const existing = await this.prisma.sosIncident.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('incident not found');
    if (
      existing.status === SosStatus.RESOLVED ||
      existing.status === SosStatus.FALSE_ALARM
    ) {
      throw new BadRequestException(`incident already ${existing.status}`);
    }
    const updated = await this.prisma.sosIncident.update({
      where: { id },
      data: {
        status: dto.falseAlarm ? SosStatus.FALSE_ALARM : SosStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedBy: operatorId,
      },
    });
    await this.auditService.log(
      operatorId,
      dto.falseAlarm ? 'SOS_FALSE_ALARM' : 'SOS_RESOLVED',
      'sos',
      id,
      { note: dto.note ?? null },
    );
    return updated;
  }
}
