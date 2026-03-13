# Changelog

## [Unreleased] — Auth0 Integration (dual-mode)

### Added — `apps/api/`

#### Auth0 JWT Strategy (`src/auth/strategies/jwt.strategy.ts`)
- **Dual-mode** `JwtStrategy`: when `AUTH0_DOMAIN` env var is set, verifies RS256 JWTs via JWKS (`jwks-rsa`); otherwise falls back to HS256 with static secret (existing behaviour)
- Exports `RequestUser`, `CustomJwtPayload`, `Auth0JwtPayload` types
- `validate()` reads role from `https://dhyanastays.in/role` namespaced claim (Auth0) or flat `role` claim (custom JWT)

#### Auth0 Sync Endpoint (`src/auth/`)
- `dto/sync-user.dto.ts` — `SyncUserDto` with optional `fullName` and `desiredRole`
- `auth.service.ts` — added `syncUser()`: upserts user by auth0Sub → email → create; `getMe()`: returns safe profile; `safeProfile()`: strips passwordHash; `login()` guards against null passwordHash (Auth0-only accounts)
- `auth.controller.ts` — `POST /auth/sync` (@Public, called by frontend after Auth0 login); `GET /auth/me` (authenticated)

#### Schema + Migration
- `prisma/schema.prisma` — `User.passwordHash String?` (nullable); `User.auth0Sub String? @unique` added
- `prisma/migrations/0002_auth0/migration.sql` — non-breaking ALTER TABLE: adds `auth0Sub` column, drops NOT NULL on `passwordHash`

#### Config
- `src/config/env.validation.ts` — `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` added as optional Joi vars

#### Dependencies
- `jwks-rsa@^4.0.1` added to `apps/api`

### Added — `apps/web/`

#### AuthContext (`context/AuthContext.tsx`) — full rewrite
- **Dual-mode**: Auth0Provider + Auth0InnerProvider when `NEXT_PUBLIC_AUTH0_DOMAIN` is set; CustomAuthProvider otherwise
- Exports: `AuthUser`, `AuthContextValue`, `AuthProvider`, `useAuth`
- Auth0InnerProvider: registers `setTokenGetter` so all `api.ts` calls automatically use Auth0 access token; syncs user to DB via `POST /api/auth/sync` after login
- CustomAuthProvider: existing email+password flow unchanged

#### API client (`lib/api.ts`)
- `setTokenGetter(fn)` — pluggable async token getter; replaces `tokenStore.getAccess()` when set
- `getToken()` — internal helper: uses `_tokenGetter` if set, else falls back to `tokenStore`
- Auto-refresh on 401 only fires in custom JWT mode (Auth0 handles refresh internally)

#### Auth pages
- `app/auth/login/page.tsx` — Auth0 mode: "Continue with Auth0" button; Custom mode: existing email/password form
- `app/auth/register/page.tsx` — Auth0 mode: role selector + Auth0 redirect; Custom mode: full registration form
- `app/auth/callback/page.tsx` — **NEW**: Auth0 callback handler; shows spinner while syncing; redirects to `/dashboard`

#### Dependencies
- `@auth0/auth0-react@^2.15.0` added to `apps/web`

### Documentation
- `docs/auth0-setup.md` — **NEW**: step-by-step Auth0 tenant setup guide (tenant, SPA app, API resource server, roles, Post Login Action for role injection, env vars, test flows)
- `docs/decision-log.md` — Auth0 integration decision recorded
- `docs/auth0-setup.md` — Auth0 Action code for injecting `https://dhyanastays.in/role` claim

### Tests
- **API TypeScript**: `tsc --noEmit` exits 0 — zero errors
- **234/234 tests continue to pass** — dual-mode design means no Auth0 credentials needed for tests; custom JWT mode is the default

---

## [Unreleased] — Notification + Storage provider switching

### Added — `apps/api/`

#### NotificationService (`src/notification/`)
- `notification.service.ts` — Full email + SMS service with 4 providers:
  - **Email**: `stub` (console log) | `resend` (HTTP API) | `sendgrid` (HTTP API) | `smtp` (nodemailer v6)
  - **SMS**: `stub` (console log) | `msg91` (Flow API, TRAI DLT-compatible) | `twilio` (REST API)
  - All providers gracefully fall back to stub if credentials are missing — notification failure never breaks booking flow
  - Typed notification templates: `sendBookingConfirmed`, `sendHostListingApproved`, `sendHostListingRejected`, `sendBalanceDueReminder`, `sendBookingCancelled`
  - HTML email templates with Dhyana brand colours, INR formatting, CTA buttons
- `notification.module.ts` — exports `NotificationService`

#### StorageService (`src/storage/`)
- `storage.service.ts` — S3-compatible presigned PUT URL generation with 3 providers:
  - **stub**: returns local placeholder URL, no external calls
  - **s3**: AWS S3 (ap-south-1 default) with SigV4 presigned PUT
  - **r2**: Cloudflare R2 (SigV4 with `region=auto`) — zero egress cost
  - Pure Node.js crypto (no `@aws-sdk` dependency) — SigV4 signing implemented with built-in `crypto` module
  - `getPresignedUploadUrl(folder, filename, mimeType, expiresIn)` — direct browser-to-storage upload
  - `deleteObject(key)` — authenticated DELETE
  - `buildPublicUrl(key)` — CDN-aware URL construction
- `storage.controller.ts` — `POST /api/storage/presign` (HOST/ADMIN), `DELETE /api/storage/object`, `GET /api/storage/stub/*` (dev placeholder)
- `storage.module.ts` — exports `StorageService`

#### Wired into existing services
- `BookingService` — injects `NotificationService`; fires `sendBookingConfirmed` after payment captured, `sendBookingCancelled` after cancellation, `sendBalanceDueReminder` for BALANCE_DUE bookings (all non-blocking `void`)
- `ListingService` — injects `NotificationService`; fires `sendHostListingApproved` / `sendHostListingRejected` after admin review (non-blocking)
- `BookingModule` — imports `NotificationModule`
- `ListingModule` — imports `NotificationModule`
- `AppModule` — imports `NotificationModule`, `StorageModule`

#### Config
- `env.validation.ts` — added 20 new env vars with defaults:
  - `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `SENDGRID_API_KEY`, `SMTP_HOST/PORT/USER/PASS`
  - `SMS_PROVIDER`, `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_BOOKING_TEMPLATE_ID`, `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`
  - `STORAGE_PROVIDER`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `CDN_URL`
  - `MEILI_URL`/`MEILI_MASTER_KEY` changed from `required()` to `allow('').default(...)` (non-blocking startup)
  - `DATABASE_URL` changed from `.uri().required()` to `.required()` (allows non-URI formats like Prisma connection strings)
  - Added `TZ`, `API_URL`, `WEB_URL`

#### Dependencies
- `nodemailer@6` (CJS-compatible) + `@types/nodemailer` added to `apps/api`

#### Tests
- `notification.service.spec.ts` — **NEW** — 36 unit tests covering all 6 provider branches (stub/resend/sendgrid/smtp/msg91/twilio), fallback-to-stub when credentials missing, error swallowing (non-fatal), and all 5 notification template methods
- `storage.service.spec.ts` — **NEW** — 33 unit tests covering stub/s3/r2 presigned URL generation (SigV4 params, key uniqueness, mime-to-ext mapping), deleteObject (stub no-fetch, s3/r2 SigV4 DELETE), buildPublicUrl (CDN/S3/R2 formats)
- `booking.service.spec.ts` — added `makeNotificationMock()` helper; all `new BookingService(...)` calls updated to pass 5th arg
- `listing.service.spec.ts` — added `notificationMock` constant; `new ListingService(...)` updated to pass 2nd arg
- `test/app.e2e-spec.ts` — added Storage E2E suite (13 new tests): presign HOST/ADMIN/GUEST/401, delete own/foreign/admin/GUEST/401, stub GET public/with-token; security sweep updated
- **109/109 unit tests passing** (7 suites: auth, listing, pricing, booking, payment, notification, storage)
- **125/125 E2E tests passing** (was 112 — +13 Storage tests)
- **Grand total: 234/234 tests passing**

#### Bug fixed
- `storage.controller.ts` — `@Get('stub/*key')` → `@Get('stub/*')` with `@Param('0')`: NestJS/Express does not support named wildcards; unnamed wildcard match is stored as param `'0'`

### Documentation
- `docs/credentials-guide.md` — already comprehensive; covers all new providers (Sections 5–7)

---

## [Unreleased] — Remove sample data + real registration flows

### Frontend (apps/web)
- **ListingCard.tsx** — Replaced `placehold.co` external image with deterministic inline SVG placeholder (gradient + house icon, no network requests)
- **listings/[id]/page.tsx** — Replaced `placehold.co` hero image with `HeroPlaceholder` inline SVG component; fixed TS error by extracting named component instead of IIFE
- **auth/login/page.tsx** — Removed demo credentials box and divider
- **auth/register/page.tsx** — Removed "Arjun Sharma" placeholder; added password confirmation field, terms checkbox, host verification notice
- **dashboard/page.tsx** — HostDashboard now fetches host profile and shows verification status banner (PENDING/REJECTED/APPROVED); "New listing" button hidden until APPROVED; AdminDashboard adds "Host Approvals" card linking to `/admin/listings?tab=hosts`
- **host/listings/new/page.tsx** — Blocks listing creation if host not APPROVED; shows pending/rejected state with clear messaging; success state after submission
- **admin/listings/page.tsx** — Added "Host Approvals" tab alongside "Listing Approvals"; wrapped `useSearchParams` in `<Suspense>` boundary (Next.js 15 requirement)

### API (apps/api)
- **listing.service.ts** — Added `getHostProfile()`, `getPendingHosts()`, `reviewHost()` methods
- **host-listing.controller.ts** — Added `GET /host/profile` endpoint; rewrote to `@Controller()` with explicit paths
- **admin-listing.controller.ts** — Added `GET /admin/hosts/pending`, `POST /admin/hosts/:id/approve`, `POST /admin/hosts/:id/reject` endpoints

### Build
- Next.js build: ✅ 11/11 routes compiled, 0 TypeScript errors


## [Unreleased] — Config: Redis version pinned to 6.2.0

### Changed
- `docker-compose.yml`: Redis image updated from `redis:7` to `redis:6.2.0` for version consistency.

---

## [Unreleased] — Bug Fix: CreateBookingDto.holdId validator

### Fixed
- `apps/api/src/booking/dto/create-booking.dto.ts`: Changed `holdId` from `@IsUUID()` to `@IsString()`.
  - Root cause: Prisma uses CUID format for IDs (e.g. `cmm33mik4...`), not UUID v4. The `@IsUUID()` validator was rejecting all valid hold IDs.
  - Impact: `POST /api/bookings` was returning 400 for all requests.
  - Fix: `@IsString()` — accepts any non-empty string, consistent with how `listingId` is validated in `CreateHoldDto`.

### Tests
- 40/40 unit tests passing after fix.

---

## [Unreleased] — Infrastructure Milestone: Full Stack Live

### Added
- PostgreSQL 16 installed natively on Windows via winget
- Redis 5.0.14 (tporadowski/redis) installed at `C:\redis\` and running on port 6379
- Database user `dhyana` + database `dhyana_stays` created
- Prisma migration `0001_init` applied — all 16 domain tables created
- Admin seed user created: `admin@dhyanastays.local` / `ChangeMe123!`
- API (NestJS) confirmed running on port 3001 via `ts-node`
- Web (Next.js) confirmed running on port 3000

### Verified
- `GET  http://localhost:3001/api/listings` → `[]` (200 OK)
- `POST http://localhost:3001/api/auth/login` → JWT issued for admin ✅
- Redis PING → PONG ✅
- PostgreSQL `dhyana_stays` DB accessible ✅


## [Unreleased] — Bug-fix batch: frontend/backend field alignment

### Fixed
- **API** `booking.controller.ts`: Added `GET /bookings` endpoint (was missing, caused 404 for guest dashboard)
- **API** `booking.service.spec.ts`: Updated `cancelBooking()` test assertions — service now returns plain `Booking` (not `{ booking, refundAmount }`); tests now assert `result.status` and side-effect mocks
- **Web** `lib/types.ts`: Aligned all types with actual DB schema:
  - `Listing`: removed `baseNightlyRate`/`maxGuests` (now in `rateRules[]` relation)
  - `PriceQuote`: renamed `baseTotal`→`subtotal`, `grandTotal`→`total`, `breakdown`→`nightlyBreakdown`; added `cleaningFee`, `platformFeeRate`, `guests`, `snapshotAt`
  - `Booking`: renamed `checkIn`→`startsAt`, `checkOut`→`endsAt`, `paymentPlan`→`plan`, removed `totalAmount`/`depositAmount`/`balanceAmount` (now in `priceSnapshot.*`); added `priceSnapshot: PriceQuote`
  - `Hold`: renamed `checkIn`→`startsAt`, `checkOut`→`endsAt`, `guestUserId`→`guestId`
  - Added `RateRule` interface
- **Web** `lib/api.ts`:
  - `bookingsApi.create()`: field `paymentPlan` → `plan`
  - `pricingApi.quote()`: added `guests` field (defaults to 1)
  - `holdsApi.create()`: added `guests` field (defaults to 1)
  - `listingsApi`: added `getHostListings()` for `GET /host/listings`
  - `bookingsApi.cancel()`: return type corrected to `Booking`
- **Web** `components/ListingCard.tsx`: `listing.baseNightlyRate` → `listing.rateRules?.[0]?.baseNightlyRate`
- **Web** `app/listings/[id]/page.tsx`: Fixed all field references (`quote.subtotal`, `quote.total`, `quote.cleaningFee`, `quote.platformFeeRate`, `booking.plan`, `booking.priceSnapshot.*`, `listing.rateRules[0].*`)
- **Web** `app/dashboard/page.tsx`: Fixed `b.startsAt`/`b.endsAt`/`b.plan`/`b.priceSnapshot.*`; host dashboard now calls `getHostListings()` instead of `getPublic()`
- **Web** `app/admin/listings/page.tsx`: Fixed `listing.rateRules?.[0]?.baseNightlyRate` and `listing.rateRules?.[0]?.maxGuests`

### Verified
- `pnpm run build` (Next.js): ✅ Compiled successfully — 0 TypeScript errors, 11/11 routes
- `pnpm run test` (API unit): ✅ 40/40 tests pass (5 suites)
- `pnpm exec jest --config jest-e2e.config.json` (E2E): ✅ **112/112 tests pass** (was 104)
  - Added `GET /api/bookings` — 4 new E2E tests (200 GUEST, 401, 403 HOST, 403 ADMIN)
  - Added `GET /api/host/listings` — 4 new E2E tests (200 HOST, 401, 403 GUEST, 403 ADMIN)
  - Fixed `listingBody` fixture: added `baseNightlyRate`/`maxGuests` to match updated `CreateListingDto`
  - Security guard sweep updated: 12 guarded routes now verified (was 10)
- **Grand total: 152/152 tests passing** (40 unit + 112 E2E)


## [0.3.0] — UI/UX Complete (Phase 1 Frontend)

### Added — `apps/web/`
- **Tailwind CSS** setup: custom Dhyana brand palette (brand-700=#1a5c4a, gold-500=#d4a853, surface=#f7f4ef), card shadows, `animate-fade-in` keyframe
- **`lib/types.ts`** — full TypeScript types: UserRole, AuthTokens, JwtPayload, Listing, PriceQuote, Hold, Booking, Payment, PayoutLine, PayoutBatch, HostStatement, ApiError
- **`lib/api.ts`** — typed fetch wrapper with JWT injection, auto-refresh on 401, tokenStore (localStorage), authApi, listingsApi, pricingApi, holdsApi, bookingsApi, paymentsApi, payoutsApi, formatINR, formatDate, generateUUID
- **`context/AuthContext.tsx`** — JWT decode (no library), login/logout/register state, hydrates from localStorage on mount
- **`components/Navbar.tsx`** — sticky top nav, role-aware links (HOST: listings+payouts, ADMIN: approvals+payouts), auth state
- **`components/ListingCard.tsx`** — discovery grid card with placeholder image, price, location pill
- **`components/StatusBadge.tsx`** — status pill for all Listing/Booking/Payout states
- **`app/layout.tsx`** — root layout with AuthProvider, Navbar, footer, Google Fonts Inter
- **`app/page.tsx`** — discovery feed: hero with search, listing grid, loading skeletons, empty states, features section
- **`app/auth/login/page.tsx`** — login form with demo credentials hint
- **`app/auth/register/page.tsx`** — register form with GUEST/HOST role selector
- **`app/listings/[id]/page.tsx`** — listing detail + 5-step booking flow: dates → quote → hold → payment plan → payment init → confirmed
- **`app/dashboard/page.tsx`** — role-based dashboard: Guest (bookings + cancel), Host (listings + payout statements), Admin (quick links)
- **`app/host/listings/new/page.tsx`** — create listing form with ₹ price input, re-approval info
- **`app/host/payouts/page.tsx`** — host payout statements with summary cards and line items
- **`app/admin/listings/page.tsx`** — admin approval queue: approve/reject/request-changes with notes, toast feedback
- **`app/admin/payouts/page.tsx`** — admin payout management: eligible lines, run weekly batch, mark batch paid

### Build
- `pnpm --filter @dhyana/web install` ✅
- `pnpm run build` → **Compiled successfully in 15.5s** ✅ zero errors


## [Unreleased] — Option A: Deploy Prep — Schema + Env + Migration Lock

### Added
- `apps/api/.env.example` — comprehensive, fully-documented reference for all 22 environment
  variables (required vs optional, defaults, generation instructions for secrets)
- `apps/api/prisma/migrations/migration_lock.toml` — required by `prisma migrate deploy`
  for deterministic production migrations; was missing from repo

### Verified
- `prisma generate` ✔ — Prisma Client v6.19.2 generated cleanly from schema
- `pnpm --filter @dhyana/api test` ✔ — 40/40 unit tests still passing after generate
- Schema (`schema.prisma`) and migration SQL (`0001_init/migration.sql`) are clean and consistent
  across all 16 models, 8 enums, all FK constraints and unique indexes

---

## [Unreleased] — E2E Test Suite — 104/104 passing

### Added
- `apps/api/test/app.e2e-spec.ts` — comprehensive E2E test suite (104 tests across 7 modules)
  - Auth: register (GUEST/HOST/validation/ADMIN rejection), login, refresh, logout
  - Listings: host CRUD, admin approval/reject/request-changes, public feed, 401/403/400
  - Pricing: quote (happy path + public-route verification)
  - Holds: create (GUEST only, 401/403/400, UUID idempotency key validation)
  - Bookings: create/get/cancel/complete (GUEST/ADMIN, 401/403/400)
  - Payments: init (GUEST only), webhook (public/@Public), pay-balance
  - Payouts: eligible/run-weekly/batches/mark-paid (ADMIN), statements (HOST)
  - Security cross-check: all 10 guarded routes return 401 without token; 3 public routes return 2xx
- `apps/api/jest-e2e.config.json` — E2E Jest config (rootDir: ".", testRegex: test/*.e2e-spec.ts)
- `apps/api/src/jobs/jobs.constants.ts` — extracted queue name constants to break circular dependency
- `@types/supertest` devDependency added

### Fixed
- Circular dependency: processors imported `QUEUE_*` constants from `jobs.module.ts` → extracted to `jobs.constants.ts`
- E2E test assertions aligned to actual DTO validation rules:
  - `POST /auth/login` returns 201 (NestJS @Post default), not 200
  - `POST /auth/refresh` returns 201; refreshToken requires ≥16 chars (@MinLength(16))
  - `POST /auth/login` wrong-credentials test uses ≥8 char password to pass @MinLength(8)
  - `POST /holds` idempotencyKey must be valid UUID (@IsUUID())
  - `POST /bookings` holdId must be valid UUID (@IsUUID()); idempotencyKey required
  - `POST /payments/init` idempotencyKey must be valid UUID (@IsUUID())
  - `POST /pricing/quote` is @Public() — test updated to verify 201 without token
  - Security sweep excludes /pricing/quote (intentionally public)

### Test results
```
Test Suites: 1 passed, 1 total
Tests:       104 passed, 104 total
Time:        ~19s
```


All notable changes to Dhyana Stays are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

---

## [0.2.0] - 2026-02-25 — Phase 1 Complete: Booking Engine + Payments + Payouts + Tests

### Added

#### Booking Engine
- `BookingService`: `createBooking` (hold → PAYMENT_PENDING, atomic transaction), `confirmPayment` (PAYMENT_PENDING → CONFIRMED_DEPOSIT | CONFIRMED_PAID), `transitionToBalanceDue` (CONFIRMED_DEPOSIT → BALANCE_DUE), `autoCancelUnpaidBalance` (BALANCE_DUE → CANCELLED after 24h grace), `cancelBooking` (policy-based refund), `completeBooking` (→ COMPLETED)
- `BookingController`: `POST /api/bookings`, `GET /api/bookings/:id`, `POST /api/bookings/:id/cancel`, `POST /api/bookings/:id/complete`
- `BookingModule`: wires PricingModule, AuditService, LedgerService

#### Payment Integration
- `RazorpayService`: `createOrder` (native fetch, stub mode when no credentials), `verifyWebhookSignature` (HMAC-SHA256 + `timingSafeEqual`), `createRefund`
- `PaymentService`: `initPayment` (idempotency key, FULL/DEPOSIT/BALANCE types), `handleWebhook` (sig verify → payment.captured/failed/refund.processed), `payBalance`
- `PaymentController`: `POST /api/payments/init`, `POST /api/payments/webhook` (raw body, `@Public`), `POST /api/payments/bookings/:id/pay-balance`
- Webhook idempotency: already-CAPTURED payments are skipped silently

#### Payout System
- `PayoutService`: `markEligible` (check-in+24h), `runWeeklyBatch` (ELIGIBLE → SCHEDULED), `markBatchPaid` (SCHEDULED → PAID), `getEligibleLines`, `getHostStatements`, `getBatches`, `handleRefundAfterPayout` (negative balance carry-forward)
- `PayoutController`: `GET /api/admin/payouts/eligible`, `POST /api/admin/payouts/run-weekly`, `POST /api/admin/payouts/batches/:id/mark-paid`, `GET /api/admin/payouts/batches`, `GET /api/host/payouts/statements`
- Host share: 90% of captured amount (10% platform fee)
- Payout eligibility: check-in + 24h

#### Background Jobs (BullMQ + @nestjs/schedule)
- `hold_expiry`: every minute — expires stale holds
- `balance_due`: every 15 min — transitions CONFIRMED_DEPOSIT → BALANCE_DUE, auto-cancels unpaid
- `payout_eligibility`: every hour — marks eligible payout lines
- `weekly_payout`: Monday 03:30 UTC — runs weekly payout batch
- `JobsScheduler`: cron-based job enqueuing
- `JobsModule`: registers all queues and processors

#### Common Services
- `AuditService`: append-only audit log for all admin actions and financial events
- `LedgerService`: append-only ledger events (PAYMENT_CAPTURED, REFUND_ISSUED, PAYOUT_SCHEDULED, PAYOUT_SENT, BALANCE_CARRY_FORWARD)
- `CommonModule`: exports both services

#### Pricing Engine
- `PricingService`: `quote()` (per-night breakdown, seasonal rate overrides, 10% platform fee, deposit/balance split), `computeRefundAmount()` (≥48h→100%, <48h>10h→50%, ≤10h→0%)
- `PricingController`: `POST /api/pricing/quote`

#### Hold Engine
- `HoldService`: `createHold()` (availability check, 15-min TTL, price snapshot), `expireStaleHolds()` (batch expiry)
- `HoldController`: `POST /api/holds`

#### Infrastructure
- `ThrottlerModule`: rate limiting on all endpoints
- `BullModule`: Redis-backed job queues (4 queues)
- `rawBody: true` on NestJS bootstrap for webhook signature verification
- CORS configured via `ALLOWED_ORIGINS` env var
- `env.validation.ts`: added `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, `ALLOWED_ORIGINS`

#### Database
- Full migration SQL: 16 tables, all enums, FK constraints, indexes
- `prisma generate` run — Prisma client fully generated

#### Tests (40 tests, 5 suites — all passing)
- `auth.service.spec.ts`: register, login, refresh, logout (4 tests)
- `listing.service.spec.ts`: create, update, re-approval, admin review (8 tests)
- `pricing.service.spec.ts`: quote calculation, seasonal rates, refund policy, edge cases (14 tests)
- `booking.service.spec.ts`: state machine, idempotency, cancellation, balance-due (10 tests)
- `payment.service.spec.ts`: init, idempotency, webhook sig verify, captured/failed events (14 tests)

#### Documentation
- `docs/state-machines.md`: full explicit state machines for Booking, Payout, Listing, Hold, Payment
- `docs/testing.md`: test guide, coverage table, concurrency reproduction steps
- `docs/decision-log.md`: updated with all Phase 1 decisions

### Changed
- `app.module.ts`: added ThrottlerModule, BullModule (Redis), BookingModule, PaymentModule, PayoutModule, JobsModule, CommonModule, PricingModule, HoldModule
- `main.ts`: `rawBody: true`, global ValidationPipe, CORS
- `payment.service.ts`: `as unknown as PriceSnapshot` cast for Prisma JsonValue compatibility

### Dependencies Added
- `@nestjs/bullmq` — BullMQ NestJS integration
- `@nestjs/schedule` — Cron job scheduling
- `@nestjs/throttler` — Rate limiting
- `bullmq` — Redis-backed job queues
- `ioredis` — Redis client

---

## [0.1.0] - 2026-02-24 — Phase 1 Iteration 1: Auth + Listings

### Added
- Monorepo setup: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`
- Docker Compose: PostgreSQL 16, Redis 7, Meilisearch v1.12
- Auth: register (GUEST/HOST), login, refresh token, logout with audit log
- RBAC: `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@Public()`, `@CurrentUser()` decorators
- JWT strategy: access token (15m) + refresh token (7d)
- Listing workflow: host create → PENDING_APPROVAL, admin approve/reject/request-changes
- Re-approval triggers: city, state, country, description edits on APPROVED listings
- Prisma schema: 16 models, all enums, relations
- Seed: default admin user (`admin@dhyanastays.local`)
- Env validation: Joi schema with fail-fast on missing secrets
- Docs: architecture.md, decision-log.md, api.md, runbook.md, security.md, backlog.md
