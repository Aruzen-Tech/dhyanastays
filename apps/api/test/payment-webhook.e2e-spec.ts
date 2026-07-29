import * as crypto from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { PaymentController } from '../src/payment/payment.controller';
import { PaymentService } from '../src/payment/payment.service';
import { RazorpayService } from '../src/payment/razorpay.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingService } from '../src/booking/booking.service';
import { AuditService } from '../src/common/services/audit.service';
import { PriceSnapshotSignerService } from '../src/common/services/price-snapshot-signer.service';
import { PayLaterService } from '../src/pay-later/pay-later.service';
import { BookingStateMachine } from '../src/booking/state-machine';

describe('Payment webhook HTTP wiring', () => {
  const webhookSecret = 'test_webhook_secret';
  const rawPayload =
    '{"event":"subscription.activated","payload":{"subscription":{"entity":{"id":"sub_test_123"}}}}';

  let app: INestApplication;

  const processedEventCreate = jest.fn();
  const paymentFindFirst = jest.fn();

  const prismaMock = {
    processedRazorpayEvent: {
      create: processedEventCreate,
    },
    payment: {
      findFirst: paymentFindFirst,
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        RazorpayService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: unknown) => {
              const values: Record<string, unknown> = {
                NODE_ENV: 'test',
                RAZORPAY_KEY_ID: 'rzp_test_key',
                RAZORPAY_KEY_SECRET: 'rzp_test_secret',
                RAZORPAY_WEBHOOK_SECRET: webhookSecret,
              };
              return key in values ? values[key] : def;
            },
          },
        },
        { provide: PrismaService, useValue: prismaMock },
        { provide: BookingService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: PriceSnapshotSignerService, useValue: { verify: jest.fn(), sign: jest.fn() } },
        { provide: PayLaterService, useValue: {} },
        { provide: BookingStateMachine, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    processedEventCreate.mockResolvedValue(undefined);
  });

  const api = () =>
    request((app.getHttpServer() as { _events: { request: Parameters<typeof request>[0] } })._events.request);

  function sign(payload: string): string {
    return crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
  }

  it('accepts a valid HMAC signature and verifies the exact raw request body', async () => {
    const signature = sign(rawPayload);
    const verifySpy = jest.spyOn(
      app.get(RazorpayService),
      'verifyWebhookSignature',
    );

    const res = await api()
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', 'evt_valid_1')
      .send(rawPayload)
      .expect(201);

    expect(res.body).toEqual({ received: true });
    expect(verifySpy).toHaveBeenCalledWith(rawPayload, signature);
    expect(processedEventCreate).toHaveBeenCalledWith({
      data: { eventId: 'evt_valid_1', eventType: 'subscription.activated' },
    });
    expect(paymentFindFirst).not.toHaveBeenCalled();
  });

  it('rejects an invalid HMAC signature before dedup or dispatch', async () => {
    const verifySpy = jest.spyOn(
      app.get(RazorpayService),
      'verifyWebhookSignature',
    );

    await api()
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'bad_signature')
      .set('x-razorpay-event-id', 'evt_invalid_1')
      .send(rawPayload)
      .expect(401);

    expect(verifySpy).toHaveBeenCalledWith(rawPayload, 'bad_signature');
    expect(processedEventCreate).not.toHaveBeenCalled();
    expect(paymentFindFirst).not.toHaveBeenCalled();
  });

  it('treats duplicate event delivery as idempotent using x-razorpay-event-id', async () => {
    const signature = sign(rawPayload);

    processedEventCreate
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ code: 'P2002' });

    const first = await api()
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', 'evt_duplicate_1')
      .send(rawPayload)
      .expect(201);

    const second = await api()
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .set('x-razorpay-event-id', 'evt_duplicate_1')
      .send(rawPayload)
      .expect(201);

    expect(first.body).toEqual({ received: true });
    expect(second.body).toEqual({ received: true, deduped: true });
    expect(processedEventCreate).toHaveBeenNthCalledWith(1, {
      data: { eventId: 'evt_duplicate_1', eventType: 'subscription.activated' },
    });
    expect(processedEventCreate).toHaveBeenNthCalledWith(2, {
      data: { eventId: 'evt_duplicate_1', eventType: 'subscription.activated' },
    });
    expect(paymentFindFirst).not.toHaveBeenCalled();
  });
});
