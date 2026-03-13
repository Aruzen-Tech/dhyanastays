# Testing Guide

## Overview

Two test layers — no database, Redis, or external services required for either:

- **Unit tests** (`src/**/*.spec.ts`) — isolated service logic, all dependencies mocked
- **E2E tests** (`test/app.e2e-spec.ts`) — full HTTP request/response via `@nestjs/testing` + supertest, all services mocked

Mocking strategy: plain object mocks cast via `as any` (Prisma client types are generated; IDE may show false positives before `prisma generate` runs). Global `fetch` is mocked via `jest.spyOn(global, 'fetch')` for notification/storage provider tests.

## Running Tests

```bash
# Unit tests (from repo root)
pnpm --filter @dhyana/api test

# Unit tests with coverage
pnpm --filter @dhyana/api test:cov

# Unit tests — force exit (useful in CI / Windows)
pnpm --filter @dhyana/api test -- --forceExit

# E2E tests
cd apps/api
npx jest --config jest-e2e.config.json --forceExit --no-coverage

# All tests in one pass (unit + E2E)
cd apps/api
npx jest --passWithNoTests --forceExit --no-coverage
npx jest --config jest-e2e.config.json --forceExit --no-coverage
```

## Unit Test Suites

| Suite | File | Tests | What is covered |
|---|---|---|---|
| AuthService | `src/auth/auth.service.spec.ts` | 4 | register, login, refresh, logout |
| ListingService | `src/listing/listing.service.spec.ts` | 8 | create, update, re-approval trigger, admin review |
| PricingService | `src/pricing/pricing.service.spec.ts` | 14 | quote calculation, seasonal rates, refund policy |
| BookingService | `src/booking/booking.service.spec.ts` | 10 | state machine, idempotency, cancellation, balance-due |
| PaymentService | `src/payment/payment.service.spec.ts` | 14 | init, idempotency, webhook sig verify, captured/failed events |
| NotificationService | `src/notification/notification.service.spec.ts` | 36 | all 6 provider branches, fallback-to-stub, error swallowing, 5 templates |
| StorageService | `src/storage/storage.service.spec.ts` | 33 | stub/s3/r2 presign (SigV4), deleteObject, buildPublicUrl, mime-to-ext |

**Unit total: 109 tests, 7 suites — all passing.**

## E2E Test Suite

| Module | Tests | What is covered |
|---|---|---|
| Auth | 16 | register/login/refresh/logout — happy path, 400, 401 |
| Listings | 30 | host CRUD, admin approval workflow, public feed, 401/403/400 |
| Pricing | 5 | quote — happy path, public route, 400 |
| Holds | 6 | create — GUEST only, 401/403/400 |
| Bookings | 18 | create/get/cancel/complete — GUEST/ADMIN, 401/403/400/404 |
| Payments | 12 | init, webhook (public), pay-balance — 401/403/400 |
| Payouts | 14 | eligible/run-weekly/batches/mark-paid/statements — ADMIN/HOST, 401/403 |
| Storage | 13 | presign HOST/ADMIN/GUEST/401, delete own/foreign/admin/GUEST/401, stub GET public |
| Security | 2 | 401 sweep (all guarded routes), public routes 2xx sweep |

**E2E total: 125 tests, 1 suite — all passing.**

## Grand Total: 234/234 tests passing

## Key Test Cases

### Pricing
- 3-night base rate: `3 × 5000 + 500 cleaning + 10% platform fee = 17050`
- Seasonal rate override applied per-night
- `computeRefundAmount`: ≥48h → 100%, <48h >10h → 50%, ≤10h → 0%
- Edge cases: exact 48h boundary, odd amounts (Math.round)

### Booking State Machine
- `createBooking`: HOLD → PAYMENT_PENDING (FULL and DEPOSIT_50 plans)
- `DEPOSIT_50`: `balanceDueAt` = 48h before check-in
- Expired hold → `BadRequestException`
- Wrong guest → `ForbiddenException`
- Idempotency: same holdId returns existing booking without re-creating
- `transitionToBalanceDue`: bulk-updates CONFIRMED_DEPOSIT → BALANCE_DUE
- `cancelBooking`: 100% refund (≥48h), 0% refund (≤10h), access control, COMPLETED guard

### Payment / Webhook
- `initPayment`: FULL uses `snapshot.total`, DEPOSIT uses `snapshot.depositAmount`
- Idempotency: same key returns existing payment record
- Idempotency key collision on different booking → `BadRequestException`
- Webhook: invalid signature → `UnauthorizedException`
- `payment.captured`: updates payment to CAPTURED, calls `bookingService.confirmPayment`
- `payment.captured` already CAPTURED → skipped (idempotent)
- `payment.failed`: updates payment to FAILED
- Unknown event type → `{ received: true }` without error

### Razorpay Signature Verification
- Valid HMAC-SHA256 → `true`
- Tampered body → `false`
- Stub mode (no credentials) → `true` with warning log

## Concurrency / Double-Booking
The hold → booking conversion uses a Prisma `$transaction`. The `Hold` table has a unique constraint on `(listingId, startsAt, endsAt)` and the `Booking` table enforces `holdId` uniqueness. Under concurrent requests for the same hold, only one transaction will succeed; the second will receive a unique constraint violation.

To reproduce locally (requires running DB):
```bash
# Start services
docker-compose up -d

# Run migration + seed
pnpm --filter @dhyana/api prisma:migrate
pnpm --filter @dhyana/api seed

# Start API
pnpm --filter @dhyana/api start:dev

# Simulate concurrent hold conversion (two simultaneous POST /api/bookings with same holdId)
# Only one should succeed with 201; the other should receive 409 or the existing booking (idempotent)
```

## CI Script

```bash
# Lint + test in one pass
pnpm --filter @dhyana/api lint
pnpm --filter @dhyana/api test -- --forceExit --ci
```

## Adding New Tests

1. Place spec files alongside the service: `src/<module>/<service>.spec.ts`
2. Mock all Prisma calls with plain objects cast `as any`
3. Never import `PrismaService` directly in tests — use the mock pattern
4. For new state machine transitions, add a test case per valid and invalid transition
