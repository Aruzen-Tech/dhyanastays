import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { AuditService } from '../common/services/audit.service';
import { PriceSnapshotSignerService } from '../common/services/price-snapshot-signer.service';
import { RazorpayService } from './razorpay.service';
import { InitPaymentDto, PaymentTypeDto } from './dto/init-payment.dto';
import { PriceSnapshot } from '../pricing/dto/quote.dto';
import { PayLaterService } from '../pay-later/pay-later.service';
import { BookingStateMachine } from '../booking/state-machine';
import { withSerializableRetry } from '../common/services/serializable-retry';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
    private readonly auditService: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly snapshotSigner: PriceSnapshotSignerService,
    @Inject(forwardRef(() => PayLaterService))
    private readonly payLaterService: PayLaterService,
    private readonly stateMachine: BookingStateMachine,
  ) {}

  /**
   * Initialise a payment order with Razorpay.
   * Returns the Razorpay order details for the client to complete payment.
   */
  async initPayment(guestId: string, dto: InitPaymentDto) {
    // Idempotency: return existing payment record if same key
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.bookingId !== dto.bookingId) {
        throw new BadRequestException(
          'Idempotency key already used for a different booking',
        );
      }
      return existing;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== guestId) throw new ForbiddenException('Access denied');

    const snapshot = booking.priceSnapshot as unknown as PriceSnapshot;

    // Verify price snapshot integrity — reject if tampered
    if (snapshot.hmac) {
      const { hmac, ...snapshotWithoutHmac } = snapshot;
      if (!this.snapshotSigner.verify(snapshotWithoutHmac as unknown as Record<string, unknown>, hmac)) {
        throw new BadRequestException('Price snapshot tampered — payment rejected');
      }
    }

    // Reject expired snapshots on initial captures (FULL/DEPOSIT) — guest must re-quote.
    // BALANCE payments skip this: the price was locked at booking time and balance
    // is paid days later by design. (Older bookings without expiresAt: treat as valid.)
    if (
      dto.type !== PaymentTypeDto.BALANCE &&
      snapshot.expiresAt &&
      new Date(snapshot.expiresAt).getTime() < Date.now()
    ) {
      throw new GoneException(
        'Price quote has expired. Please get a fresh quote and try again.',
      );
    }

    // Determine amount based on payment type. All snapshot fields are in paise.
    let amountPaise: number;
    if (booking.plan === 'PAY_LATER') {
      // First (booking-time) Pay Later instalment. The plan is created when this
      // capture confirms (confirmPayment → createPlanFromFirstCapture); later
      // instalments go through initPayLaterInstalmentPayment. Without this branch
      // a PAY_LATER booking could never be paid at all.
      if (dto.type === PaymentTypeDto.BALANCE) {
        throw new BadRequestException(
          'Pay Later is settled as scheduled instalments, not a lump balance',
        );
      }
      const first = snapshot.payLaterFirstInstalment?.find(
        (i) => i.months === booking.payLaterMonths,
      );
      if (!first) {
        throw new BadRequestException(
          'Pay Later first instalment is unavailable for this booking',
        );
      }
      amountPaise = first.amountMinor;
    } else if (dto.type === PaymentTypeDto.FULL) {
      if (booking.plan !== 'FULL') {
        throw new BadRequestException('Booking plan is DEPOSIT_50, not FULL');
      }
      amountPaise = snapshot.total;
    } else if (dto.type === PaymentTypeDto.DEPOSIT) {
      if (booking.plan !== 'DEPOSIT_50') {
        throw new BadRequestException('Booking plan is FULL, not DEPOSIT_50');
      }
      amountPaise = snapshot.depositAmount;
    } else {
      // BALANCE payment
      if (!['BALANCE_DUE', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
        throw new BadRequestException(
          `Cannot pay balance in booking status: ${booking.status}`,
        );
      }
      amountPaise = snapshot.balanceAmount;
    }

    // Razorpay's createOrder expects paise — pass through unchanged.
    const order = await this.razorpay.createOrder(
      amountPaise,
      `${dto.bookingId}_${dto.type}`,
    );

    // Persist payment record in INITIATED state. Payment.amount column is paise.
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        amount: amountPaise,
        type:
          booking.plan === 'PAY_LATER'
            ? 'PAY_LATER'
            : dto.type === PaymentTypeDto.FULL
              ? 'FULL'
              : dto.type === PaymentTypeDto.DEPOSIT
                ? 'DEPOSIT_50'
                : 'FULL',
        // seq 1 = the booking-time instalment; instalments 2+ are minted by
        // initPayLaterInstalmentPayment. Non-pay-later payments leave this null.
        payLaterSeq: booking.plan === 'PAY_LATER' ? 1 : null,
        status: 'INITIATED',
        gateway: 'razorpay',
        gatewayOrderRef: order.id,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    await this.auditService.log(guestId, 'PAYMENT_INIT', 'payment', payment.id, {
      bookingId: dto.bookingId,
      type: dto.type,
      amountPaise,
      orderId: order.id,
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: this.razorpay['keyId'] as string,
    };
  }

  /**
   * Handle Razorpay webhook.
   *
   * Order is invariant:
   *   1. Verify signature (reject unauthenticated traffic immediately).
   *   2. Dedup by x-razorpay-event-id (Step 7b — at-least-once delivery).
   *   3. Dispatch to the per-event-type handler.
   *
   * The dedup INSERT must run AFTER signature verify — otherwise an attacker
   * could poison the dedup table with arbitrary IDs and prevent legitimate
   * events from being processed.
   */
  async handleWebhook(rawBody: string, signature: string, eventId?: string) {
    // 1. Verify signature — reject immediately if invalid
    const valid = this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = JSON.parse(rawBody) as Record<string, any>;
    const eventType: string = event['event'] as string;

    // 2. Dedup by event ID. If the header was omitted (shouldn't happen on
    // real Razorpay traffic), we fall back to processing — the per-payment
    // already-CAPTURED short-circuit downstream still protects us.
    if (eventId) {
      try {
        await this.prisma.processedRazorpayEvent.create({
          data: { eventId, eventType },
        });
      } catch (err: unknown) {
        // P2002 = unique-constraint violation → this event was already processed.
        // Exit clean. Idempotent.
        const code = (err as { code?: string })?.code;
        if (code === 'P2002') {
          this.logger.log(`Razorpay webhook dedup hit: ${eventId} (${eventType})`);
          return { received: true, deduped: true };
        }
        throw err;
      }
    }

    this.logger.log(`Razorpay webhook received: ${eventType} (id=${eventId ?? 'unknown'})`);

    if (eventType === 'payment.captured') {
      await this.handlePaymentCaptured(event);
    } else if (eventType === 'payment.failed') {
      await this.handlePaymentFailed(event);
    } else if (eventType === 'refund.processed') {
      await this.handleRefundProcessed(event);
    } else {
      this.logger.log(`Unhandled webhook event: ${eventType}`);
    }

    return { received: true };
  }

  private async handlePaymentCaptured(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: Record<string, any>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentEntity = event['payload']?.['payment']?.['entity'] as Record<string, any>;
    const gatewayPaymentId: string = paymentEntity?.['id'] as string;
    const gatewayOrderId: string = paymentEntity?.['order_id'] as string;
    const amountPaise: number = paymentEntity?.['amount'] as number;

    if (!gatewayPaymentId || !gatewayOrderId) {
      this.logger.error('Malformed payment.captured event', event);
      return;
    }

    // Razorpay returns amount in paise (smallest currency unit) — keep as paise throughout.
    // Find payment by gateway order ref (read outside tx is fine — re-read inside).
    const paymentRow = await this.prisma.payment.findFirst({
      where: { gatewayOrderRef: gatewayOrderId },
      select: { id: true },
    });

    if (!paymentRow) {
      this.logger.warn(`No payment found for order ${gatewayOrderId}`);
      return;
    }
    const paymentId = paymentRow.id;

    // The entire capture flow runs in ONE SERIALIZABLE transaction with single
    // retry on 40001. payment.status=CAPTURED + the seven-step confirm + ledger
    // + audit all commit or roll back together — no split-brain, no nested tx.
    // confirmPayment runs INLINE in this tx (it no longer opens its own).
    let didConfirm = false;
    let confirmedBookingId: string | null = null;
    await withSerializableRetry(
      this.prisma,
      async (tx) => {
        // Re-read the payment INSIDE the tx (state may have changed; retry-safe).
        const payment = await tx.payment.findUnique({ where: { id: paymentId } });
        if (!payment) return;

        // Idempotency: at-least-once webhook. Already-captured → no-op.
        if (payment.status === 'CAPTURED') {
          this.logger.log(`Payment ${payment.id} already captured - skipping`);
          return;
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'CAPTURED', gatewayPaymentRef: gatewayPaymentId },
        });

        if (
          payment.type === 'PAY_LATER' &&
          payment.payLaterSeq &&
          payment.payLaterSeq > 1
        ) {
          // Pay-Later seq 2+ — booking already CONFIRMED_DEPOSIT from seq 1.
          const result = await this.payLaterService.recordInstalmentCapture(
            tx,
            payment.bookingId,
            payment.payLaterSeq,
            payment.id,
            amountPaise,
          );
          const fresh = await tx.booking.findUnique({
            where: { id: payment.bookingId },
          });
          if (fresh) {
            await this.stateMachine.transition(
              tx,
              fresh as never,
              result.completed
                ? 'PAY_LATER_FINAL_CAPTURED'
                : 'PAY_LATER_INSTALMENT_CAPTURED',
              {
                actorId: 'system:razorpay',
                metadata: { paymentId: payment.id, seq: payment.payLaterSeq, amountPaise },
              },
            );
          }
        } else {
          // Not a pay-later instalment. Route by the booking's status: an
          // INITIAL capture lands on a PAYMENT_PENDING booking (→ confirmPayment),
          // whereas a BALANCE capture lands on a CONFIRMED_DEPOSIT/BALANCE_DUE
          // booking (→ settleBalance). This is unambiguous because we only reach
          // here for a not-yet-CAPTURED payment, and initPayment only issues a
          // BALANCE order while the booking is CONFIRMED_DEPOSIT or BALANCE_DUE.
          const bk = await tx.booking.findUnique({
            where: { id: payment.bookingId },
            select: { status: true },
          });
          if (bk && (bk.status === 'CONFIRMED_DEPOSIT' || bk.status === 'BALANCE_DUE')) {
            const res = await this.bookingService.settleBalance(
              tx,
              payment.bookingId,
              payment.id,
              amountPaise,
            );
            // Balance settlement doesn't re-send the "booking confirmed" email;
            // the guest was already notified at deposit-confirm time.
            didConfirm = false;
            confirmedBookingId = res.didSettle ? null : confirmedBookingId;
          } else {
            // First/full capture — run the seven-step confirm in THIS tx.
            const res = await this.bookingService.confirmPayment(
              tx,
              payment.bookingId,
              payment.id,
              amountPaise,
            );
            didConfirm = res.didConfirm;
            confirmedBookingId = payment.bookingId;
          }
        }

        await this.auditService.log(
          null,
          'PAYMENT_CAPTURED',
          'payment',
          payment.id,
          {
            gatewayPaymentId,
            gatewayOrderId,
            amountPaise,
            payLaterSeq: payment.payLaterSeq ?? undefined,
          },
          tx,
        );
      },
      { path: 'handlePaymentCaptured' },
    );

    // Fire the confirmation notification AFTER commit — fire-and-forget so a
    // slow SMTP/SMS provider can't block the webhook or trigger a retry.
    if (didConfirm && confirmedBookingId) {
      void this.bookingService.sendBookingConfirmedNotificationPublic(confirmedBookingId);
    }
  }

  private async handlePaymentFailed(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: Record<string, any>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentEntity = event['payload']?.['payment']?.['entity'] as Record<string, any>;
    const gatewayOrderId: string = paymentEntity?.['order_id'] as string;

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderRef: gatewayOrderId },
    });

    if (!payment) return;
    if (payment.status === 'FAILED') return; // idempotent

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });

    await this.auditService.log(null, 'PAYMENT_FAILED', 'payment', payment.id, {
      gatewayOrderId,
    });
  }

  private async handleRefundProcessed(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: Record<string, any>,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refundEntity = event['payload']?.['refund']?.['entity'] as Record<string, any>;
    const gatewayRefundId: string = refundEntity?.['id'] as string;
    const gatewayPaymentId: string = refundEntity?.['payment_id'] as string;
    const amountPaise: number = refundEntity?.['amount'] as number;

    if (!gatewayRefundId || !gatewayPaymentId) return;

    // Find refund by booking via payment
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayPaymentRef: gatewayPaymentId },
    });

    if (!payment) return;

    // Update refund record with gateway ref
    await this.prisma.refund.updateMany({
      where: {
        bookingId: payment.bookingId,
        gatewayRefundRef: null,
      },
      data: { gatewayRefundRef: gatewayRefundId },
    });

    await this.auditService.log(
      null,
      'REFUND_PROCESSED',
      'payment',
      payment.id,
      {
        gatewayRefundId,
        gatewayPaymentId,
        amountInr: Math.round(amountPaise / 100),
      },
    );
  }

  /**
   * Guest pays the balance on a BALANCE_DUE booking.
   */
  async payBalance(guestId: string, bookingId: string, idempotencyKey: string) {
    return this.initPayment(guestId, {
      bookingId,
      type: PaymentTypeDto.BALANCE,
      idempotencyKey,
    });
  }

  /**
   * Reconcile INITIATED payments older than the threshold by querying Razorpay
   * directly. Recovers from missed webhooks (network drops, gateway delays).
   * Idempotent — safe to run repeatedly.
   *
   * Returns counts of {captured, failed, stillPending, errors} for observability.
   */
  async reconcileStalePayments(olderThanMinutes = 30): Promise<{
    examined: number;
    captured: number;
    failed: number;
    stillPending: number;
    errors: number;
  }> {
    if (this.razorpay.isStubMode()) {
      return { examined: 0, captured: 0, failed: 0, stillPending: 0, errors: 0 };
    }

    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const stalePayments = await this.prisma.payment.findMany({
      where: {
        status: 'INITIATED',
        createdAt: { lt: cutoff },
        gatewayOrderRef: { not: null },
      },
      take: 100, // batch size — process up to 100 per run
      orderBy: { createdAt: 'asc' },
    });

    if (stalePayments.length === 0) {
      return { examined: 0, captured: 0, failed: 0, stillPending: 0, errors: 0 };
    }

    let captured = 0;
    let failed = 0;
    let stillPending = 0;
    let errors = 0;

    for (const payment of stalePayments) {
      if (!payment.gatewayOrderRef) continue;
      try {
        const gatewayPayments = await this.razorpay.getPaymentsForOrder(
          payment.gatewayOrderRef,
        );
        // Find the captured one if any (Razorpay can show multiple attempts per order).
        const capturedAttempt = gatewayPayments.find((p) => p.status === 'captured');
        const failedAttempt = gatewayPayments.find((p) => p.status === 'failed');

        if (capturedAttempt) {
          // Replay the same webhook handler to keep state-transition logic in one place.
           
          await this.handlePaymentCaptured({
            payload: {
              payment: {
                entity: {
                  id: capturedAttempt.id,
                  order_id: capturedAttempt.order_id,
                  amount: capturedAttempt.amount,
                },
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as Record<string, any>);
          captured++;
        } else if (failedAttempt && gatewayPayments.every((p) => p.status === 'failed')) {
          // Only mark FAILED if every attempt failed (no pending captures lingering).
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          await this.auditService.log(
            null,
            'PAYMENT_RECON_MARK_FAILED',
            'payment',
            payment.id,
            { gatewayOrderRef: payment.gatewayOrderRef },
          );
          failed++;
        } else {
          stillPending++;
        }
      } catch (err) {
        errors++;
        this.logger.error(
          `Recon failed for payment ${payment.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `Payment recon: examined=${stalePayments.length} captured=${captured} failed=${failed} stillPending=${stillPending} errors=${errors}`,
    );

    return {
      examined: stalePayments.length,
      captured,
      failed,
      stillPending,
      errors,
    };
  }

  /**
   * Guest pays a specific Pay Later instalment (seq 2+). Seq 1 is paid via
   * the standard `initPayment` flow since it's indistinguishable from a
   * deposit at that point.
   */
  async initPayLaterInstalmentPayment(
    guestId: string,
    bookingId: string,
    seq: number,
    idempotencyKey: string,
  ) {
    // Idempotency: return existing payment if key was already used
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      if (existing.bookingId !== bookingId || existing.payLaterSeq !== seq) {
        throw new BadRequestException(
          'Idempotency key already used for a different instalment',
        );
      }
      return existing;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payLaterPlan: { include: { instalments: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== guestId) throw new ForbiddenException('Access denied');
    if (booking.plan !== 'PAY_LATER' || !booking.payLaterPlan) {
      throw new BadRequestException('Booking is not on a Pay Later plan');
    }
    if (
      booking.payLaterPlan.status === 'DEFAULTED' ||
      booking.payLaterPlan.status === 'CANCELLED' ||
      booking.payLaterPlan.status === 'COMPLETED'
    ) {
      throw new BadRequestException(
        `Plan is ${booking.payLaterPlan.status}; no further instalments accepted`,
      );
    }

    const instalment = booking.payLaterPlan.instalments.find(
      (i) => i.seq === seq,
    );
    if (!instalment) {
      throw new NotFoundException(`Instalment seq ${seq} not found`);
    }
    if (instalment.paidAt) {
      throw new BadRequestException(`Instalment ${seq} is already paid`);
    }
    // Enforce in-order payment so earlier arrears are cleared first.
    const earliestUnpaid = booking.payLaterPlan.instalments
      .filter((i) => !i.paidAt)
      .sort((a, b) => a.seq - b.seq)[0];
    if (earliestUnpaid && earliestUnpaid.seq < seq) {
      throw new BadRequestException(
        `Pay instalment ${earliestUnpaid.seq} first`,
      );
    }

    // All amounts in paise — instalment.amountMinor and Payment.amount stay consistent.
    const amountPaise = instalment.amountMinor;
    const order = await this.razorpay.createOrder(
      amountPaise,
      `${bookingId}_PL_${seq}`,
    );

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: amountPaise,
        type: 'PAY_LATER',
        status: 'INITIATED',
        gateway: 'razorpay',
        gatewayOrderRef: order.id,
        idempotencyKey,
        payLaterSeq: seq,
      },
    });

    await this.auditService.log(
      guestId,
      'PAY_LATER_INSTALMENT_INIT',
      'payment',
      payment.id,
      { bookingId, seq, amountPaise, orderId: order.id },
    );

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: this.razorpay['keyId'] as string,
      seq,
    };
  }
}
