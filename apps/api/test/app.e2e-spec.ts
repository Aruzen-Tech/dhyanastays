/**
 * Dhyana Stays API — Comprehensive E2E Test Suite
 *
 * Strategy : @nestjs/testing + supertest with fully mocked services.
 * No real PostgreSQL, Redis, or Razorpay connections required.
 *
 * Coverage:
 *   Auth     — register / login / refresh / logout
 *   Listings — host CRUD + admin approval workflow + public feed
 *   Pricing  — quote
 *   Holds    — create
 *   Bookings — create / get / cancel / complete
 *   Payments — init / webhook / pay-balance
 *   Payouts  — eligible / run-weekly / batches / mark-paid / host statements
 *
 * Per guarded endpoint:
 *   ✓ Happy-path status + response shape
 *   ✓ 401 when no JWT supplied
 *   ✓ 403 when wrong role supplied
 *   ✓ 400 when required fields missing (ValidationPipe)
 */

// Set required env vars BEFORE any NestJS module is imported
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-min16chars!!x';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-min16chars!x';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_e2e';
process.env.MEILI_URL = 'http://localhost:7700';
process.env.MEILI_MASTER_KEY = 'meili_test_key_8c';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CommonModule } from '../src/common/common.module';
import { AuthModule } from '../src/auth/auth.module';
import { AuthService } from '../src/auth/auth.service';
import { ListingModule } from '../src/listing/listing.module';
import { ListingService } from '../src/listing/listing.service';
import { PricingModule } from '../src/pricing/pricing.module';
import { PricingService } from '../src/pricing/pricing.service';
import { HoldModule } from '../src/hold/hold.module';
import { HoldService } from '../src/hold/hold.service';
import { BookingModule } from '../src/booking/booking.module';
import { BookingService } from '../src/booking/booking.service';
import { PaymentModule } from '../src/payment/payment.module';
import { PaymentService } from '../src/payment/payment.service';
import { PayoutModule } from '../src/payout/payout.module';
import { PayoutService } from '../src/payout/payout.service';
import { StorageModule } from '../src/storage/storage.module';
import { StorageService } from '../src/storage/storage.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOKEN_RESP = { accessToken: 'mock-access', refreshToken: 'mock-refresh', tokenType: 'Bearer' };

const LISTING = {
  id: 'listing-1', title: 'Zen Cottage', description: 'Peaceful retreat',
  city: 'Rishikesh', state: 'Uttarakhand', country: 'India',
  status: 'APPROVED', hostId: 'host-id-1', createdById: 'host-id-1', needsReapproval: false,
};

const HOLD = {
  id: 'hold-1', listingId: 'listing-1', guestId: 'guest-id-1',
  startsAt: '2026-06-01T00:00:00.000Z', endsAt: '2026-06-03T00:00:00.000Z',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  priceSnapshot: { total: 11550, nights: 2 }, idempotencyKey: 'hold-idem-1',
};

const BOOKING = {
  id: 'booking-1', listingId: 'listing-1', guestId: 'guest-id-1',
  holdId: 'hold-1', status: 'CONFIRMED_PAID', plan: 'FULL', totalAmount: 11550,
};

const PAYMENT = {
  id: 'payment-1', bookingId: 'booking-1', amount: 11550,
  type: 'FULL', status: 'INITIATED', gateway: 'razorpay',
  gatewayOrderRef: 'order_test123', idempotencyKey: 'pay-idem-1',
};

const PAYOUT_LINE = {
  id: 'payout-line-1', hostId: 'host-id-1', bookingId: 'booking-1',
  listingId: 'listing-1', amount: 10395, status: 'ELIGIBLE',
};

const PAYOUT_BATCH = { batchId: 'batch-1', totalAmount: 10395, lineCount: 1, hostCount: 1 };

const PRESIGN_RESULT = {
  uploadUrl: 'http://localhost:3001/api/storage/stub-upload/listings/host-id-1/uuid.jpg',
  publicUrl: 'http://localhost:3001/api/storage/stub/listings/host-id-1/uuid.jpg',
  key: 'listings/host-id-1/uuid.jpg',
  expiresIn: 300,
};

const QUOTE = {
  listingId: 'listing-1', checkIn: '2026-06-01', checkOut: '2026-06-03',
  nights: 2, subtotal: 10000, cleaningFee: 500, platformFee: 1050,
  total: 11550, depositAmount: 5775, balanceAmount: 5775, nightlyBreakdown: [],
};

// ─── Mock services ────────────────────────────────────────────────────────────

const mockPrisma = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

const mockAuth = {
  register: jest.fn().mockResolvedValue(TOKEN_RESP),
  login: jest.fn().mockResolvedValue(TOKEN_RESP),
  refresh: jest.fn().mockResolvedValue(TOKEN_RESP),
  logout: jest.fn().mockResolvedValue({ success: true }),
};

const mockListing = {
  createHostListing: jest.fn().mockResolvedValue(LISTING),
  updateHostListing: jest.fn().mockResolvedValue(LISTING),
  getHostListings: jest.fn().mockResolvedValue([LISTING]),
  getPublicListings: jest.fn().mockResolvedValue([LISTING]),
  getPublicListingById: jest.fn().mockResolvedValue(LISTING),
  getPendingListings: jest.fn().mockResolvedValue([LISTING]),
  reviewListing: jest.fn().mockResolvedValue(LISTING),
};

const mockPricing = { quote: jest.fn().mockResolvedValue(QUOTE) };

const mockHold = {
  createHold: jest.fn().mockResolvedValue(HOLD),
  expireStaleHolds: jest.fn().mockResolvedValue(0),
};

const mockBooking = {
  createBooking: jest.fn().mockResolvedValue(BOOKING),
  getMyBookings: jest.fn().mockResolvedValue([BOOKING]),
  getBookingById: jest.fn().mockResolvedValue(BOOKING),
  cancelBooking: jest.fn().mockResolvedValue({ ...BOOKING, status: 'CANCELLED' }),
  completeBooking: jest.fn().mockResolvedValue({ ...BOOKING, status: 'COMPLETED' }),
  transitionToBalanceDue: jest.fn().mockResolvedValue(0),
  autoCancelUnpaidBalance: jest.fn().mockResolvedValue(0),
};

const mockPayment = {
  initPayment: jest.fn().mockResolvedValue(PAYMENT),
  handleWebhook: jest.fn().mockResolvedValue({ received: true }),
  payBalance: jest.fn().mockResolvedValue({ ...PAYMENT, type: 'BALANCE' }),
};

const mockStorage = {
  getPresignedUploadUrl: jest.fn().mockResolvedValue(PRESIGN_RESULT),
  deleteObject: jest.fn().mockResolvedValue(undefined),
  buildPublicUrl: jest.fn().mockReturnValue('http://localhost:3001/api/storage/stub/key.jpg'),
};

const mockPayout = {
  markEligible: jest.fn().mockResolvedValue(0),
  getEligibleLines: jest.fn().mockResolvedValue([PAYOUT_LINE]),
  runWeeklyBatch: jest.fn().mockResolvedValue(PAYOUT_BATCH),
  markBatchPaid: jest.fn().mockResolvedValue({ id: 'batch-1', status: 'PAID' }),
  getBatches: jest.fn().mockResolvedValue([PAYOUT_BATCH]),
  getHostStatements: jest.fn().mockResolvedValue({ lines: [PAYOUT_LINE], total: 10395 }),
  handleRefundAfterPayout: jest.fn().mockResolvedValue(undefined),
};

function resetMocks() {
  mockAuth.register.mockResolvedValue(TOKEN_RESP);
  mockAuth.login.mockResolvedValue(TOKEN_RESP);
  mockAuth.refresh.mockResolvedValue(TOKEN_RESP);
  mockAuth.logout.mockResolvedValue({ success: true });
  mockListing.createHostListing.mockResolvedValue(LISTING);
  mockListing.updateHostListing.mockResolvedValue(LISTING);
  mockListing.getHostListings.mockResolvedValue([LISTING]);
  mockListing.getPublicListings.mockResolvedValue([LISTING]);
  mockListing.getPublicListingById.mockResolvedValue(LISTING);
  mockListing.getPendingListings.mockResolvedValue([LISTING]);
  mockListing.reviewListing.mockResolvedValue(LISTING);
  mockPricing.quote.mockResolvedValue(QUOTE);
  mockHold.createHold.mockResolvedValue(HOLD);
  mockBooking.createBooking.mockResolvedValue(BOOKING);
  mockBooking.getMyBookings.mockResolvedValue([BOOKING]);
  mockBooking.getBookingById.mockResolvedValue(BOOKING);
  mockBooking.cancelBooking.mockResolvedValue({ ...BOOKING, status: 'CANCELLED' });
  mockBooking.completeBooking.mockResolvedValue({ ...BOOKING, status: 'COMPLETED' });
  mockPayment.initPayment.mockResolvedValue(PAYMENT);
  mockPayment.handleWebhook.mockResolvedValue({ received: true });
  mockPayment.payBalance.mockResolvedValue({ ...PAYMENT, type: 'BALANCE' });
  mockStorage.getPresignedUploadUrl.mockResolvedValue(PRESIGN_RESULT);
  mockStorage.deleteObject.mockResolvedValue(undefined);
  mockPayout.getEligibleLines.mockResolvedValue([PAYOUT_LINE]);
  mockPayout.runWeeklyBatch.mockResolvedValue(PAYOUT_BATCH);
  mockPayout.markBatchPaid.mockResolvedValue({ id: 'batch-1', status: 'PAID' });
  mockPayout.getBatches.mockResolvedValue([PAYOUT_BATCH]);
  mockPayout.getHostStatements.mockResolvedValue({ lines: [PAYOUT_LINE], total: 10395 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Dhyana Stays API — E2E', () => {
  let app: INestApplication;
  let guestTok: string;
  let hostTok: string;
  let adminTok: string;

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        CommonModule,
        AuthModule,
        ListingModule,
        PricingModule,
        HoldModule,
        BookingModule,
        PaymentModule,
        PayoutModule,
        StorageModule,
        // JobsModule excluded — requires live Redis
      ],
    })
      .overrideProvider(PrismaService).useValue(mockPrisma)
      .overrideProvider(AuthService).useValue(mockAuth)
      .overrideProvider(ListingService).useValue(mockListing)
      .overrideProvider(PricingService).useValue(mockPricing)
      .overrideProvider(HoldService).useValue(mockHold)
      .overrideProvider(BookingService).useValue(mockBooking)
      .overrideProvider(PaymentService).useValue(mockPayment)
      .overrideProvider(PayoutService).useValue(mockPayout)
      .overrideProvider(StorageService).useValue(mockStorage)
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    const jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });
    guestTok = jwt.sign({ sub: 'guest-id-1', email: 'guest@test.com', role: 'GUEST' });
    hostTok  = jwt.sign({ sub: 'host-id-1',  email: 'host@test.com',  role: 'HOST'  });
    adminTok = jwt.sign({ sub: 'admin-id-1', email: 'admin@test.com', role: 'ADMIN' });
  });

  afterAll(() => app.close());

  beforeEach(() => { jest.clearAllMocks(); resetMocks(); });

  // Shorthand helpers
  const api = () => request(app.getHttpServer());
  const bearer = (tok: string) => `Bearer ${tok}`;

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════

  describe('Auth', () => {

    describe('POST /api/auth/register', () => {
      it('201 — registers GUEST, returns tokens', async () => {
        const res = await api().post('/api/auth/register')
          .send({ email: 'g@t.com', password: 'Pass123!', fullName: 'G', role: 'GUEST' })
          .expect(201);
        expect(res.body).toMatchObject({ accessToken: expect.any(String), tokenType: 'Bearer' });
        expect(mockAuth.register).toHaveBeenCalledTimes(1);
      });

      it('201 — registers HOST, returns tokens', async () => {
        const res = await api().post('/api/auth/register')
          .send({ email: 'h@t.com', password: 'Pass123!', fullName: 'H', role: 'HOST' })
          .expect(201);
        expect(res.body).toHaveProperty('accessToken');
      });

      it('400 — missing email', () =>
        api().post('/api/auth/register')
          .send({ password: 'Pass123!', fullName: 'T', role: 'GUEST' }).expect(400));

      it('400 — missing password', () =>
        api().post('/api/auth/register')
          .send({ email: 'x@t.com', fullName: 'T', role: 'GUEST' }).expect(400));

      it('400 — missing role', () =>
        api().post('/api/auth/register')
          .send({ email: 'x@t.com', password: 'Pass123!', fullName: 'T' }).expect(400));

      it('400 — service rejects ADMIN self-registration', async () => {
        const { BadRequestException } = await import('@nestjs/common');
        mockAuth.register.mockRejectedValueOnce(
          new BadRequestException('Admin registration is not self-service'),
        );
        await api().post('/api/auth/register')
          .send({ email: 'a@t.com', password: 'Pass123!', fullName: 'A', role: 'ADMIN' })
          .expect(400);
      });
    });

    describe('POST /api/auth/login', () => {
      it('201 — returns tokens', async () => {
        const res = await api().post('/api/auth/login')
          .send({ email: 'g@t.com', password: 'Pass123!' }).expect(201);
        expect(res.body).toHaveProperty('accessToken');
        expect(mockAuth.login).toHaveBeenCalledWith({ email: 'g@t.com', password: 'Pass123!' });
      });

      it('400 — missing email', () =>
        api().post('/api/auth/login').send({ password: 'Pass123!' }).expect(400));

      it('400 — missing password', () =>
        api().post('/api/auth/login').send({ email: 'g@t.com' }).expect(400));

      it('401 — wrong credentials', async () => {
        const { UnauthorizedException } = await import('@nestjs/common');
        mockAuth.login.mockRejectedValueOnce(new UnauthorizedException('Invalid credentials'));
        // password must be ≥8 chars to pass DTO validation before reaching the service
        await api().post('/api/auth/login')
          .send({ email: 'g@t.com', password: 'WrongPass!!' }).expect(401);
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('201 — returns new tokens', async () => {
        // refreshToken must be ≥16 chars to pass DTO validation
        const res = await api().post('/api/auth/refresh')
          .send({ refreshToken: 'valid-refresh-token-16c' }).expect(201);
        expect(res.body).toHaveProperty('accessToken');
      });

      it('400 — missing refreshToken', () =>
        api().post('/api/auth/refresh').send({}).expect(400));

      it('401 — invalid refresh token', async () => {
        const { UnauthorizedException } = await import('@nestjs/common');
        mockAuth.refresh.mockRejectedValueOnce(new UnauthorizedException('Invalid refresh token'));
        // token must be ≥16 chars to pass DTO validation before reaching the service
        await api().post('/api/auth/refresh').send({ refreshToken: 'bad-refresh-token-16c' }).expect(401);
      });
    });

    describe('POST /api/auth/logout', () => {
      it('201 — logs out authenticated user', async () => {
        const res = await api().post('/api/auth/logout')
          .set('Authorization', bearer(guestTok)).expect(201);
        expect(res.body).toEqual({ success: true });
        expect(mockAuth.logout).toHaveBeenCalledWith('guest-id-1');
      });

      it('401 — no token', () => api().post('/api/auth/logout').expect(401));

      it('401 — malformed token', () =>
        api().post('/api/auth/logout')
          .set('Authorization', 'Bearer not-a-jwt').expect(401));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LISTINGS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Listings', () => {
    const listingBody = {
      title: 'Zen Cottage', description: 'Peaceful retreat',
      city: 'Rishikesh', state: 'Uttarakhand',
      baseNightlyRate: 500000, // paise (₹5000)
      maxGuests: 4,
    };

    describe('POST /api/host/listings', () => {
      it('201 — HOST creates listing', async () => {
        const res = await api().post('/api/host/listings')
          .set('Authorization', bearer(hostTok)).send(listingBody).expect(201);
        expect(res.body).toMatchObject({ id: 'listing-1', title: 'Zen Cottage' });
        expect(mockListing.createHostListing).toHaveBeenCalledWith(
          'host-id-1', expect.objectContaining({ title: 'Zen Cottage' }),
        );
      });

      it('401 — no token',   () => api().post('/api/host/listings').send(listingBody).expect(401));
      it('403 — GUEST role', () =>
        api().post('/api/host/listings')
          .set('Authorization', bearer(guestTok)).send(listingBody).expect(403));
      it('403 — ADMIN role', () =>
        api().post('/api/host/listings')
          .set('Authorization', bearer(adminTok)).send(listingBody).expect(403));
      it('400 — missing title', () =>
        api().post('/api/host/listings')
          .set('Authorization', bearer(hostTok))
          .send({ description: 'D', city: 'C', state: 'S' }).expect(400));
      it('400 — missing city', () =>
        api().post('/api/host/listings')
          .set('Authorization', bearer(hostTok))
          .send({ title: 'T', description: 'D', state: 'S' }).expect(400));
    });

    describe('PATCH /api/host/listings/:id', () => {
      it('200 — HOST updates listing', async () => {
        const res = await api().patch('/api/host/listings/listing-1')
          .set('Authorization', bearer(hostTok)).send({ title: 'Updated' }).expect(200);
        expect(res.body).toHaveProperty('id', 'listing-1');
        expect(mockListing.updateHostListing).toHaveBeenCalledWith(
          'host-id-1', 'listing-1', expect.objectContaining({ title: 'Updated' }),
        );
      });

      it('401 — no token',   () =>
        api().patch('/api/host/listings/listing-1').send({ title: 'X' }).expect(401));
      it('403 — GUEST role', () =>
        api().patch('/api/host/listings/listing-1')
          .set('Authorization', bearer(guestTok)).send({ title: 'X' }).expect(403));
      it('403 — ADMIN role', () =>
        api().patch('/api/host/listings/listing-1')
          .set('Authorization', bearer(adminTok)).send({ title: 'X' }).expect(403));
    });

    describe('GET /api/host/listings', () => {
      it('200 — HOST gets own listings (all statuses)', async () => {
        const res = await api().get('/api/host/listings')
          .set('Authorization', bearer(hostTok)).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toMatchObject({ id: 'listing-1', title: 'Zen Cottage' });
        expect(mockListing.getHostListings).toHaveBeenCalledWith('host-id-1');
      });

      it('401 — no token',   () => api().get('/api/host/listings').expect(401));
      it('403 — GUEST role', () =>
        api().get('/api/host/listings')
          .set('Authorization', bearer(guestTok)).expect(403));
      it('403 — ADMIN role', () =>
        api().get('/api/host/listings')
          .set('Authorization', bearer(adminTok)).expect(403));
    });

    describe('GET /api/listings', () => {
      it('200 — public feed, no auth required', async () => {
        const res = await api().get('/api/listings').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toHaveProperty('id', 'listing-1');
      });

      it('200 — also works with guest token', () =>
        api().get('/api/listings').set('Authorization', bearer(guestTok)).expect(200));
    });

    describe('GET /api/listings/:id', () => {
      it('200 — returns single listing', async () => {
        const res = await api().get('/api/listings/listing-1').expect(200);
        expect(res.body).toMatchObject({ id: 'listing-1', status: 'APPROVED' });
      });

      it('404 — unknown listing', async () => {
        const { NotFoundException } = await import('@nestjs/common');
        mockListing.getPublicListingById.mockRejectedValueOnce(
          new NotFoundException('Listing not found'),
        );
        await api().get('/api/listings/unknown').expect(404);
      });
    });

    describe('GET /api/admin/listings/pending', () => {
      it('200 — ADMIN gets pending list', async () => {
        const res = await api().get('/api/admin/listings/pending')
          .set('Authorization', bearer(adminTok)).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('401 — no token',   () => api().get('/api/admin/listings/pending').expect(401));
      it('403 — HOST role',  () =>
        api().get('/api/admin/listings/pending')
          .set('Authorization', bearer(hostTok)).expect(403));
      it('403 — GUEST role', () =>
        api().get('/api/admin/listings/pending')
          .set('Authorization', bearer(guestTok)).expect(403));
    });

    describe('POST /api/admin/listings/:id/approve', () => {
      it('201 — ADMIN approves listing', async () => {
        mockListing.reviewListing.mockResolvedValueOnce({ ...LISTING, status: 'APPROVED' });
        const res = await api().post('/api/admin/listings/listing-1/approve')
          .set('Authorization', bearer(adminTok)).expect(201);
        expect(res.body).toHaveProperty('status', 'APPROVED');
        expect(mockListing.reviewListing).toHaveBeenCalledWith(
          'admin-id-1', 'listing-1', 'approve', undefined,
        );
      });

      it('401 — no token',   () =>
        api().post('/api/admin/listings/listing-1/approve').expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/admin/listings/listing-1/approve')
          .set('Authorization', bearer(hostTok)).expect(403));
      it('403 — GUEST role', () =>
        api().post('/api/admin/listings/listing-1/approve')
          .set('Authorization', bearer(guestTok)).expect(403));
    });

    describe('POST /api/admin/listings/:id/reject', () => {
      it('201 — ADMIN rejects listing with note', async () => {
        mockListing.reviewListing.mockResolvedValueOnce({ ...LISTING, status: 'REJECTED' });
        const res = await api().post('/api/admin/listings/listing-1/reject')
          .set('Authorization', bearer(adminTok))
          .send({ note: 'Does not meet standards' }).expect(201);
        expect(res.body).toHaveProperty('status', 'REJECTED');
        expect(mockListing.reviewListing).toHaveBeenCalledWith(
          'admin-id-1', 'listing-1', 'reject', 'Does not meet standards',
        );
      });

      it('401 — no token',   () =>
        api().post('/api/admin/listings/listing-1/reject').expect(401));
      it('403 — GUEST role', () =>
        api().post('/api/admin/listings/listing-1/reject')
          .set('Authorization', bearer(guestTok)).expect(403));
    });

    describe('POST /api/admin/listings/:id/request-changes', () => {
      it('201 — ADMIN requests changes', async () => {
        mockListing.reviewListing.mockResolvedValueOnce({
          ...LISTING, status: 'CHANGES_REQUESTED',
        });
        const res = await api().post('/api/admin/listings/listing-1/request-changes')
          .set('Authorization', bearer(adminTok))
          .send({ note: 'Please update photos' }).expect(201);
        expect(res.body).toHaveProperty('status', 'CHANGES_REQUESTED');
        expect(mockListing.reviewListing).toHaveBeenCalledWith(
          'admin-id-1', 'listing-1', 'request_changes', 'Please update photos',
        );
      });

      it('401 — no token',   () =>
        api().post('/api/admin/listings/listing-1/request-changes').expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/admin/listings/listing-1/request-changes')
          .set('Authorization', bearer(hostTok)).expect(403));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PRICING
  // ══════════════════════════════════════════════════════════════════════════

  describe('Pricing', () => {
    const quoteBody = {
      listingId: 'listing-1', checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2,
    };

    describe('POST /api/pricing/quote', () => {
      it('201 — returns price quote', async () => {
        const res = await api().post('/api/pricing/quote')
          .set('Authorization', bearer(guestTok)).send(quoteBody).expect(201);
        expect(res.body).toMatchObject({
          total: 11550, depositAmount: 5775, nights: 2,
        });
        expect(mockPricing.quote).toHaveBeenCalledWith(
          expect.objectContaining({ listingId: 'listing-1' }),
        );
      });

      // /api/pricing/quote is decorated @Public() — no JWT required by design
      it('201 — accessible without token (public route)', () =>
        api().post('/api/pricing/quote').send(quoteBody).expect(201));

      it('400 — missing listingId', () =>
        api().post('/api/pricing/quote')
          .set('Authorization', bearer(guestTok))
          .send({ checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2 }).expect(400));

      it('400 — missing checkIn', () =>
        api().post('/api/pricing/quote')
          .set('Authorization', bearer(guestTok))
          .send({ listingId: 'listing-1', checkOut: '2026-06-03', guests: 2 }).expect(400));

      it('400 — missing guests', () =>
        api().post('/api/pricing/quote')
          .set('Authorization', bearer(guestTok))
          .send({ listingId: 'listing-1', checkIn: '2026-06-01', checkOut: '2026-06-03' })
          .expect(400));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HOLDS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Holds', () => {
    // idempotencyKey must be a valid UUID (DTO uses @IsUUID())
    const holdBody = {
      listingId: 'listing-1', checkIn: '2026-06-01', checkOut: '2026-06-03',
      guests: 2, idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
    };

    describe('POST /api/holds', () => {
      it('201 — GUEST creates hold', async () => {
        const res = await api().post('/api/holds')
          .set('Authorization', bearer(guestTok)).send(holdBody).expect(201);
        expect(res.body).toMatchObject({ id: 'hold-1', listingId: 'listing-1' });
        expect(mockHold.createHold).toHaveBeenCalledWith('guest-id-1', expect.objectContaining({ listingId: 'listing-1' }));
      });

      it('401 — no token',   () => api().post('/api/holds').send(holdBody).expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/holds').set('Authorization', bearer(hostTok)).send(holdBody).expect(403));
      it('403 — ADMIN role', () =>
        api().post('/api/holds').set('Authorization', bearer(adminTok)).send(holdBody).expect(403));
      it('400 — missing idempotencyKey', () =>
        api().post('/api/holds')
          .set('Authorization', bearer(guestTok))
          .send({ listingId: 'listing-1', checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2 })
          .expect(400));
      it('400 — missing listingId', () =>
        api().post('/api/holds')
          .set('Authorization', bearer(guestTok))
          .send({ checkIn: '2026-06-01', checkOut: '2026-06-03', guests: 2, idempotencyKey: 'k' })
          .expect(400));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BOOKINGS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Bookings', () => {
    // holdId must be a valid UUID (DTO uses @IsUUID()); idempotencyKey is required
    const bookingBody = {
      holdId: '550e8400-e29b-41d4-a716-446655440002',
      plan: 'FULL',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440003',
    };

    describe('POST /api/bookings', () => {
      it('201 — GUEST creates booking from hold', async () => {
        const res = await api().post('/api/bookings')
          .set('Authorization', bearer(guestTok)).send(bookingBody).expect(201);
        expect(res.body).toMatchObject({ id: 'booking-1', status: 'CONFIRMED_PAID', plan: 'FULL' });
        expect(mockBooking.createBooking).toHaveBeenCalledWith(
          'guest-id-1',
          expect.objectContaining({
            holdId: '550e8400-e29b-41d4-a716-446655440002',
            plan: 'FULL',
          }),
        );
      });

      it('401 — no token',   () => api().post('/api/bookings').send(bookingBody).expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/bookings').set('Authorization', bearer(hostTok)).send(bookingBody).expect(403));
      it('403 — ADMIN role', () =>
        api().post('/api/bookings').set('Authorization', bearer(adminTok)).send(bookingBody).expect(403));
      it('400 — missing holdId', () =>
        api().post('/api/bookings')
          .set('Authorization', bearer(guestTok)).send({ plan: 'FULL' }).expect(400));
      it('400 — missing plan', () =>
        api().post('/api/bookings')
          .set('Authorization', bearer(guestTok)).send({ holdId: 'hold-1' }).expect(400));
    });

    describe('GET /api/bookings', () => {
      it('200 — GUEST gets own bookings list', async () => {
        const res = await api().get('/api/bookings')
          .set('Authorization', bearer(guestTok)).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toMatchObject({ id: 'booking-1', status: 'CONFIRMED_PAID' });
        expect(mockBooking.getMyBookings).toHaveBeenCalledWith('guest-id-1');
      });

      it('401 — no token',   () => api().get('/api/bookings').expect(401));
      it('403 — HOST role',  () =>
        api().get('/api/bookings').set('Authorization', bearer(hostTok)).expect(403));
      it('403 — ADMIN role', () =>
        api().get('/api/bookings').set('Authorization', bearer(adminTok)).expect(403));
    });

    describe('GET /api/bookings/:id', () => {
      it('200 — returns booking for authenticated user', async () => {
        const res = await api().get('/api/bookings/booking-1')
          .set('Authorization', bearer(guestTok)).expect(200);
        expect(res.body).toMatchObject({ id: 'booking-1', status: 'CONFIRMED_PAID' });
        expect(mockBooking.getBookingById).toHaveBeenCalledWith('booking-1', 'guest-id-1', 'GUEST');
      });

      it('200 — ADMIN can also fetch any booking', async () => {
        const res = await api().get('/api/bookings/booking-1')
          .set('Authorization', bearer(adminTok)).expect(200);
        expect(res.body).toHaveProperty('id', 'booking-1');
      });

      it('401 — no token', () => api().get('/api/bookings/booking-1').expect(401));

      it('404 — booking not found', async () => {
        const { NotFoundException } = await import('@nestjs/common');
        mockBooking.getBookingById.mockRejectedValueOnce(new NotFoundException('Booking not found'));
        await api().get('/api/bookings/unknown')
          .set('Authorization', bearer(guestTok)).expect(404);
      });
    });

    describe('POST /api/bookings/:id/cancel', () => {
      it('201 — GUEST cancels own booking', async () => {
        const res = await api().post('/api/bookings/booking-1/cancel')
          .set('Authorization', bearer(guestTok))
          .send({ reason: 'Change of plans' }).expect(201);
        expect(res.body).toHaveProperty('status', 'CANCELLED');
        expect(mockBooking.cancelBooking).toHaveBeenCalledWith(
          'booking-1', 'guest-id-1', 'GUEST', expect.objectContaining({ reason: 'Change of plans' }),
        );
      });

      it('201 — ADMIN cancels booking', async () => {
        const res = await api().post('/api/bookings/booking-1/cancel')
          .set('Authorization', bearer(adminTok))
          .send({ reason: 'Policy violation' }).expect(201);
        expect(res.body).toHaveProperty('status', 'CANCELLED');
      });

      it('401 — no token', () =>
        api().post('/api/bookings/booking-1/cancel').send({ reason: 'X' }).expect(401));
    });

    describe('POST /api/bookings/:id/complete', () => {
      it('201 — ADMIN marks booking completed', async () => {
        const res = await api().post('/api/bookings/booking-1/complete')
          .set('Authorization', bearer(adminTok)).expect(201);
        expect(res.body).toHaveProperty('status', 'COMPLETED');
        expect(mockBooking.completeBooking).toHaveBeenCalledWith('booking-1', 'admin-id-1');
      });

      it('401 — no token',   () => api().post('/api/bookings/booking-1/complete').expect(401));
      it('403 — GUEST role', () =>
        api().post('/api/bookings/booking-1/complete')
          .set('Authorization', bearer(guestTok)).expect(403));
      it('403 — HOST role',  () =>
        api().post('/api/bookings/booking-1/complete')
          .set('Authorization', bearer(hostTok)).expect(403));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Payments', () => {
    // idempotencyKey must be a valid UUID (DTO uses @IsUUID())
    const initBody = {
      bookingId: 'booking-1',
      type: 'FULL',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440004',
    };

    describe('POST /api/payments/init', () => {
      it('201 — GUEST initiates payment', async () => {
        const res = await api().post('/api/payments/init')
          .set('Authorization', bearer(guestTok)).send(initBody).expect(201);
        expect(res.body).toMatchObject({ id: 'payment-1', status: 'INITIATED', gateway: 'razorpay' });
        expect(mockPayment.initPayment).toHaveBeenCalledWith(
          'guest-id-1', expect.objectContaining({ bookingId: 'booking-1' }),
        );
      });

      it('401 — no token',   () => api().post('/api/payments/init').send(initBody).expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/payments/init')
          .set('Authorization', bearer(hostTok)).send(initBody).expect(403));
      it('403 — ADMIN role', () =>
        api().post('/api/payments/init')
          .set('Authorization', bearer(adminTok)).send(initBody).expect(403));
      it('400 — missing bookingId', () =>
        api().post('/api/payments/init')
          .set('Authorization', bearer(guestTok))
          .send({ type: 'FULL', idempotencyKey: 'k' }).expect(400));
      it('400 — missing idempotencyKey', () =>
        api().post('/api/payments/init')
          .set('Authorization', bearer(guestTok))
          .send({ bookingId: 'booking-1', type: 'FULL' }).expect(400));
    });

    describe('POST /api/payments/webhook', () => {
      it('201 — accepts webhook without JWT (public route)', async () => {
        const payload = JSON.stringify({
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_test', order_id: 'order_test123' } } },
        });
        const res = await api().post('/api/payments/webhook')
          .set('Content-Type', 'application/json')
          .set('x-razorpay-signature', 'test-sig')
          .send(payload).expect(201);
        expect(res.body).toEqual({ received: true });
        expect(mockPayment.handleWebhook).toHaveBeenCalledTimes(1);
      });

      it('201 — webhook works even with a guest token (public, token ignored)', async () => {
        const res = await api().post('/api/payments/webhook')
          .set('Authorization', bearer(guestTok))
          .set('x-razorpay-signature', 'sig')
          .send('{}').expect(201);
        expect(res.body).toEqual({ received: true });
      });
    });

    describe('POST /api/payments/bookings/:id/pay-balance', () => {
      it('201 — GUEST pays balance on BALANCE_DUE booking', async () => {
        const res = await api().post('/api/payments/bookings/booking-1/pay-balance')
          .set('Authorization', bearer(guestTok))
          .send({ idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' }).expect(201);
        expect(res.body).toMatchObject({ type: 'BALANCE' });
        expect(mockPayment.payBalance).toHaveBeenCalledWith(
          'guest-id-1', 'booking-1', '550e8400-e29b-41d4-a716-446655440000',
        );
      });

      it('401 — no token',   () =>
        api().post('/api/payments/bookings/booking-1/pay-balance')
          .send({ idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' }).expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/payments/bookings/booking-1/pay-balance')
          .set('Authorization', bearer(hostTok))
          .send({ idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' }).expect(403));
      it('400 — missing idempotencyKey', () =>
        api().post('/api/payments/bookings/booking-1/pay-balance')
          .set('Authorization', bearer(guestTok)).send({}).expect(400));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAYOUTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Payouts', () => {

    describe('GET /api/admin/payouts/eligible', () => {
      it('200 — ADMIN gets eligible payout lines', async () => {
        const res = await api().get('/api/admin/payouts/eligible')
          .set('Authorization', bearer(adminTok)).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toMatchObject({ id: 'payout-line-1', status: 'ELIGIBLE' });
        expect(mockPayout.getEligibleLines).toHaveBeenCalledTimes(1);
      });

      it('401 — no token',   () => api().get('/api/admin/payouts/eligible').expect(401));
      it('403 — HOST role',  () =>
        api().get('/api/admin/payouts/eligible')
          .set('Authorization', bearer(hostTok)).expect(403));
      it('403 — GUEST role', () =>
        api().get('/api/admin/payouts/eligible')
          .set('Authorization', bearer(guestTok)).expect(403));
    });

    describe('POST /api/admin/payouts/run-weekly', () => {
      it('201 — ADMIN runs weekly payout batch', async () => {
        const res = await api().post('/api/admin/payouts/run-weekly')
          .set('Authorization', bearer(adminTok)).expect(201);
        expect(res.body).toMatchObject({ batchId: 'batch-1', totalAmount: 10395, lineCount: 1 });
        expect(mockPayout.runWeeklyBatch).toHaveBeenCalledWith('admin-id-1');
      });

      it('401 — no token',   () => api().post('/api/admin/payouts/run-weekly').expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/admin/payouts/run-weekly')
          .set('Authorization', bearer(hostTok)).expect(403));
      it('403 — GUEST role', () =>
        api().post('/api/admin/payouts/run-weekly')
          .set('Authorization', bearer(guestTok)).expect(403));
    });

    describe('GET /api/admin/payouts/batches', () => {
      it('200 — ADMIN lists all payout batches', async () => {
        const res = await api().get('/api/admin/payouts/batches')
          .set('Authorization', bearer(adminTok)).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(mockPayout.getBatches).toHaveBeenCalledTimes(1);
      });

      it('401 — no token',   () => api().get('/api/admin/payouts/batches').expect(401));
      it('403 — HOST role',  () =>
        api().get('/api/admin/payouts/batches')
          .set('Authorization', bearer(hostTok)).expect(403));
    });

    describe('POST /api/admin/payouts/batches/:id/mark-paid', () => {
      it('201 — ADMIN marks batch as PAID', async () => {
        const res = await api().post('/api/admin/payouts/batches/batch-1/mark-paid')
          .set('Authorization', bearer(adminTok)).expect(201);
        expect(res.body).toMatchObject({ id: 'batch-1', status: 'PAID' });
        expect(mockPayout.markBatchPaid).toHaveBeenCalledWith('batch-1', 'admin-id-1');
      });

      it('401 — no token',   () =>
        api().post('/api/admin/payouts/batches/batch-1/mark-paid').expect(401));
      it('403 — HOST role',  () =>
        api().post('/api/admin/payouts/batches/batch-1/mark-paid')
          .set('Authorization', bearer(hostTok)).expect(403));
    });

    describe('GET /api/host/payouts/statements', () => {
      it('200 — HOST gets own payout statements', async () => {
        const res = await api().get('/api/host/payouts/statements')
          .set('Authorization', bearer(hostTok)).expect(200);
        expect(res.body).toMatchObject({ total: 10395 });
        expect(Array.isArray(res.body.lines)).toBe(true);
        expect(mockPayout.getHostStatements).toHaveBeenCalledWith('host-id-1');
      });

      it('401 — no token',   () => api().get('/api/host/payouts/statements').expect(401));
      it('403 — GUEST role', () =>
        api().get('/api/host/payouts/statements')
          .set('Authorization', bearer(guestTok)).expect(403));
      it('403 — ADMIN role', () =>
        api().get('/api/host/payouts/statements')
          .set('Authorization', bearer(adminTok)).expect(403));
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STORAGE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Storage', () => {

    describe('POST /api/storage/presign', () => {
      it('201 — HOST gets presigned upload URL', async () => {
        const res = await api().post('/api/storage/presign')
          .set('Authorization', bearer(hostTok))
          .send({ filename: 'photo.jpg', mimeType: 'image/jpeg' })
          .expect(201);
        expect(res.body).toMatchObject({
          uploadUrl: expect.any(String),
          publicUrl: expect.any(String),
          key: expect.any(String),
          expiresIn: expect.any(Number),
        });
        expect(mockStorage.getPresignedUploadUrl).toHaveBeenCalledWith(
          expect.stringContaining('host-id-1'),
          'photo.jpg',
          'image/jpeg',
        );
      });

      it('201 — ADMIN gets presigned upload URL', async () => {
        const res = await api().post('/api/storage/presign')
          .set('Authorization', bearer(adminTok))
          .send({ filename: 'banner.png', mimeType: 'image/png' })
          .expect(201);
        expect(res.body).toHaveProperty('uploadUrl');
      });

      it('201 — uses custom folder when provided', async () => {
        await api().post('/api/storage/presign')
          .set('Authorization', bearer(hostTok))
          .send({ filename: 'photo.jpg', mimeType: 'image/jpeg', folder: 'custom/folder' })
          .expect(201);
        expect(mockStorage.getPresignedUploadUrl).toHaveBeenCalledWith(
          'custom/folder', 'photo.jpg', 'image/jpeg',
        );
      });

      it('401 — no token', () =>
        api().post('/api/storage/presign')
          .send({ filename: 'photo.jpg', mimeType: 'image/jpeg' }).expect(401));

      it('403 — GUEST role cannot presign', () =>
        api().post('/api/storage/presign')
          .set('Authorization', bearer(guestTok))
          .send({ filename: 'photo.jpg', mimeType: 'image/jpeg' }).expect(403));
    });

    describe('DELETE /api/storage/object', () => {
      it('200 — HOST deletes own object (key starts with listings/{userId}/)', async () => {
        const res = await api().delete('/api/storage/object')
          .set('Authorization', bearer(hostTok))
          .query({ key: 'listings/host-id-1/photo.jpg' })
          .expect(200);
        expect(res.body).toEqual({ success: true });
        expect(mockStorage.deleteObject).toHaveBeenCalledWith('listings/host-id-1/photo.jpg');
      });

      it('200 — HOST gets success:false when key does not belong to them', async () => {
        const res = await api().delete('/api/storage/object')
          .set('Authorization', bearer(hostTok))
          .query({ key: 'listings/other-host-id/photo.jpg' })
          .expect(200);
        expect(res.body).toEqual({ success: false, error: 'Forbidden' });
        expect(mockStorage.deleteObject).not.toHaveBeenCalled();
      });

      it('200 — ADMIN can delete any key regardless of prefix', async () => {
        const res = await api().delete('/api/storage/object')
          .set('Authorization', bearer(adminTok))
          .query({ key: 'listings/any-host-id/photo.jpg' })
          .expect(200);
        expect(res.body).toEqual({ success: true });
        expect(mockStorage.deleteObject).toHaveBeenCalledWith('listings/any-host-id/photo.jpg');
      });

      it('401 — no token', () =>
        api().delete('/api/storage/object')
          .query({ key: 'listings/host-id-1/photo.jpg' }).expect(401));

      it('403 — GUEST role cannot delete', () =>
        api().delete('/api/storage/object')
          .set('Authorization', bearer(guestTok))
          .query({ key: 'listings/host-id-1/photo.jpg' }).expect(403));
    });

    describe('GET /api/storage/stub/*key', () => {
      it('200 — public route returns SVG placeholder without auth', async () => {
        const res = await api().get('/api/storage/stub/listings/host-id-1/photo.jpg')
          .expect(200);
        // Response is an SVG string
        expect(typeof res.text).toBe('string');
        expect(res.text).toContain('svg');
      });

      it('200 — also works with a guest token', async () => {
        await api().get('/api/storage/stub/listings/host-id-1/photo.jpg')
          .set('Authorization', bearer(guestTok))
          .expect(200);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY — guard enforcement cross-checks
  // ══════════════════════════════════════════════════════════════════════════

  describe('Security — guard enforcement', () => {
    it('401 on every guarded route when Authorization header is absent', async () => {
      // Note: /api/pricing/quote is @Public() — intentionally excluded from this list
      const guardedRoutes: Array<[string, string]> = [
        ['POST', '/api/host/listings'],
        ['GET',  '/api/host/listings'],
        ['GET',  '/api/admin/listings/pending'],
        ['POST', '/api/admin/listings/listing-1/approve'],
        ['POST', '/api/holds'],
        ['POST', '/api/bookings'],
        ['GET',  '/api/bookings'],
        ['GET',  '/api/bookings/booking-1'],
        ['POST', '/api/payments/init'],
        ['GET',  '/api/admin/payouts/eligible'],
        ['POST', '/api/admin/payouts/run-weekly'],
        ['GET',  '/api/host/payouts/statements'],
      ];

      for (const [method, path] of guardedRoutes) {
        const req = method === 'GET'
          ? api().get(path)
          : api().post(path).send({});
        await req.expect(401);
      }
    });

    it('public routes return 2xx without any token', async () => {
      await api().get('/api/listings').expect(200);
      await api().get('/api/listings/listing-1').expect(200);
      // Webhook is public — no auth needed
      await api().post('/api/payments/webhook')
        .set('x-razorpay-signature', 'sig').send('{}').expect(201);
      // Storage stub endpoint is public
      await api().get('/api/storage/stub/listings/host-id-1/photo.jpg').expect(200);
    });

    it('storage presign and delete return 401 without token', async () => {
      await api().post('/api/storage/presign')
        .send({ filename: 'photo.jpg', mimeType: 'image/jpeg' }).expect(401);
      await api().delete('/api/storage/object')
        .query({ key: 'listings/host-id-1/photo.jpg' }).expect(401);
    });
  });
});
