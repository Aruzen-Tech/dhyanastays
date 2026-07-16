import * as crypto from 'crypto';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';

/**
 * Unit tests for PaymentService and RazorpayService.
 * All external dependencies are mocked — no DB, no Razorpay API calls.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeAuditMock() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeBookingMock() {
  return {
    // confirmPayment is now tx-scoped and returns { booking, didConfirm }.
    confirmPayment: jest
      .fn()
      .mockResolvedValue({ booking: { id: 'booking-1', status: 'CONFIRMED_PAID' }, didConfirm: true }),
    // settleBalance handles the SECOND (balance) capture on a DEPOSIT_50 booking.
    settleBalance: jest
      .fn()
      .mockResolvedValue({ booking: { id: 'booking-1', status: 'CONFIRMED_PAID' }, didSettle: true }),
    sendBookingConfirmedNotificationPublic: jest.fn().mockResolvedValue(undefined),
  };
}

function makePayLaterMock() {
  return {
    recordInstalmentCapture: jest.fn().mockResolvedValue({ completed: false }),
  };
}

const SNAPSHOT = {
  total: 17050,
  depositAmount: 8525,
  balanceAmount: 8525,
};

const FULL_BOOKING = {
  id: 'booking-1',
  guestId: 'guest-1',
  plan: 'FULL',
  status: 'PAYMENT_PENDING',
  priceSnapshot: SNAPSHOT,
};

const DEPOSIT_BOOKING = {
  id: 'booking-2',
  guestId: 'guest-1',
  plan: 'DEPOSIT_50',
  status: 'PAYMENT_PENDING',
  priceSnapshot: SNAPSHOT,
};

// ─── RazorpayService unit tests ──────────────────────────────────────────────

describe('RazorpayService', () => {
  describe('verifyWebhookSignature()', () => {
    it('returns true for a valid HMAC-SHA256 signature', () => {
      const secret = 'test_webhook_secret';
      const body = JSON.stringify({ event: 'payment.captured' });
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const configMock = {
        get: jest.fn((key: string, def: string) => {
          if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
          if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_test_secret';
          if (key === 'RAZORPAY_WEBHOOK_SECRET') return secret;
          return def;
        }),
      };

       
      const svc = new RazorpayService(configMock as any);
      expect(svc.verifyWebhookSignature(body, validSig)).toBe(true);
    });

    it('returns false for a tampered body', () => {
      const secret = 'test_webhook_secret';
      const body = JSON.stringify({ event: 'payment.captured' });
      const tamperedBody = JSON.stringify({ event: 'payment.captured', extra: 'injected' });
      const sigForOriginal = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      const configMock = {
        get: jest.fn((key: string, def: string) => {
          if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
          if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_test_secret';
          if (key === 'RAZORPAY_WEBHOOK_SECRET') return secret;
          return def;
        }),
      };

       
      const svc = new RazorpayService(configMock as any);
      expect(svc.verifyWebhookSignature(tamperedBody, sigForOriginal)).toBe(false);
    });

    it('returns true in stub mode (no credentials)', () => {
      const configMock = {
        get: jest.fn((_key: string, def: string) => def ?? ''),
      };
       
      const svc = new RazorpayService(configMock as any);
      expect(svc.verifyWebhookSignature('any-body', 'any-sig')).toBe(true);
    });

    it('returns stub order in stub mode', async () => {
      const configMock = {
        get: jest.fn((_key: string, def: string) => def ?? ''),
      };
       
      const svc = new RazorpayService(configMock as any);
      const order = await svc.createOrder(1705000, 'booking-1_FULL');
      expect(order.id).toMatch(/^stub_order_/);
      expect(order.amount).toBe(1705000);
      expect(order.currency).toBe('INR');
    });
  });
});

// ─── PaymentService unit tests ───────────────────────────────────────────────

describe('PaymentService', () => {
  function makeSnapshotSignerMock() {
    return {
      sign: jest.fn((obj: Record<string, unknown>) => ({ ...obj, hmac: 'mock_hmac' })),
      verify: jest.fn().mockReturnValue(true),
    };
  }

  function makeRazorpayMock(stubMode = true) {
    return {
      createOrder: jest.fn().mockResolvedValue({
        id: 'order_test_123',
        amount: 1705000,
        currency: 'INR',
        receipt: 'booking-1_FULL',
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      keyId: stubMode ? '' : 'rzp_test_key',
    };
  }

  describe('initPayment()', () => {
    it('creates a payment record and returns Razorpay order for FULL plan', async () => {
      const createdPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 17050,
        type: 'FULL',
        status: 'INITIATED',
        gatewayOrderRef: 'order_test_123',
        idempotencyKey: 'idem-1',
      };

      const prismaMock = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(null), // no existing
          create: jest.fn().mockResolvedValue(createdPayment),
        },
        booking: {
          findUnique: jest.fn().mockResolvedValue(FULL_BOOKING),
        },
      };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

       
      const result = await service.initPayment('guest-1', {
        bookingId: 'booking-1',
        type: 'FULL' as any,
        idempotencyKey: 'idem-1',
      }) as any;

      expect(result.razorpayOrderId).toBe('order_test_123');
      expect(result.amount).toBe(17050);
      expect(result.currency).toBe('INR');
      expect(prismaMock.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking-1',
            amount: 17050,
            status: 'INITIATED',
            idempotencyKey: 'idem-1',
          }),
        }),
      );
    });

    it('returns existing payment idempotently for same idempotency key', async () => {
      const existingPayment = {
        id: 'payment-existing',
        bookingId: 'booking-1',
        amount: 17050,
        status: 'INITIATED',
        idempotencyKey: 'idem-1',
      };

      const prismaMock = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(existingPayment),
          create: jest.fn(),
        },
        booking: { findUnique: jest.fn() },
      };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      const result = await service.initPayment('guest-1', {
        bookingId: 'booking-1',
        type: 'FULL' as any,
        idempotencyKey: 'idem-1',
      });

      expect(result).toBe(existingPayment);
      expect(prismaMock.payment.create).not.toHaveBeenCalled();
      expect(prismaMock.booking.findUnique).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if idempotency key used for different booking', async () => {
      const existingPayment = {
        id: 'payment-existing',
        bookingId: 'booking-OTHER',
        idempotencyKey: 'idem-1',
      };

      const prismaMock = {
        payment: { findUnique: jest.fn().mockResolvedValue(existingPayment) },
      };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      await expect(
        service.initPayment('guest-1', {
          bookingId: 'booking-1',
          type: 'FULL' as any,
          idempotencyKey: 'idem-1',
        }),
      ).rejects.toThrow('Idempotency key already used for a different booking');
    });

    it('uses depositAmount for DEPOSIT payment type', async () => {
      const prismaMock = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'p-2', bookingId: 'booking-2', amount: 8525 }),
        },
        booking: {
          findUnique: jest.fn().mockResolvedValue(DEPOSIT_BOOKING),
        },
      };

      const razorpayMock = makeRazorpayMock();

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        razorpayMock as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

       
      const result = await service.initPayment('guest-1', {
        bookingId: 'booking-2',
        type: 'DEPOSIT' as any,
        idempotencyKey: 'idem-3',
      }) as any;

      // snapshot.depositAmount is already in paise — pass through unchanged.
      expect(result.amount).toBe(8525);
      expect(razorpayMock.createOrder).toHaveBeenCalledWith(
        8525,
        expect.any(String),
      );
    });

    it('throws ForbiddenException if guest does not own the booking', async () => {
      const otherGuestBooking = { ...FULL_BOOKING, guestId: 'other-guest' };

      const prismaMock = {
        payment: { findUnique: jest.fn().mockResolvedValue(null) },
        booking: { findUnique: jest.fn().mockResolvedValue(otherGuestBooking) },
      };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      await expect(
        service.initPayment('guest-1', {
          bookingId: 'booking-1',
          type: 'FULL' as any,
          idempotencyKey: 'idem-4',
        }),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('handleWebhook()', () => {
    it('throws UnauthorizedException if signature is invalid', async () => {
      const razorpayMock = makeRazorpayMock();
      razorpayMock.verifyWebhookSignature.mockReturnValue(false);

      const prismaMock = { payment: { findFirst: jest.fn() } };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        razorpayMock as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      await expect(
        service.handleWebhook('{"event":"payment.captured"}', 'bad-sig'),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('processes payment.captured and transitions booking to CONFIRMED_PAID', async () => {
      const capturedEvent = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_123',
              order_id: 'order_test_123',
              amount: 1705000, // paise
            },
          },
        },
      });

      const existingPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        status: 'INITIATED',
        type: 'FULL',
        payLaterSeq: null,
        gatewayOrderRef: 'order_test_123',
      };

      // tx mock — withSerializableRetry passes this into the callback.
      // The handler re-reads payment INSIDE the tx, so tx.payment.findUnique
      // must return the INITIATED payment.
      const txMock = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(existingPayment),
          update: jest.fn().mockResolvedValue({ ...existingPayment, status: 'CAPTURED' }),
        },
        // handlePaymentCaptured routes by booking status: PAYMENT_PENDING → the
        // initial confirmPayment path (this test); CONFIRMED_DEPOSIT/BALANCE_DUE
        // would route to settleBalance instead.
        booking: {
          findUnique: jest.fn().mockResolvedValue({ status: 'PAYMENT_PENDING' }),
        },
      };

      const prismaMock = {
        payment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        },
        $transaction: jest.fn().mockImplementation(async (fn: any) => fn(txMock)),
      };

      const bookingMock = makeBookingMock();
      const auditMock = makeAuditMock();
      const razorpayMock = makeRazorpayMock();

      const service = new PaymentService(
        prismaMock as any,
        bookingMock as any,
        auditMock as any,
        razorpayMock as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      const result = await service.handleWebhook(capturedEvent, 'valid-sig');

      expect(result).toEqual({ received: true });
      expect(txMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({ status: 'CAPTURED' }),
        }),
      );
      // confirmPayment is now called tx-first: (tx, bookingId, paymentId, amountPaise)
      expect(bookingMock.confirmPayment).toHaveBeenCalledWith(
        txMock,
        'booking-1',
        'payment-1',
        1705000,
      );
    });

    it('routes a BALANCE capture (booking already CONFIRMED_DEPOSIT/BALANCE_DUE) to settleBalance, not confirmPayment', async () => {
      const capturedEvent = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { id: 'pay_rzp_bal', order_id: 'order_bal_1', amount: 894400 },
          },
        },
      });

      const balancePayment = {
        id: 'payment-bal',
        bookingId: 'booking-1',
        status: 'INITIATED',
        type: 'FULL', // BALANCE payments are stored as type FULL — routing is by booking status
        payLaterSeq: null,
        gatewayOrderRef: 'order_bal_1',
      };

      const txMock = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(balancePayment),
          update: jest.fn().mockResolvedValue({ ...balancePayment, status: 'CAPTURED' }),
        },
        booking: {
          findUnique: jest.fn().mockResolvedValue({ status: 'BALANCE_DUE' }),
        },
      };
      const prismaMock = {
        payment: { findFirst: jest.fn().mockResolvedValue({ id: 'payment-bal' }) },
        $transaction: jest.fn().mockImplementation(async (fn: any) => fn(txMock)),
      };
      const bookingMock = makeBookingMock();

      const service = new PaymentService(
        prismaMock as any,
        bookingMock as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      await service.handleWebhook(capturedEvent, 'valid-sig');

      expect(bookingMock.settleBalance).toHaveBeenCalledWith(
        txMock,
        'booking-1',
        'payment-bal',
        894400,
      );
      expect(bookingMock.confirmPayment).not.toHaveBeenCalled();
      // Balance settlement does not re-send the "booking confirmed" notification.
      expect(bookingMock.sendBookingConfirmedNotificationPublic).not.toHaveBeenCalled();
    });

    it('skips payment.captured if payment already CAPTURED (idempotent)', async () => {
      const capturedEvent = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_123',
              order_id: 'order_test_123',
              amount: 1705000,
            },
          },
        },
      });

      const alreadyCapturedPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        status: 'CAPTURED', // already processed
        type: 'FULL',
        payLaterSeq: null,
        gatewayOrderRef: 'order_test_123',
      };

      // Idempotency now re-reads payment INSIDE the serializable tx and
      // short-circuits there. So $transaction IS entered, but confirmPayment
      // and payment.update are NOT called.
      const txMock = {
        payment: {
          findUnique: jest.fn().mockResolvedValue(alreadyCapturedPayment),
          update: jest.fn(),
        },
      };
      const prismaMock = {
        payment: { findFirst: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
        $transaction: jest.fn().mockImplementation(async (fn: any) => fn(txMock)),
      };

      const bookingMock = makeBookingMock();
      const service = new PaymentService(
        prismaMock as any,
        bookingMock as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      await service.handleWebhook(capturedEvent, 'valid-sig');

      // Idempotent: payment NOT updated, booking NOT confirmed.
      expect(txMock.payment.update).not.toHaveBeenCalled();
      expect(bookingMock.confirmPayment).not.toHaveBeenCalled();
    });

    it('processes payment.failed and marks payment as FAILED', async () => {
      const failedEvent = JSON.stringify({
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_fail',
              order_id: 'order_test_456',
            },
          },
        },
      });

      const existingPayment = {
        id: 'payment-2',
        bookingId: 'booking-2',
        status: 'INITIATED',
        gatewayOrderRef: 'order_test_456',
      };

      const prismaMock = {
        payment: {
          findFirst: jest.fn().mockResolvedValue(existingPayment),
          update: jest.fn().mockResolvedValue({ ...existingPayment, status: 'FAILED' }),
        },
      };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      await service.handleWebhook(failedEvent, 'valid-sig');

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-2' },
          data: { status: 'FAILED' },
        }),
      );
    });

    it('returns received:true for unknown event types without throwing', async () => {
      const unknownEvent = JSON.stringify({ event: 'subscription.activated' });

      const prismaMock = { payment: { findFirst: jest.fn() } };

      const service = new PaymentService(
        prismaMock as any,
        makeBookingMock() as any,
        makeAuditMock() as any,
        makeRazorpayMock() as any,
        makeSnapshotSignerMock() as any,
        makePayLaterMock() as any,
        { transition: jest.fn().mockResolvedValue({}) } as any,
      );

      const result = await service.handleWebhook(unknownEvent, 'valid-sig');
      expect(result).toEqual({ received: true });
      expect(prismaMock.payment.findFirst).not.toHaveBeenCalled();
    });
  });
});
