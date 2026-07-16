/**
 * Real-service booking-engine harness.
 *
 * Wires the ACTUAL production services (BookingService, PaymentService,
 * HoldService, PricingService, PayLaterService, state machine, ledger, audit,
 * snapshot signer) against the REAL dev Postgres. Only the truly external
 * adapters are stubbed:
 *   - NotificationService  → no-op (no email/SMS in tests)
 *   - RazorpayService      → real class, but stub mode (no API keys) so
 *                            createOrder returns a deterministic stub order id
 *                            and verifyWebhookSignature returns true.
 *
 * This exercises the real code paths end-to-end — the same methods the HTTP
 * controllers call — so the lifecycle tests prove the engine, not a re-impl.
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/common/services/audit.service';
import { LedgerService } from '../../src/common/services/ledger.service';
import { PriceSnapshotSignerService } from '../../src/common/services/price-snapshot-signer.service';
import { BookingStateMachine } from '../../src/booking/state-machine';
import { PricingService } from '../../src/pricing/pricing.service';
import { HoldService } from '../../src/hold/hold.service';
import { BookingService } from '../../src/booking/booking.service';
import { PaymentService } from '../../src/payment/payment.service';
import { PayLaterService } from '../../src/pay-later/pay-later.service';
import { AddOnService } from '../../src/add-on/add-on.service';
import { MembershipService } from '../../src/membership/membership.service';
import { ReferralService } from '../../src/referral/referral.service';
import { OutboxService } from '../../src/notification/outbox.service';

const SNAPSHOT_SECRET =
  process.env.PRICE_SNAPSHOT_SECRET ?? 'dev-snapshot-secret-min-32-characters!';

/** ConfigService double: returns the snapshot secret; empty Razorpay keys → stub mode. */
function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    PRICE_SNAPSHOT_SECRET: SNAPSHOT_SECRET,
    RAZORPAY_KEY_ID: '',
    RAZORPAY_KEY_SECRET: '',
    RAZORPAY_WEBHOOK_SECRET: '',
    NODE_ENV: 'test',
    ...overrides,
  };
  return {
    get: (key: string, def?: unknown) => (key in values ? values[key] : def),
  } as unknown as ConfigService;
}

/** No-op notification service — records nothing, sends nothing. */
function makeNotificationStub() {
  const noop = async () => undefined;
  return {
    buildBookingConfirmedEmail: () => ({ to: '', subject: '', html: '' }),
    buildBookingConfirmedSms: () => null,
    sendBalanceDueReminder: noop,
    sendBookingCancelled: noop,
    sendHostBookingCancelled: noop,
    sendHostNewBooking: noop,
    sendPayLaterReminder: noop,
    sendEmail: noop,
    sendSms: noop,
  };
}

export interface EngineServices {
  prisma: PrismaClient;
  pricing: PricingService;
  hold: HoldService;
  booking: BookingService;
  payment: PaymentService;
  ledger: LedgerService;
  signer: PriceSnapshotSignerService;
  razorpay: { verifyWebhookSignature: () => boolean };
}

export function makeEngine(prisma: PrismaClient): EngineServices {
  const prismaSvc = prisma as unknown as PrismaService;
  const config = makeConfig();

  const audit = new AuditService(prismaSvc);
  const ledger = new LedgerService(prismaSvc);
  const signer = new PriceSnapshotSignerService(config);
  const stateMachine = new BookingStateMachine();
  const notification = makeNotificationStub() as never;
  const outbox = new OutboxService(prismaSvc);
  const referral = new ReferralService(prismaSvc);
  const membership = new MembershipService(prismaSvc);
  const addOn = new AddOnService(prismaSvc, audit);

  // RazorpayService in stub mode (no keys). We only need its interface; import
  // lazily to avoid pulling ConfigService typing quirks.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RazorpayService } = require('../../src/payment/razorpay.service');
  const razorpay = new RazorpayService(config);

  const payLater = new PayLaterService(prismaSvc, audit, ledger, notification);
  const pricing = new PricingService(prismaSvc, signer, addOn, membership);
  const hold = new HoldService(prismaSvc, pricing, audit);
  const booking = new BookingService(
    prismaSvc,
    pricing,
    audit,
    ledger,
    notification,
    outbox,
    referral,
    addOn,
    membership,
    payLater,
    stateMachine,
    signer,
  );
  const payment = new PaymentService(
    prismaSvc,
    booking,
    audit,
    razorpay,
    signer,
    payLater,
    stateMachine,
  );

  return { prisma, pricing, hold, booking, payment, ledger, signer, razorpay };
}

/**
 * Build the Razorpay `payment.captured` webhook event JSON for a payment row.
 * `orderId` must equal the payment's gatewayOrderRef; `amountPaise` the capture.
 */
export function capturedEvent(orderId: string, amountPaise: number, paymentId = 'pay_' + randomUUID().slice(0, 8)) {
  return JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: { id: paymentId, order_id: orderId, amount: amountPaise },
      },
    },
  });
}

export function failedEvent(orderId: string, paymentId = 'pay_' + randomUUID().slice(0, 8)) {
  return JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: { entity: { id: paymentId, order_id: orderId, amount: 0 } },
    },
  });
}
