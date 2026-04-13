import {
  BadRequestException,
  ForbiddenException,
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

      // Confirm booking payment (transitions booking state)
      await this.bookingService.confirmPayment(
        payment.bookingId,
        payment.id,
        amountInr,
        tx,
      );

      await this.auditService.log(
        null,
        'PAYMENT_CAPTURED',
        'payment',
        payment.id,
        {
          gatewayPaymentId,
          gatewayOrderId,
          amountInr,
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

}
