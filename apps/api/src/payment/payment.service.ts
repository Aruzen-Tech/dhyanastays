import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
    private readonly auditService: AuditService,
    private readonly razorpay: RazorpayService,
    private readonly snapshotSigner: PriceSnapshotSignerService,
    @Inject(forwardRef(() => PayLaterService))
    private readonly payLaterService: PayLaterService,
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

    // Determine amount based on payment type
    let amountInr: number;
    if (dto.type === PaymentTypeDto.FULL) {
      if (booking.plan !== 'FULL') {
        throw new BadRequestException('Booking plan is DEPOSIT_50, not FULL');
      }
      amountInr = snapshot.total;
    } else if (dto.type === PaymentTypeDto.DEPOSIT) {
      if (booking.plan !== 'DEPOSIT_50') {
        throw new BadRequestException('Booking plan is FULL, not DEPOSIT_50');
      }
      amountInr = snapshot.depositAmount;
    } else {
      // BALANCE payment
      if (!['BALANCE_DUE', 'CONFIRMED_DEPOSIT'].includes(booking.status)) {
        throw new BadRequestException(
          `Cannot pay balance in booking status: ${booking.status}`,
        );
      }
      amountInr = snapshot.balanceAmount;
    }

    // Create Razorpay order (amount in paise = INR × 100)
    const order = await this.razorpay.createOrder(
      amountInr * 100,
      `${dto.bookingId}_${dto.type}`,
    );

    // Persist payment record in INITIATED state
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        amount: amountInr,
        type: dto.type === PaymentTypeDto.FULL ? 'FULL' : dto.type === PaymentTypeDto.DEPOSIT ? 'DEPOSIT_50' : 'FULL',
        status: 'INITIATED',
        gateway: 'razorpay',
        gatewayOrderRef: order.id,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    await this.auditService.log(guestId, 'PAYMENT_INIT', 'payment', payment.id, {
      bookingId: dto.bookingId,
      type: dto.type,
      amount: amountInr,
      orderId: order.id,
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: amountInr,
      currency: 'INR',
      keyId: this.razorpay['keyId'] as string,
    };
  }

  /**
   * Handle Razorpay webhook.
   * MUST verify signature before processing any state changes.
   */
  async handleWebhook(rawBody: string, signature: string) {
    // 1. Verify signature — reject immediately if invalid
    const valid = this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = JSON.parse(rawBody) as Record<string, any>;
    const eventType: string = event['event'] as string;

    this.logger.log(`Razorpay webhook received: ${eventType}`);

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

    const amountInr = Math.round(amountPaise / 100);

    // Find payment by gateway order ref
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderRef: gatewayOrderId },
    });

    if (!payment) {
      this.logger.warn(`No payment found for order ${gatewayOrderId}`);
      return;
    }

    // Idempotency: skip if already captured
    if (payment.status === 'CAPTURED') {
      this.logger.log(`Payment ${payment.id} already captured - skipping`);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).$transaction(async (tx: TxClient) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          gatewayPaymentRef: gatewayPaymentId,
        },
      });

      // Pay Later seq 2+ captures bypass the booking-confirmation path — the
      // booking is already CONFIRMED_DEPOSIT from seq 1. Record the instalment
      // and, when the schedule is complete, transition to CONFIRMED_PAID.
      if (
        payment.type === 'PAY_LATER' &&
        payment.payLaterSeq &&
        payment.payLaterSeq > 1
      ) {
        const result = await this.payLaterService.recordInstalmentCapture(
          tx,
          payment.bookingId,
          payment.payLaterSeq,
          payment.id,
          amountInr,
        );
        if (result.completed) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED_PAID' },
          });
        }
      } else {
        // Confirm booking payment (transitions booking state). For seq 1 on
        // a PAY_LATER booking this path also creates the PayLaterPlan.
        await this.bookingService.confirmPayment(
          payment.bookingId,
          payment.id,
          amountInr,
          tx,
        );
      }

      await this.auditService.log(
        null,
        'PAYMENT_CAPTURED',
        'payment',
        payment.id,
        {
          gatewayPaymentId,
          gatewayOrderId,
          amountInr,
          payLaterSeq: payment.payLaterSeq ?? undefined,
        },
        tx,
      );
    });
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

    const amountInr = Math.round(instalment.amountMinor / 100);
    const order = await this.razorpay.createOrder(
      instalment.amountMinor,
      `${bookingId}_PL_${seq}`,
    );

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: amountInr,
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
      { bookingId, seq, amountInr, orderId: order.id },
    );

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: amountInr,
      currency: 'INR',
      keyId: this.razorpay['keyId'] as string,
      seq,
    };
  }
}
