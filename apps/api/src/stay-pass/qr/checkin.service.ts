import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import {
  BookingLike,
  BookingStateMachine,
} from '../../booking/state-machine';
import { QrTokenSignerService } from './qr-token.signer';
import { PassportService } from '../passport/passport.service';

/**
 * Signed-QR check-in (spec §5). Scanning grants nothing client-side — every
 * decision is server-side: signature → ticket/jti → revocation → time window →
 * booking state → scanner ownership. Every attempt (success or failure) is
 * logged append-only to CheckinScan.
 *
 * CHECKED_IN goes through the Booking state machine like every other
 * transition; this module never writes Booking state directly.
 */

export type ScanFailure =
  | 'INVALID_SIG'
  | 'MALFORMED'
  | 'UNKNOWN_TICKET'
  | 'REVOKED'
  | 'NOT_YET'
  | 'EXPIRED'
  | 'BAD_STATE'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_OWNER';

interface ScanContext {
  booking: {
    id: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    guestName: string;
    listingId: string;
    listingTitle: string;
    hostUserId: string;
  };
  ticketId: string;
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signer: QrTokenSignerService,
    private readonly stateMachine: BookingStateMachine,
    private readonly audit: AuditService,
    private readonly passport: PassportService,
  ) {}

  /** Verify a scanned token and return the booking summary for visual confirmation. */
  async scan(user: { sub: string; role: UserRole }, token: string) {
    const result = await this.verifyToken(user, token);
    if (!result.ok) {
      await this.logScan(result.bookingId ?? 'unknown', result.ticketId, user.sub, result.reason);
      throw new BadRequestException(`Scan rejected: ${result.reason}`);
    }
    await this.logScan(result.ctx.booking.id, result.ctx.ticketId, user.sub, 'OK');
    const b = result.ctx.booking;
    return {
      valid: true,
      booking: {
        id: b.id,
        status: b.status,
        guestName: b.guestName,
        listingTitle: b.listingTitle,
        checkIn: b.startsAt,
        checkOut: b.endsAt,
      },
    };
  }

  /** Execute the CHECKED_IN transition after host visual confirmation. */
  async confirm(user: { sub: string; role: UserRole }, token: string) {
    const result = await this.verifyToken(user, token);
    if (!result.ok) {
      await this.logScan(result.bookingId ?? 'unknown', result.ticketId, user.sub, result.reason);
      throw new BadRequestException(`Check-in rejected: ${result.reason}`);
    }
    const { booking, ticketId } = result.ctx;

    const updated = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!fresh) throw new NotFoundException('Booking not found');
      const transitioned = await this.stateMachine.transition(
        tx,
        fresh as unknown as BookingLike,
        'CHECKED_IN',
        {
          actorId: user.sub,
          metadata: { evidence: 'scan', ticketId },
        },
      );

      // Re-anchor the payout clock to the VERIFIED arrival (spec §5.2): payout
      // becomes eligible 24h after actual check-in instead of assumed check-in.
      // Only not-yet-eligible lines move; paid/eligible lines are never touched.
      const eligibleAt = new Date(Date.now() + 24 * 3600 * 1000);
      await tx.payoutLine.updateMany({
        where: { bookingId: booking.id, status: 'NOT_ELIGIBLE' },
        data: { eligibleAt },
      });

      return transitioned;
    });

    await this.logScan(booking.id, ticketId, user.sub, 'OK');
    await this.audit.log(user.sub, 'BOOKING_CHECKED_IN', 'booking', booking.id, {
      evidence: 'scan',
      ticketId,
    });

    // Stamp the passport with the ENTRY mark (non-fatal — the sweep backstop
    // seals it at completion regardless).
    await this.passport
      .mintOnCheckin(booking.id)
      .catch((err) =>
        this.logger.warn(
          `passport entry stamp failed for ${booking.id}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return { checkedIn: true, bookingId: booking.id, status: updated.status };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async verifyToken(
    user: { sub: string; role: UserRole },
    token: string,
  ): Promise<
    | { ok: true; ctx: ScanContext }
    | { ok: false; reason: ScanFailure; bookingId?: string; ticketId?: string }
  > {
    const sig = this.signer.verify(token ?? '');
    if (!sig.ok) return { ok: false, reason: sig.reason };

    const { payload } = sig;

    const ticket = await this.prisma.ticket.findUnique({
      where: { qrJti: payload.jti },
      include: {
        booking: {
          include: {
            listing: { select: { id: true, title: true, host: { select: { userId: true } } } },
            guest: { select: { fullName: true } },
          },
        },
      },
    });
    if (!ticket || ticket.bookingId !== payload.bid) {
      // Cross-booking substitution also lands here (jti belongs to another booking).
      return { ok: false, reason: 'UNKNOWN_TICKET', bookingId: payload.bid };
    }
    if (ticket.qrRevoked) {
      return { ok: false, reason: 'REVOKED', bookingId: payload.bid, ticketId: ticket.id };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < payload.nbf) {
      return { ok: false, reason: 'NOT_YET', bookingId: payload.bid, ticketId: ticket.id };
    }
    if (now > payload.exp) {
      return { ok: false, reason: 'EXPIRED', bookingId: payload.bid, ticketId: ticket.id };
    }

    const booking = ticket.booking;
    if (booking.status === 'CHECKED_IN') {
      return { ok: false, reason: 'ALREADY_CHECKED_IN', bookingId: booking.id, ticketId: ticket.id };
    }
    if (!['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
      return { ok: false, reason: 'BAD_STATE', bookingId: booking.id, ticketId: ticket.id };
    }

    // Ownership: a host may only scan bookings on their own listings; admins may scan any.
    const hostUserId = booking.listing.host?.userId;
    if (user.role !== UserRole.ADMIN && hostUserId !== user.sub) {
      return { ok: false, reason: 'NOT_OWNER', bookingId: booking.id, ticketId: ticket.id };
    }

    return {
      ok: true,
      ctx: {
        ticketId: ticket.id,
        booking: {
          id: booking.id,
          status: booking.status,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          guestName: booking.guest.fullName ?? 'Guest',
          listingId: booking.listing.id,
          listingTitle: booking.listing.title,
          hostUserId: hostUserId ?? '',
        },
      },
    };
  }

  private async logScan(
    bookingId: string,
    ticketId: string | undefined,
    scannedBy: string,
    result: string,
  ): Promise<void> {
    await this.prisma.checkinScan
      .create({ data: { bookingId, ticketId, scannedBy, result } })
      .catch((err) =>
        this.logger.warn(
          `checkin scan log failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }
}
