import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { AuditService } from '../common/services/audit.service';
import { withSerializableRetry } from '../common/services/serializable-retry';
import { CreateHoldDto } from './dto/create-hold.dto';

const HOLD_TTL_MINUTES = 15;

@Injectable()
export class HoldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly auditService: AuditService,
  ) {}

  async createHold(guestId: string, dto: CreateHoldDto) {
    // Idempotency: return existing hold if same key
    const existing = await this.prisma.hold.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.guestId !== guestId) {
        throw new ConflictException('Idempotency key belongs to another user');
      }
      return existing;
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkIn >= checkOut) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    // Get price snapshot (includes add-ons + loyalty discount for the guest)
    const snapshot = await this.pricingService.quote({
      listingId: dto.listingId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      guests: dto.guests,
      addOns: dto.addOns,
      userId: guestId,
    });

    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

    // Atomic hold creation with overlap check, under SERIALIZABLE isolation.
    // Retries once on serialization failure (40001). All state inside the
    // callback must be re-read from `tx` — never close over outer-scope rows.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hold = await withSerializableRetry(this.prisma as any, async (tx) => {
      // Lock the listing row to serialize concurrent hold attempts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).$executeRaw`
        SELECT id FROM "Listing" WHERE id = ${dto.listingId} FOR UPDATE
      `;

      // Check for confirmed bookings that overlap the requested dates
      const overlapping = await tx.booking.findFirst({
        where: {
          listingId: dto.listingId,
          status: {
            in: [
              'CONFIRMED_DEPOSIT',
              'CONFIRMED_PAID',
              'BALANCE_DUE',
              'PAYMENT_PENDING',
            ],
          },
          AND: [
            { startsAt: { lt: checkOut } },
            { endsAt: { gt: checkIn } },
          ],
        },
      });

      if (overlapping) {
        throw new ConflictException(
          'Listing is not available for the selected dates',
        );
      }

      // Check for active holds (not expired) that overlap
      const overlappingHold = await tx.hold.findFirst({
        where: {
          listingId: dto.listingId,
          expiresAt: { gt: new Date() },
          booking: null, // no booking yet (still a raw hold)
          AND: [
            { startsAt: { lt: checkOut } },
            { endsAt: { gt: checkIn } },
          ],
        },
      });

      if (overlappingHold) {
        throw new ConflictException(
          'Listing is temporarily held for the selected dates. Try again in a few minutes.',
        );
      }

      // Check availability blocks
      const blocked = await tx.availabilityBlock.findFirst({
        where: {
          listingId: dto.listingId,
          AND: [
            { startsAt: { lt: checkOut } },
            { endsAt: { gt: checkIn } },
          ],
        },
      });

      if (blocked) {
        throw new ConflictException(
          'Listing is blocked for the selected dates',
        );
      }

      return tx.hold.create({
        data: {
          listingId: dto.listingId,
          guestId,
          startsAt: checkIn,
          endsAt: checkOut,
          expiresAt,
          priceSnapshot: snapshot as object,
          idempotencyKey: dto.idempotencyKey,
        },
      });
    });

    await this.auditService.log(guestId, 'HOLD_CREATE', 'hold', hold.id, {
      listingId: dto.listingId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      expiresAt: expiresAt.toISOString(),
      total: snapshot.total,
    });

    return hold;
  }

  async expireStaleHolds(): Promise<number> {
    // Find holds that have expired and have no associated booking.
    // Process in small batches to keep the cron quick if backlog has grown.
    const BATCH = 200;
    const stale = await this.prisma.hold.findMany({
      where: {
        expiresAt: { lt: new Date() },
        booking: null,
      },
      select: { id: true, listingId: true },
      take: BATCH,
    });

    if (stale.length === 0) return 0;

    // Audit BEFORE delete so the reference is preserved for compliance.
    for (const h of stale) {
      await this.auditService.log(null, 'HOLD_EXPIRED', 'hold', h.id, {
        listingId: h.listingId,
      });
    }

    // Free the rows so the holds table doesn't grow unboundedly.
    // booking: null ensures we never delete a hold attached to a booking.
    await this.prisma.hold.deleteMany({
      where: { id: { in: stale.map((h) => h.id) } },
    });

    return stale.length;
  }
}
