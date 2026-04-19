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
import { OutboxService } from '../notification/outbox.service';
import { ReferralService } from '../referral/referral.service';
import { AddOnService, AddOnSnapshotLine } from '../add-on/add-on.service';
import { MembershipService } from '../membership/membership.service';
import { PayLaterService } from '../pay-later/pay-later.service';
import { PayLaterMonths } from '../pay-later/dto/create-plan.dto';
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
    private readonly outboxService: OutboxService,
    private readonly referralService: ReferralService,
    private readonly addOnService: AddOnService,
    private readonly membershipService: MembershipService,
    private readonly payLaterService: PayLaterService,
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

      // Balance due date: 48h before check-in (DEPOSIT_50 only).
      // PAY_LATER bookings use PayLaterInstalment.dueAt for dunning instead.
      const balanceDueAt =
        dto.plan === PaymentPlanDto.DEPOSIT_50
          ? new Date(
              new Date(hold.startsAt).getTime() -
                BALANCE_DUE_HOURS_BEFORE_CHECKIN * 60 * 60 * 1000,
            )
          : null;

      // Validate Pay Later: schedule must finish before check-in (+24h buffer).
      if (dto.plan === PaymentPlanDto.PAY_LATER) {
        if (!dto.payLaterMonths) {
          throw new BadRequestException('payLaterMonths is required for PAY_LATER plan');
        }
        const schedule = PayLaterService.buildSchedule(
          snapshot.total,
          dto.payLaterMonths as PayLaterMonths,
        );
        PayLaterService.assertScheduleFitsCheckIn(
          schedule,
          new Date(hold.startsAt),
        );
      }

      const created = await tx.booking.create({
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
          payLaterMonths:
            dto.plan === PaymentPlanDto.PAY_LATER
              ? (dto.payLaterMonths as number)
              : null,
        },
      });

      // Materialize BookingAddOn rows from the frozen price snapshot.
      // The HMAC on the snapshot guarantees the add-on lines haven't been tampered with.
      const snapshotAddOns = (snapshot.addOns ?? []) as AddOnSnapshotLine[];
      if (snapshotAddOns.length > 0) {
        await this.addOnService.createBookingAddOns(
          tx,
          created.id,
          snapshotAddOns,
          snapshot.hmac ?? '',
        );
      }

      return created;
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
          select: {
            id: true, title: true, city: true, state: true, country: true,
            host: { select: { userId: true, user: { select: { fullName: true } } } },
          },
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

  /** Admin: get all bookings with guest + listing info, optional status/search filters */
  async getAllBookings(page = 1, limit = 50, status?: string, search?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { listing: { title: { contains: search, mode: 'insensitive' } } },
        { guest: { fullName: { contains: search, mode: 'insensitive' } } },
        { guest: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          listing: { select: { id: true, title: true, city: true, state: true } },
          guest: { select: { fullName: true, email: true } },
          payments: { select: { id: true, amount: true, status: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
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

    const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
    let nextStatus: string;

    if (booking.plan === 'FULL') {
      nextStatus = 'CONFIRMED_PAID';
    } else if (booking.plan === 'PAY_LATER') {
      // First instalment captured → plan activates, booking goes to
      // CONFIRMED_DEPOSIT. Subsequent instalment captures are routed
      // through PayLaterService.recordInstalmentCapture from the webhook.
      nextStatus = 'CONFIRMED_DEPOSIT';

      if (!booking.payLaterMonths) {
        throw new BadRequestException(
          'PAY_LATER booking missing payLaterMonths',
        );
      }

      await this.payLaterService.createPlanFromFirstCapture(
        client,
        {
          id: booking.id,
          startsAt: booking.startsAt,
          priceSnapshot: booking.priceSnapshot,
        },
        booking.payLaterMonths as PayLaterMonths,
        snapshot.total,
        paymentId,
        amountCaptured,
      );
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
        this.prisma.user.findUnique({
          where: { id: booking.guestId },
          select: { fullName: true, email: true, phone: true },
        }),
        this.prisma.listing.findUnique({
          where: { id: booking.listingId },
          select: { title: true, host: { select: { id: true, user: { select: { fullName: true, email: true } } } } },
        }),
      ]);
      if (!guest || !listing) return;
      const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
      const checkIn = new Date(booking.startsAt).toLocaleDateString('en-IN');
      const checkOut = new Date(booking.endsAt).toLocaleDateString('en-IN');

      // Guest notification — routed through the outbox so delivery is
      // decoupled from the booking write and retried on transient failure.
      const guestPayload = {
        guestName: guest.fullName,
        guestEmail: guest.email,
        guestPhone: guest.phone ?? undefined,
        bookingId,
        listingTitle: listing.title,
        checkIn,
        checkOut,
        totalAmount: snapshot.total,
        plan: booking.plan as 'FULL' | 'DEPOSIT_50',
        depositAmount: snapshot.depositAmount,
      };
      const emailSlot = this.notificationService.buildBookingConfirmedEmail(guestPayload);
      await this.outboxService.enqueue({
        userId: booking.guestId,
        kind: 'booking.confirmed',
        channels: ['EMAIL'],
        payload: emailSlot,
      });
      const smsSlot = this.notificationService.buildBookingConfirmedSms(guestPayload);
      if (smsSlot) {
        await this.outboxService.enqueue({
          userId: booking.guestId,
          kind: 'booking.confirmed',
          channels: ['SMS'],
          payload: smsSlot,
        });
      }

      // Host email
      if (listing.host?.user) {
        await this.notificationService.sendHostNewBooking({
          hostName: listing.host.user.fullName,
          hostEmail: listing.host.user.email,
          guestName: guest.fullName,
          bookingId,
          listingTitle: listing.title,
          checkIn,
          checkOut,
          totalAmount: snapshot.total,
          plan: booking.plan as 'FULL' | 'DEPOSIT_50',
        });
      }

      // DB notifications (non-blocking, fire-and-forget)
      const notifMeta = { bookingId, listingTitle: listing.title, checkIn, checkOut };

      await Promise.allSettled([
        // Guest DB notification
        this.prisma.guestNotification.create({
          data: {
            userId: booking.guestId,
            type: 'BOOKING_CONFIRMED',
            title: 'Booking confirmed',
            message: `Your booking for ${listing.title} (${checkIn} – ${checkOut}) is confirmed.`,
            metadata: notifMeta,
          },
        }),
        // Host DB notification
        listing.host ? this.prisma.hostNotification.create({
          data: {
            hostId: listing.host.id,
            type: 'NEW_BOOKING',
            title: 'New booking received',
            message: `${guest.fullName} booked ${listing.title} (${checkIn} – ${checkOut}).`,
            metadata: notifMeta,
          },
        }) : Promise.resolve(),
        // Admin DB notification
        this.prisma.adminNotification.create({
          data: {
            type: 'NEW_BOOKING',
            title: 'New booking',
            message: `${guest.fullName} booked ${listing.title} for ${checkIn} – ${checkOut}. Total: ₹${(snapshot.total / 100).toLocaleString('en-IN')}.`,
            metadata: notifMeta,
          },
        }),
      ]);
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
        const listingTitle = booking.listing?.title ?? 'your stay';
        const balanceAmount = snapshot.balanceAmount ?? Math.ceil(snapshot.total / 2);
        const dueDate = booking.balanceDueAt
          ? new Date(booking.balanceDueAt).toLocaleDateString('en-IN')
          : 'soon';

        await this.notificationService.sendBalanceDueReminder({
          guestName: guest.fullName,
          guestEmail: guest.email,
          bookingId: booking.id,
          listingTitle,
          balanceAmount,
          dueDate,
        });

        // Guest DB notification
        await this.prisma.guestNotification.create({
          data: {
            userId: booking.guestId,
            type: 'BALANCE_DUE',
            title: 'Balance payment due',
            message: `Your balance of ₹${(balanceAmount / 100).toLocaleString('en-IN')} for ${listingTitle} is due by ${dueDate}.`,
            metadata: { bookingId: booking.id, listingTitle, balanceAmount, dueDate },
          },
        }).catch(() => {});
      } catch {
        // Non-fatal
      }
    }
  }

  /**
   * Auto-cancel a booking whose Pay Later plan has defaulted. Triggered by the
   * dunning cron after `processOverdue` flips the plan to DEFAULTED. Runs the
   * normal refund engine so already-paid instalments get their policy-based
   * refund.
   */
  async cancelDefaultedPayLater(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    });
    if (!booking) return;
    const cancellableStatuses = [
      'PAYMENT_PENDING',
      'CONFIRMED_DEPOSIT',
      'CONFIRMED_PAID',
      'BALANCE_DUE',
    ];
    if (!cancellableStatuses.includes(booking.status)) return;
    await this.cancelBookingInternal(
      bookingId,
      null,
      'AUTO_CANCEL_PAY_LATER_DEFAULT',
      'Pay Later plan defaulted — grace period expired',
    );
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

    const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
    const addOnsTotal = snapshot.addOnsTotal ?? 0;
    const accommodationTotal = (snapshot.total ?? totalPaid) - addOnsTotal;
    const checkIn = new Date(booking.startsAt);

    // Accommodation refund applies booking-level policy to its portion of the snapshot
    const accommodationRefund = this.pricingService.computeRefundAmount(
      accommodationTotal,
      checkIn,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.prisma as any).$transaction(async (tx: TxClient) => {
      // Mark the Pay Later plan cancelled (if any) so future instalment
      // captures can't silently revive the booking. Already-paid instalments
      // stay recorded; their refunds flow through the normal refund engine.
      if (booking.plan === 'PAY_LATER') {
        await this.payLaterService.cancelPlan(tx, bookingId);
      }

      // Add-ons: apply per-tier rules inside the same transaction
      const addOnRefund = await this.addOnService.cancelBookingAddOns(
        tx,
        bookingId,
        checkIn,
      );

      // Cap total refund at what the guest actually paid
      const refundAmount = Math.min(
        accommodationRefund + addOnRefund,
        totalPaid,
      );

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
          metadata: { reason, action, accommodationRefund, addOnRefund },
          tx,
        });
      }

      await this.auditService.log(
        actorId,
        action,
        'booking',
        bookingId,
        { reason, refundAmount, accommodationRefund, addOnRefund, totalPaid },
        tx,
      );

      return { booking: updated, refundAmount };
    });

    // Send cancellation notifications (non-blocking)
    void (async () => {
      try {
        const [guest, listing] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: booking.guestId },
            select: { fullName: true, email: true },
          }),
          this.prisma.listing.findUnique({
            where: { id: booking.listingId },
            select: { title: true, host: { select: { id: true, user: { select: { fullName: true, email: true } } } } },
          }),
        ]);
        const listingTitle = listing?.title ?? 'your stay';

        // Guest email
        if (guest) {
          await this.notificationService.sendBookingCancelled({
            guestName: guest.fullName,
            guestEmail: guest.email,
            bookingId,
            listingTitle,
            refundAmount: result.refundAmount,
          });
        }

        // Host email
        if (guest && listing?.host?.user) {
          await this.notificationService.sendHostBookingCancelled({
            hostName: listing.host.user.fullName,
            hostEmail: listing.host.user.email,
            guestName: guest.fullName,
            bookingId,
            listingTitle,
            refundAmount: result.refundAmount,
          });
        }

        // DB notifications
        const notifMeta = { bookingId, listingTitle, refundAmount: result.refundAmount };
        await Promise.allSettled([
          this.prisma.guestNotification.create({
            data: {
              userId: booking.guestId,
              type: 'BOOKING_CANCELLED',
              title: 'Booking cancelled',
              message: `Your booking for ${listingTitle} has been cancelled.${result.refundAmount > 0 ? ` Refund: ₹${(result.refundAmount / 100).toLocaleString('en-IN')}` : ''}`,
              metadata: notifMeta,
            },
          }),
          listing?.host ? this.prisma.hostNotification.create({
            data: {
              hostId: listing.host.id,
              type: 'BOOKING_CANCELLED',
              title: 'Booking cancelled',
              message: `${guest?.fullName ?? 'A guest'}'s booking for ${listingTitle} has been cancelled.`,
              metadata: notifMeta,
            },
          }) : Promise.resolve(),
        ]);
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

    // Award loyalty points for completed accommodation spend (Phase 2 §5.13).
    // Points = floor(accommodationTotal_paise / 10000). Add-ons don't earn points.
    const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
    const accommodationPaise =
      (snapshot.subtotal ?? 0) + (snapshot.cleaningFee ?? 0);
    const points = this.membershipService.pointsForPaise(accommodationPaise);
    if (points > 0) {
      await this.membershipService
        .awardPoints(booking.guestId, points)
        .catch(() => {});
    }

    // Non-blocking: trigger referral credit check
    void this.referralService.onReferredUserFirstBooking(booking.guestId).catch(() => {});

    return updated;
  }
}
