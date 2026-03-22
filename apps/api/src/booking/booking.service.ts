import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { AuditService } from '../common/services/audit.service';
import { LedgerService } from '../common/services/ledger.service';
import { NotificationService } from '../notification/notification.service';
import { CreateBookingDto, PaymentPlanDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { PriceSnapshot } from '../pricing/dto/quote.dto';

// Balance due window: 48h before check-in
const BALANCE_DUE_HOURS_BEFORE_CHECKIN = 48;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Convert a valid hold into a booking (PAYMENT_PENDING state).
   * Atomic: hold validity + booking creation in one transaction.
   */
  async createBooking(guestId: string, dto: CreateBookingDto) {
    // Idempotency: return existing booking if same hold
    const existingByHold = await this.prisma.booking.findUnique({
      where: { holdId: dto.holdId },
    });
    if (existingByHold) {
      if (existingByHold.guestId !== guestId) {
        throw new ForbiddenException('Hold belongs to another user');
      }
      return existingByHold;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = await (this.prisma as any).$transaction(async (tx: TxClient) => {
      const hold = await tx.hold.findUnique({
        where: { id: dto.holdId },
      });

      if (!hold) {
        throw new NotFoundException('Hold not found');
      }
      if (hold.guestId !== guestId) {
        throw new ForbiddenException('Hold belongs to another user');
      }
      if (new Date(hold.expiresAt) < new Date()) {
        throw new BadRequestException('Hold has expired. Please create a new hold.');
      }

      const snapshot = hold.priceSnapshot as PriceSnapshot;

      // Balance due date: 48h before check-in
      const balanceDueAt =
        dto.plan === PaymentPlanDto.DEPOSIT_50
          ? new Date(
              new Date(hold.startsAt).getTime() -
                BALANCE_DUE_HOURS_BEFORE_CHECKIN * 60 * 60 * 1000,
            )
          : null;

      return tx.booking.create({
        data: {
          listingId: hold.listingId,
          guestId,
          holdId: hold.id,
          status: 'PAYMENT_PENDING',
          plan: dto.plan,
          startsAt: hold.startsAt,
          endsAt: hold.endsAt,
          priceSnapshot: snapshot as object,
          guestDetails: dto.guestDetails as object,
          balanceDueAt,
        },
      });
    });

    await this.auditService.log(
      guestId,
      'BOOKING_CREATE',
      'booking',
      booking.id,
      {
        holdId: dto.holdId,
        plan: dto.plan,
        status: 'PAYMENT_PENDING',
      },
    );

    return booking;
  }

  async getMyBookings(guestId: string) {
    return this.prisma.booking.findMany({
      where: { guestId },
      include: {
        payments: true,
        listing: {
          select: { id: true, title: true, city: true, state: true, country: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns all bookings for listings owned by the authenticated host,
   * ordered most-recent first. Includes listing summary and payments.
   */
  async getHostBookings(userId: string) {
    const host = await this.prisma.host.findUnique({ where: { userId } });
    if (!host) throw new ForbiddenException('Host profile not found');

    return this.prisma.booking.findMany({
      where: {
        listing: { hostId: host.id },
      },
      include: {
        payments: true,
        listing: {
          select: { id: true, title: true, city: true, state: true, country: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBookingById(bookingId: string, requesterId: string, requesterRole: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
        refunds: true,
        listing: {
          select: { id: true, title: true, city: true, state: true, country: true },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (requesterRole === 'ADMIN') return booking;
    if (booking.guestId === requesterId) return booking;

    // Allow the host who owns the listing to view the booking
    if (requesterRole === 'HOST') {
      const host = await this.prisma.host.findUnique({ where: { userId: requesterId } });
      if (host) {
        const listing = await this.prisma.listing.findFirst({
          where: { id: booking.listingId, hostId: host.id },
        });
        if (listing) return booking;
      }
    }

    throw new ForbiddenException('Access denied');
  }

  /** Admin: get all bookings with guest + listing info */
  async getAllBookings(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        skip,
        take: limit,
        include: {
          listing: { select: { id: true, title: true, city: true, state: true } },
          payments: { select: { id: true, amount: true, status: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count(),
    ]);
    return { bookings, total, page, limit };
  }

  /**
   * Called by payment webhook after deposit/full payment captured.
   * Transitions: PAYMENT_PENDING → CONFIRMED_DEPOSIT | CONFIRMED_PAID
   */
  async confirmPayment(
    bookingId: string,
    paymentId: string,
    amountCaptured: number,
    tx?: TxClient,
  ) {
    const client: TxClient = tx ?? this.prisma;
    const booking = await client.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const snapshot = booking.priceSnapshot as PriceSnapshot;
    let nextStatus: string;

    if (booking.plan === 'FULL') {
      nextStatus = 'CONFIRMED_PAID';
    } else {
      // DEPOSIT_50
      if (amountCaptured >= snapshot.total) {
        nextStatus = 'CONFIRMED_PAID';
      } else {
        nextStatus = 'CONFIRMED_DEPOSIT';
      }
    }

    const updated = await client.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
    });

    await this.ledgerService.record({
      type: 'PAYMENT_CAPTURED',
      amount: amountCaptured,
      bookingId,
      metadata: { paymentId, nextStatus },
      tx: client,
    });

    await this.auditService.log(
      null,
      'BOOKING_PAYMENT_CONFIRMED',
      'booking',
      bookingId,
      { paymentId, amountCaptured, nextStatus },
      client,
    );

    // Create payout line (eligible 24h after check-in)
    const eligibleAt = new Date(
      new Date(booking.startsAt).getTime() + 24 * 60 * 60 * 1000,
    );

    // Get host id from listing
    const listing = await client.listing.findUnique({
      where: { id: booking.listingId },
      select: { hostId: true },
    });

    if (listing) {
      const hostShare = Math.round(amountCaptured * 0.9); // 90% to host (10% platform fee)
      await client.payoutLine.create({
        data: {
          hostId: listing.hostId,
          listingId: booking.listingId,
          bookingId,
          amount: hostShare,
          eligibleAt,
          status: 'NOT_ELIGIBLE',
        },
      });
    }

    // Send booking confirmation notification (non-blocking)
    void this.sendBookingConfirmedNotification(bookingId, updated);

    return updated;
  }

  private async sendBookingConfirmedNotification(bookingId: string, booking: { plan: string; startsAt: Date; endsAt: Date; priceSnapshot: unknown; listingId: string; guestId: string }) {
    try {
      const [guest, listing] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: booking.guestId }, select: { fullName: true, email: true } }),
        this.prisma.listing.findUnique({ where: { id: booking.listingId }, select: { title: true } }),
      ]);
      if (!guest || !listing) return;
      const snapshot = booking.priceSnapshot as PriceSnapshot;
      await this.notificationService.sendBookingConfirmed({
        guestName: guest.fullName,
        guestEmail: guest.email,
        bookingId,
        listingTitle: listing.title,
        checkIn: new Date(booking.startsAt).toLocaleDateString('en-IN'),
        checkOut: new Date(booking.endsAt).toLocaleDateString('en-IN'),
        totalAmount: snapshot.total,
        plan: booking.plan as 'FULL' | 'DEPOSIT_50',
        depositAmount: snapshot.depositAmount,
      });
    } catch {
      // Non-fatal — notification failure must not break booking flow
    }
  }

  /**
   * Transition CONFIRMED_DEPOSIT → BALANCE_DUE when balance due date arrives.
   */
  async transitionToBalanceDue(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.booking.updateMany({
      where: {
        status: 'CONFIRMED_DEPOSIT',
        balanceDueAt: { lte: now },
      },
      data: { status: 'BALANCE_DUE' },
    });

    if (result.count > 0) {
      await this.auditService.log(
        null,
        'BOOKING_BALANCE_DUE_TRANSITION',
        'booking',
        'batch',
        { count: result.count, at: now.toISOString() },
      );
    }

    return result.count;
  }

  /**
   * Auto-cancel BALANCE_DUE bookings where balance was not paid within grace period.
   * Grace period: 24h after balanceDueAt.
   */
  async autoCancelUnpaidBalance(): Promise<number> {
    const graceCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const overdue = await this.prisma.booking.findMany({
      where: {
        status: 'BALANCE_DUE',
        balanceDueAt: { lt: graceCutoff },
      },
      include: { payments: true },
    });

    let cancelled = 0;
    for (const booking of overdue) {
      await this.cancelBookingInternal(
        booking.id,
        null,
        'AUTO_CANCEL_UNPAID_BALANCE',
        'Balance not paid within grace period',
      );
      cancelled++;
    }

    return cancelled;
  }

  /**
   * Guest or Admin cancels a booking.
   * Returns the updated booking (not the internal { booking, refundAmount } shape).
   */
  async cancelBooking(
    bookingId: string,
    requesterId: string,
    requesterRole: string,
    dto: CancelBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (requesterRole !== 'ADMIN' && booking.guestId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    const cancellableStatuses = [
      'PAYMENT_PENDING',
      'CONFIRMED_DEPOSIT',
      'CONFIRMED_PAID',
      'BALANCE_DUE',
    ];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot cancel booking in status: ${booking.status}`,
      );
    }

    const result = await this.cancelBookingInternal(
      bookingId,
      requesterId,
      'BOOKING_CANCEL',
      dto.reason ?? 'Guest/Admin cancellation',
    );
    // Return just the booking so the API response is a plain Booking object
    return result.booking;
  }

  /**
   * Send balance due reminders for all bookings that just transitioned to BALANCE_DUE.
   */
  async sendBalanceDueReminders(): Promise<void> {
    const bookings = await this.prisma.booking.findMany({
      where: { status: 'BALANCE_DUE' },
      include: { listing: { select: { title: true } } },
    });
    for (const booking of bookings) {
      try {
        const guest = await this.prisma.user.findUnique({
          where: { id: booking.guestId },
          select: { fullName: true, email: true },
        });
        if (!guest) continue;
        const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
        await this.notificationService.sendBalanceDueReminder({
          guestName: guest.fullName,
          guestEmail: guest.email,
          bookingId: booking.id,
          listingTitle: booking.listing?.title ?? 'your stay',
          balanceAmount: snapshot.balanceAmount ?? Math.ceil(snapshot.total / 2),
          dueDate: booking.balanceDueAt
            ? new Date(booking.balanceDueAt).toLocaleDateString('en-IN')
            : 'soon',
        });
      } catch {
        // Non-fatal
      }
    }
  }

  private async cancelBookingInternal(
    bookingId: string,
    actorId: string | null,
    action: string,
    reason: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    // Calculate total paid
    const totalPaid = booking.payments
      .filter((p: { status: string; amount: number }) => p.status === 'CAPTURED')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    const refundAmount = this.pricingService.computeRefundAmount(
      totalPaid,
      new Date(booking.startsAt),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.prisma as any).$transaction(async (tx: TxClient) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { status: refundAmount > 0 ? 'REFUNDED' : 'CANCELLED' },
      });

      if (refundAmount > 0) {
        await tx.refund.create({
          data: {
            bookingId,
            amount: refundAmount,
            reason,
          },
        });

        await this.ledgerService.record({
          type: 'REFUND_ISSUED',
          amount: refundAmount,
          bookingId,
          metadata: { reason, action },
          tx,
        });
      }

      await this.auditService.log(
        actorId,
        action,
        'booking',
        bookingId,
        { reason, refundAmount, totalPaid },
        tx,
      );

      return { booking: updated, refundAmount };
    });

    // Send cancellation notification (non-blocking)
    void (async () => {
      try {
        const guest = await this.prisma.user.findUnique({
          where: { id: booking.guestId },
          select: { fullName: true, email: true },
        });
        if (guest) {
          await this.notificationService.sendBookingCancelled({
            guestName: guest.fullName,
            guestEmail: guest.email,
            bookingId,
            listingTitle: (booking as { listing?: { title: string } }).listing?.title ?? 'your stay',
            refundAmount: result.refundAmount,
          });
        }
      } catch {
        // Non-fatal
      }
    })();

    return result;
  }

  /**
   * Mark booking as COMPLETED after checkout.
   */
  async completeBooking(bookingId: string, actorId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (!['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot complete booking in status: ${booking.status}`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED' },
    });

    await this.auditService.log(actorId, 'BOOKING_COMPLETE', 'booking', bookingId, {
      previousStatus: booking.status,
    });

    return updated;
  }
}
