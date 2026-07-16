import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
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
import { BookingStateMachine, BookingEvent, BookingLike } from './state-machine';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
import {
  AmountMismatchException,
  TamperedSnapshotException,
} from './confirm-payment.exceptions';
import { ConflictException } from '@nestjs/common';

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
    private readonly stateMachine: BookingStateMachine,
    private readonly snapshotSigner: PriceSnapshotSignerService,
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
          // Server-enforced record of terms acceptance — DTO validation guarantees this is set.
          acceptedTermsAt: new Date(dto.acceptedTermsAt),
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
    const where: Prisma.BookingWhereInput = {};
    if (status) where.status = status as BookingStatus;
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
   * Seven-step atomic confirm. MUST be called inside the caller's transaction
   * (the webhook handler's `withSerializableRetry` block). It does NOT open
   * its own transaction — that would nest inside the caller's and break
   * atomicity (the payment.status=CAPTURED write and this confirm must commit
   * or roll back together). The caller is responsible for SERIALIZABLE
   * isolation + retry.
   *
   * Steps, in order:
   *   1. SELECT … FOR UPDATE the booking row
   *   2. Idempotency short-circuit (at-least-once webhook replay)
   *   3. Re-verify the HMAC-signed price snapshot
   *   4. Verify captured amount matches the expected (plan-aware)
   *   5. Explicit overlap check under the lock (clean error before the trigger)
   *   6. Route the status change through the state machine
   *   7. Append immutable ledger entry (+ audit, + payout line)
   *
   * Returns `{ booking, didConfirm }`. `didConfirm=false` on an idempotent
   * replay so the caller can skip the post-commit notification.
   */
  async confirmPayment(
    tx: TxClient,
    bookingId: string,
    paymentId: string,
    amountCaptured: number,
  ): Promise<{ booking: BookingLike & { status: string }; didConfirm: boolean }> {
    // ── Step 1: Lock the booking row ────────────────────────────────────
    // FOR UPDATE serialises concurrent confirms on the same booking. Combined
    // with the caller's SERIALIZABLE isolation, it kills the phantom-read race
    // where two confirms each see "no conflict" via separate snapshots.
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    // ── Step 2: Idempotency (webhook is at-least-once) ──────────────────
    const alreadyConfirmed: string[] = [
      'CONFIRMED_DEPOSIT',
      'CONFIRMED_PAID',
      'BALANCE_DUE',
      'COMPLETED',
    ];
    if (alreadyConfirmed.includes(booking.status)) {
      return { booking: booking as BookingLike & { status: string }, didConfirm: false };
    }
    if (booking.status !== 'PAYMENT_PENDING') {
      throw new ConflictException(
        `Cannot confirm booking in status ${booking.status}`,
      );
    }

    // ── Step 3: Re-verify HMAC on priceSnapshot ─────────────────────────
    // NOT defending against client tampering — that's stopped at quote. This
    // defends against any path that wrote to priceSnapshot between quote and
    // confirm: bug in admin tooling, migration with bad data, compromised
    // internal account. Do NOT "optimize" this away as redundant.
    const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
    if (snapshot.hmac) {
      const { hmac, ...withoutHmac } = snapshot;
      if (
        !this.snapshotSigner.verify(
          withoutHmac as unknown as Record<string, unknown>,
          hmac,
        )
      ) {
        throw new TamperedSnapshotException(bookingId);
      }
    }

    // ── Step 4: Amount captured matches expected ────────────────────────
    const expected = this.computeExpectedFirstCapturePaise(booking, snapshot);
    if (expected !== null && amountCaptured !== expected) {
      throw new AmountMismatchException(
        amountCaptured,
        expected,
        bookingId,
        paymentId,
      );
    }

    // ── Step 5: Explicit overlap check under the lock ───────────────────
    // The trg_prevent_booking_overlap trigger is the backstop — failing here
    // gives a clean ConflictException instead of a 23P01 leak.
    // `startsAt`/`endsAt` columns are `timestamp` (no tz); Prisma binds JS Date
    // params as `timestamptz`, so the bound side must be converted back to the
    // UTC wall-clock the column stores (`AT TIME ZONE 'UTC'`) — otherwise
    // `tsrange(timestamptz, …)` has no matching function and the query throws.
    const conflicts = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE "listingId" = ${booking.listingId}
        AND id <> ${bookingId}
        AND status IN ('CONFIRMED_DEPOSIT','CONFIRMED_PAID','BALANCE_DUE','PAYMENT_PENDING')
        AND tsrange("startsAt","endsAt",'[)') && tsrange(
              (${booking.startsAt}::timestamptz AT TIME ZONE 'UTC'),
              (${booking.endsAt}::timestamptz AT TIME ZONE 'UTC'),
              '[)')
    `;
    if (conflicts.length > 0) {
      throw new ConflictException('Dates no longer available');
    }

    // PAY_LATER plan creation happens inside the same tx, before the state
    // transition, so the schedule is durable with the confirm.
    if (booking.plan === 'PAY_LATER') {
      if (!booking.payLaterMonths) {
        throw new BadRequestException('PAY_LATER booking missing payLaterMonths');
      }
      await this.payLaterService.createPlanFromFirstCapture(
        tx,
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
    }

    const event: BookingEvent =
      booking.plan === 'FULL'
        ? 'PAYMENT_CONFIRMED_FULL'
        : booking.plan === 'PAY_LATER'
          ? 'PAY_LATER_FIRST_CAPTURED'
          : 'PAYMENT_CONFIRMED_DEPOSIT';

    // ── Step 6: Route through the state machine ─────────────────────────
    const updated = await this.stateMachine.transition(
      tx,
      booking as BookingLike,
      event,
      {
        actorId: 'system:razorpay',
        metadata: { paymentId, amountCapturedPaise: amountCaptured },
      },
    );

    // Snapshot the live cancellation policy onto the booking at confirm time
    // (Step 7c). Frozen once; future policy edits don't affect this booking.
    if (!booking.cancellationPolicySnapshot) {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          cancellationPolicySnapshot: PricingService.buildPolicySnapshot() as never,
        },
      });
    }

    // ── Step 7: Append immutable ledger entry + audit ───────────────────
    await this.ledgerService.record({
      type: 'PAYMENT_CAPTURED',
      amount: amountCaptured,
      bookingId,
      metadata: { paymentId, nextStatus: updated.status },
      tx,
    });
    await this.auditService.log(
      null,
      'BOOKING_PAYMENT_CONFIRMED',
      'booking',
      bookingId,
      { paymentId, amountCaptured, nextStatus: updated.status },
      tx,
    );

    // ── Payout line (host's accommodation share, eligible 24h after check-in) ─
    const listing = await tx.listing.findUnique({
      where: { id: booking.listingId },
      select: { hostId: true },
    });
    if (listing) {
      const accommodationTotal =
        (snapshot.subtotal ?? 0) + (snapshot.cleaningFee ?? 0);
      const hostShare =
        snapshot.total > 0
          ? Math.round((accommodationTotal * amountCaptured) / snapshot.total)
          : 0;
      if (hostShare > 0) {
        const eligibleAt = new Date(
          new Date(booking.startsAt).getTime() + 24 * 60 * 60 * 1000,
        );
        await tx.payoutLine.create({
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
    }

    return { booking: updated, didConfirm: true };
  }

  /**
   * Settle the outstanding balance on a DEPOSIT_50 booking (the SECOND capture).
   *
   * Runs inside the caller's SERIALIZABLE tx (from handlePaymentCaptured), the
   * same way confirmPayment handles the first capture. The deposit's first
   * payment already moved the booking to CONFIRMED_DEPOSIT (and possibly on to
   * BALANCE_DUE via the balance-due cron); this books the balance capture:
   *   1. Lock the booking row (FOR UPDATE)
   *   2. Idempotency — already CONFIRMED_PAID/COMPLETED/REFUNDED → no-op
   *   3. Re-verify the priceSnapshot HMAC
   *   4. Captured amount must equal the snapshot's balanceAmount
   *   5. State machine BALANCE_PAID → CONFIRMED_PAID
   *   6. Immutable ledger PAYMENT_CAPTURED (+ audit)
   *   7. Second payout line — host's share of the balance capture
   *
   * Returns `{ booking, didSettle }`; didSettle=false on an idempotent replay.
   */
  async settleBalance(
    tx: TxClient,
    bookingId: string,
    paymentId: string,
    amountCaptured: number,
  ): Promise<{ booking: BookingLike & { status: string }; didSettle: boolean }> {
    // ── Step 1: Lock the booking row ────────────────────────────────────
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    // ── Step 2: Idempotency (webhook is at-least-once) ──────────────────
    const alreadySettled: string[] = ['CONFIRMED_PAID', 'COMPLETED', 'REFUNDED'];
    if (alreadySettled.includes(booking.status)) {
      return { booking: booking as BookingLike & { status: string }, didSettle: false };
    }
    if (!['CONFIRMED_DEPOSIT', 'BALANCE_DUE'].includes(booking.status)) {
      throw new ConflictException(
        `Cannot settle balance in status ${booking.status}`,
      );
    }

    // ── Step 3: Re-verify HMAC on priceSnapshot (see confirmPayment) ────
    const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
    if (snapshot.hmac) {
      const { hmac, ...withoutHmac } = snapshot;
      if (
        !this.snapshotSigner.verify(
          withoutHmac as unknown as Record<string, unknown>,
          hmac,
        )
      ) {
        throw new TamperedSnapshotException(bookingId);
      }
    }

    // ── Step 4: Amount captured equals the outstanding balance ──────────
    const expected = snapshot.balanceAmount;
    if (expected != null && amountCaptured !== expected) {
      throw new AmountMismatchException(
        amountCaptured,
        expected,
        bookingId,
        paymentId,
      );
    }

    // ── Step 5: Route the status change through the state machine ───────
    const updated = await this.stateMachine.transition(
      tx,
      booking as BookingLike,
      'BALANCE_PAID',
      {
        actorId: 'system:razorpay',
        metadata: { paymentId, amountCapturedPaise: amountCaptured, kind: 'balance' },
      },
    );

    // ── Step 6: Immutable ledger entry + audit ──────────────────────────
    await this.ledgerService.record({
      type: 'PAYMENT_CAPTURED',
      amount: amountCaptured,
      bookingId,
      metadata: { paymentId, nextStatus: updated.status, kind: 'balance' },
      tx,
    });
    await this.auditService.log(
      null,
      'BOOKING_BALANCE_SETTLED',
      'booking',
      bookingId,
      { paymentId, amountCaptured, nextStatus: updated.status },
      tx,
    );

    // ── Step 7: Second payout line (host's share of the balance capture) ─
    // Same proportional formula as confirmPayment, so deposit + balance shares
    // sum to the host's full accommodation share.
    const listing = await tx.listing.findUnique({
      where: { id: booking.listingId },
      select: { hostId: true },
    });
    if (listing) {
      const accommodationTotal =
        (snapshot.subtotal ?? 0) + (snapshot.cleaningFee ?? 0);
      const hostShare =
        snapshot.total > 0
          ? Math.round((accommodationTotal * amountCaptured) / snapshot.total)
          : 0;
      if (hostShare > 0) {
        const eligibleAt = new Date(
          new Date(booking.startsAt).getTime() + 24 * 60 * 60 * 1000,
        );
        await tx.payoutLine.create({
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
    }

    return { booking: updated, didSettle: true };
  }

  /**
   * Plan-aware expected paise for the FIRST capture on a booking.
   * Returns null when the plan / state combo doesn't have a known expected
   * value (defensive — the amount check is then skipped rather than rejecting
   * a legitimate capture).
   */
  private computeExpectedFirstCapturePaise(
    booking: { plan: string; payLaterMonths: number | null },
    snapshot: PriceSnapshot,
  ): number | null {
    if (booking.plan === 'FULL') return snapshot.total;
    if (booking.plan === 'DEPOSIT_50') return snapshot.depositAmount;
    if (booking.plan === 'PAY_LATER') {
      const months = booking.payLaterMonths;
      const first = snapshot.payLaterFirstInstalment?.find(
        (i) => i.months === months,
      );
      return first?.amountMinor ?? null;
    }
    return null;
  }

  /**
   * Public entry point for the post-commit confirmation notification.
   * The webhook handler calls this AFTER its SERIALIZABLE tx commits, so the
   * booking row is guaranteed durable. Re-fetches the booking (the caller only
   * has the id after commit) then delegates to the private sender.
   * Fire-and-forget — never throws into the caller.
   */
  async sendBookingConfirmedNotificationPublic(bookingId: string): Promise<void> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          plan: true,
          startsAt: true,
          endsAt: true,
          priceSnapshot: true,
          listingId: true,
          guestId: true,
        },
      });
      if (!booking) return;
      await this.sendBookingConfirmedNotification(bookingId, booking);
    } catch {
      // Non-fatal — notification failure must never break the confirm path.
    }
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
          select: { title: true, city: true, state: true, country: true, host: { select: { id: true, user: { select: { fullName: true, email: true } } } } },
        }),
      ]);
      if (!guest || !listing) return;
      const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;
      const checkIn = new Date(booking.startsAt).toLocaleDateString('en-IN');
      const checkOut = new Date(booking.endsAt).toLocaleDateString('en-IN');
      const locationDescription = [listing.city, listing.state, listing.country]
        .filter(Boolean)
        .join(', ');

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
        checkInISO: new Date(booking.startsAt).toISOString(),
        checkOutISO: new Date(booking.endsAt).toISOString(),
        locationDescription,
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
   * Routes per-row through the state machine so statusHistory is appended
   * for every booking individually — bulk updateMany would skip that.
   */
  async transitionToBalanceDue(): Promise<number> {
    const now = new Date();
    const due = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED_DEPOSIT',
        balanceDueAt: { lte: now },
      },
      select: { id: true },
      take: 200, // batch ceiling — cron runs every 15 min; backlog drains within an hour
    });

    let count = 0;
    for (const { id } of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Re-read inside the tx so the state machine sees the current row.
          const fresh = await tx.booking.findUnique({ where: { id } });
          if (!fresh || fresh.status !== 'CONFIRMED_DEPOSIT') return;
          await this.stateMachine.transition(
            tx,
            fresh as BookingLike,
            'BALANCE_DUE_TRIGGERED',
            { actorId: 'system:cron-balance-due' },
          );
          count++;
        });
      } catch (err) {
        // Non-fatal — log and continue (e.g. concurrent transition)
        console.warn(
          `Balance-due transition skipped for ${id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    const result = { count };

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
        'AUTO_CANCEL_UNPAID_BALANCE',
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

    // Distinguish guest vs admin so the state machine records the right event.
    const cancelEvent: BookingEvent =
      requesterRole === 'ADMIN' ? 'ADMIN_CANCELLED' : 'GUEST_CANCELLED';
    const result = await this.cancelBookingInternal(
      bookingId,
      requesterId,
      'BOOKING_CANCEL',
      dto.reason ?? 'Guest/Admin cancellation',
      cancelEvent,
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
      'AUTO_CANCEL_PAY_LATER_DEFAULT',
    );
  }

  private async cancelBookingInternal(
    bookingId: string,
    actorId: string | null,
    action: string,
    reason: string,
    smEvent: BookingEvent,
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

    // Step 7c: read the frozen cancellation tiers off the booking. Falls back
    // to the live policy for legacy rows that predate the snapshot column.
    const policySnapshot =
      (booking as unknown as { cancellationPolicySnapshot: unknown })
        .cancellationPolicySnapshot ?? null;
    const accommodationRefund = this.pricingService.computeRefundAmount(
      accommodationTotal,
      checkIn,
      new Date(),
      policySnapshot as { tiers?: { minHoursBefore: number; refundPct: number }[] } | null,
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

      // Re-read inside the tx — state machine needs the current statusHistory.
      const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!fresh) throw new NotFoundException('Booking not found');
      // SM picks CANCELLED vs REFUNDED based on refundAmountPaise (cancelTarget).
      const updated = await this.stateMachine.transition(
        tx,
        fresh as BookingLike,
        smEvent,
        {
          actorId,
          metadata: { reason, action, refundAmountPaise: refundAmount },
          refundAmountPaise: refundAmount,
        },
      );

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
   * Auto-complete bookings that finished their stay 24h+ ago.
   * Triggered by hourly cron. Picks up bookings that are still in
   * CONFIRMED_PAID/CONFIRMED_DEPOSIT after their endsAt + 24h grace window.
   * Awards loyalty points + triggers referral credit via completeBooking().
   *
   * Returns the count of bookings successfully completed.
   */
  async autoCompleteCheckedOut(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // endsAt + 24h grace
    const candidates = await this.prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED_PAID', 'CONFIRMED_DEPOSIT'] },
        endsAt: { lt: cutoff },
      },
      select: { id: true },
      take: 100,
    });

    if (candidates.length === 0) return 0;

    let completed = 0;
    for (const b of candidates) {
      try {
        // null actorId — system action. completeBooking accepts string but stores
        // the actor in the audit log; passing null would bypass that. Use a sentinel.
        await this.completeBooking(b.id, 'SYSTEM_AUTO_COMPLETE');
        completed++;
      } catch (err) {
        // Non-fatal — log and continue. Common reasons: status changed concurrently
        // (e.g., admin cancelled in the same window).
        console.warn(
          `Auto-complete skipped booking ${b.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (completed > 0) {
      await this.auditService.log(
        null,
        'BOOKING_AUTO_COMPLETE_BATCH',
        'booking',
        'batch',
        { count: completed, examined: candidates.length, cutoff: cutoff.toISOString() },
      );
    }

    return completed;
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

    // Cron path uses sentinel 'SYSTEM_AUTO_COMPLETE'; route the SM event accordingly.
    const smEvent: BookingEvent =
      actorId === 'SYSTEM_AUTO_COMPLETE' ? 'AUTO_COMPLETED' : 'STAY_COMPLETED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!fresh) throw new NotFoundException('Booking not found');
      return this.stateMachine.transition(tx, fresh as BookingLike, smEvent, {
        actorId,
        metadata: { previousStatus: fresh.status },
      });
    });

    // System (cron) completions carry the sentinel 'SYSTEM_AUTO_COMPLETE', which
    // is NOT a real User id. AuditLog.actorUserId is a nullable FK to User, so
    // passing the sentinel would violate that FK and throw AFTER the tx already
    // committed — silently under-counting the cron and logging a false warning.
    // Record null and keep the sentinel in metadata instead.
    const isSystemActor = actorId === 'SYSTEM_AUTO_COMPLETE';
    await this.auditService.log(
      isSystemActor ? null : actorId,
      'BOOKING_COMPLETE',
      'booking',
      bookingId,
      {
        previousStatus: booking.status,
        ...(isSystemActor ? { systemActor: actorId } : {}),
      },
    );

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
