import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ExperienceBookingStatus,
  ExperienceStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { BookExperienceDto } from './dto/book-experience.dto';
import { ModerateExperienceDto } from './dto/moderate-experience.dto';

@Injectable()
export class ExperienceService {
  private readonly logger = new Logger(ExperienceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Host ────────────────────────────────────────────────────────────────────

  async listHostExperiences(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');
    return this.prisma.experience.findMany({
      where: { hostId: host.id },
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { bookings: true } } },
    });
  }

  async createHostExperience(userId: string, dto: CreateExperienceDto) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host || host.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('Host must be approved before creating experiences');
    }
    this.validateWindow(dto.startsAt, dto.endsAt);

    if (dto.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: dto.listingId },
        select: { hostId: true },
      });
      if (!listing || listing.hostId !== host.id) {
        throw new ForbiddenException('Listing does not belong to host');
      }
    }

    const experience = await this.prisma.experience.create({
      data: {
        hostId: host.id,
        createdById: userId,
        listingId: dto.listingId ?? null,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        city: dto.city,
        state: dto.state,
        country: dto.country ?? 'India',
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        capacity: dto.capacity,
        priceMinor: dto.priceMinor,
        imageUrl: dto.imageUrl ?? null,
        status: ExperienceStatus.PENDING_APPROVAL,
      },
    });

    await this.writeAudit(userId, 'EXPERIENCE_CREATE', 'experience', experience.id, {
      title: experience.title,
    });
    return experience;
  }

  async updateHostExperience(
    userId: string,
    id: string,
    dto: UpdateExperienceDto,
  ) {
    const experience = await this.getOwnedHostExperience(userId, id);
    if (dto.startsAt || dto.endsAt) {
      this.validateWindow(
        dto.startsAt ?? experience.startsAt.toISOString(),
        dto.endsAt ?? experience.endsAt.toISOString(),
      );
    }
    const updated = await this.prisma.experience.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt && { endsAt: new Date(dto.endsAt) }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.priceMinor !== undefined && { priceMinor: dto.priceMinor }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        // Edits to approved experience require re-review
        ...(experience.status === ExperienceStatus.APPROVED && {
          status: ExperienceStatus.PENDING_APPROVAL,
        }),
      },
    });
    await this.writeAudit(userId, 'EXPERIENCE_UPDATE', 'experience', id, {});
    return updated;
  }

  async closeHostExperience(userId: string, id: string) {
    await this.getOwnedHostExperience(userId, id);
    const updated = await this.prisma.experience.update({
      where: { id },
      data: { status: ExperienceStatus.CLOSED },
    });
    await this.writeAudit(userId, 'EXPERIENCE_CLOSE', 'experience', id, {});
    return updated;
  }

  async getHostExperienceBookings(userId: string, id: string) {
    await this.getOwnedHostExperience(userId, id);
    return this.prisma.experienceBooking.findMany({
      where: { experienceId: id },
      orderBy: { createdAt: 'desc' },
      include: { guest: { select: { id: true, fullName: true, email: true } } },
    });
  }

  // ── Public / Guest ──────────────────────────────────────────────────────────

  async listPublicExperiences(params: {
    city?: string;
    category?: string;
    upcoming?: boolean;
  }) {
    const where: Prisma.ExperienceWhereInput = {
      status: ExperienceStatus.APPROVED,
    };
    if (params.city) where.city = { contains: params.city, mode: 'insensitive' };
    if (params.category) where.category = params.category;
    if (params.upcoming !== false) {
      where.startsAt = { gte: new Date() };
    }
    return this.prisma.experience.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      take: 100,
      include: {
        host: { select: { user: { select: { fullName: true } } } },
        _count: { select: { bookings: true } },
      },
    });
  }

  async getPublicExperience(id: string) {
    const experience = await this.prisma.experience.findFirst({
      where: { id, status: ExperienceStatus.APPROVED },
      include: {
        host: { select: { user: { select: { fullName: true } } } },
        listing: { select: { id: true, title: true, city: true, state: true } },
      },
    });
    if (!experience) throw new NotFoundException('Experience not found');
    const seatsSold = await this.countSeatsSold(id);
    return {
      ...experience,
      seatsAvailable: Math.max(0, experience.capacity - seatsSold),
    };
  }

  async bookExperience(userId: string, id: string, dto: BookExperienceDto) {
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    const existing = await this.prisma.experienceBooking.findUnique({
      where: { idempotencyKey },
    });
    if (existing) return existing;

    const experience = await this.prisma.experience.findUnique({ where: { id } });
    if (!experience || experience.status !== ExperienceStatus.APPROVED) {
      throw new NotFoundException('Experience not found');
    }
    if (experience.startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Experience has already started');
    }

    return this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.experienceBooking.aggregate({
        where: {
          experienceId: id,
          status: { in: [
            ExperienceBookingStatus.HELD,
            ExperienceBookingStatus.CONFIRMED,
            ExperienceBookingStatus.COMPLETED,
          ] },
        },
        _sum: { seats: true },
      });
      const used = confirmed._sum.seats ?? 0;
      if (used + dto.seats > experience.capacity) {
        throw new BadRequestException('Not enough seats available');
      }
      const totalMinor = experience.priceMinor * dto.seats;
      const booking = await tx.experienceBooking.create({
        data: {
          experienceId: id,
          guestId: userId,
          seats: dto.seats,
          totalMinor,
          currency: experience.currency,
          status: ExperienceBookingStatus.CONFIRMED,
          idempotencyKey,
        },
      });
      return booking;
    });
  }

  async listGuestBookings(userId: string) {
    return this.prisma.experienceBooking.findMany({
      where: { guestId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        experience: {
          select: {
            id: true, title: true, category: true, city: true, state: true,
            startsAt: true, endsAt: true, imageUrl: true,
          },
        },
      },
    });
  }

  async cancelGuestBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.experienceBooking.findUnique({
      where: { id: bookingId },
      include: { experience: true },
    });
    if (!booking || booking.guestId !== userId) {
      throw new NotFoundException('Booking not found');
    }
    if (
      booking.status === ExperienceBookingStatus.CANCELLED ||
      booking.status === ExperienceBookingStatus.REFUNDED
    ) {
      return booking;
    }
    if (booking.experience.startsAt.getTime() < Date.now()) {
      throw new BadRequestException('Cannot cancel after start');
    }
    const updated = await this.prisma.experienceBooking.update({
      where: { id: bookingId },
      data: {
        status: ExperienceBookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
    await this.writeAudit(userId, 'EXPERIENCE_CANCEL', 'experience_booking', bookingId, {});
    return updated;
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  async adminListExperiences(status?: ExperienceStatus) {
    return this.prisma.experience.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        host: { select: { user: { select: { fullName: true, email: true } } } },
        _count: { select: { bookings: true } },
      },
    });
  }

  async moderateExperience(
    actorUserId: string,
    id: string,
    dto: ModerateExperienceDto,
  ) {
    const experience = await this.prisma.experience.findUnique({ where: { id } });
    if (!experience) throw new NotFoundException('Experience not found');
    const updated = await this.prisma.experience.update({
      where: { id },
      data: {
        status:
          dto.action === 'APPROVED'
            ? ExperienceStatus.APPROVED
            : ExperienceStatus.REJECTED,
        reviewedBy: actorUserId,
        reviewNotes: dto.notes ?? null,
        reviewedAt: new Date(),
      },
    });
    await this.writeAudit(
      actorUserId,
      `EXPERIENCE_${dto.action}`,
      'experience',
      id,
      { notes: dto.notes ?? null },
    );
    return updated;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async getOwnedHostExperience(userId: string, id: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');
    const experience = await this.prisma.experience.findUnique({ where: { id } });
    if (!experience || experience.hostId !== host.id) {
      throw new NotFoundException('Experience not found');
    }
    return experience;
  }

  private validateWindow(startsAt: string | Date, endsAt: string | Date) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (start.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('startsAt must be in the future');
    }
  }

  private async countSeatsSold(experienceId: string) {
    const agg = await this.prisma.experienceBooking.aggregate({
      where: {
        experienceId,
        status: { in: [
          ExperienceBookingStatus.HELD,
          ExperienceBookingStatus.CONFIRMED,
          ExperienceBookingStatus.COMPLETED,
        ] },
      },
      _sum: { seats: true },
    });
    return agg._sum.seats ?? 0;
  }

  private async writeAudit(
    actorUserId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        resourceType,
        resourceId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
