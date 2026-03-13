# Decision Log

## 2026-02-24 - Initial defaults selected
- Project name: Dhyana Stays
- Country: India
- Currency: INR
- Timezone: Asia/Kolkata
- Language: English
- Frontend: Next.js (TypeScript)
- Backend: NestJS (TypeScript)
- DB: PostgreSQL
- Cache/Jobs: Redis + BullMQ (to be added in next iteration)
- Search: Meilisearch
- Storage: S3-compatible + CDN
- Payments: Razorpay

## 2026-02-24 - Auth policy default
- Self-registration allowed for `GUEST` and `HOST` only.
- `ADMIN` users are provisioned out-of-band (safer default to avoid privilege escalation).

## 2026-02-24 - Re-approval trigger default
- Listing edits to location fields (`city`, `state`, `country`) and core content (`description`) trigger re-approval.
- Trade-off: stricter moderation and less risk of policy bypass vs slower host iteration.
## 2026-02-25 - Local production test profile
- Added explicit local production env file support in API config resolution order (.env.production.local, .env.production, .env.local, .env).
- Added startup env validation (Joi) to fail fast on missing secrets and infrastructure URLs.
- Added root scripts for local production preparation, migration, seed, and process start.

## 2026-03-03 - Auth0 integration (dual-mode)
- **Decision**: Integrate Auth0 as the identity provider while keeping the existing custom JWT auth as a fallback.
- **Approach**: Dual-mode — Auth0 JWKS (RS256) when `AUTH0_DOMAIN` env var is set; existing HS256 + argon2 otherwise.
- **Rationale**: 
  - Auth0 provides enterprise-grade security (MFA, social login, brute-force protection) without building it ourselves.
  - Dual-mode preserves backward compatibility — all 234 existing tests continue to pass without Auth0 credentials.
  - Custom JWT mode remains the default for local dev and CI.
- **Schema changes**: `User.passwordHash` made nullable (`String?`); `User.auth0Sub String? @unique` added.
- **Migration**: `0002_auth0` — non-breaking ALTER TABLE (adds column, drops NOT NULL constraint).
- **Role management**: Auth0 Action injects `https://dhyanastays.in/role` custom claim into access token.
- **Sync endpoint**: `POST /auth/sync` upserts user in our DB after Auth0 login (find by auth0Sub → email → create).
- **Frontend**: `@auth0/auth0-react` v2 used for SPA Auth0 integration; `setTokenGetter` plugs Auth0 token into all API calls.
- **Packages added**: `jwks-rsa` (backend), `@auth0/auth0-react` (frontend).
- **Setup guide**: `docs/auth0-setup.md`.

## 2026-02-26 - Notification provider default: stub
- Default `EMAIL_PROVIDER=stub` and `SMS_PROVIDER=stub` — logs to console, no external calls.
- Trade-off: zero setup friction for dev vs no real emails. Safe default — booking flow never blocked by notification failure (all sends are `void` fire-and-forget).
- Recommended production upgrade path: Resend (email) + MSG91 (SMS India).

## 2026-02-26 - Storage provider default: stub
- Default `STORAGE_PROVIDER=stub` — presign returns localhost URL, no S3 calls.
- Trade-off: hosts cannot upload real images until configured. Acceptable for Phase 1 dev.
- Recommended production upgrade path: Cloudflare R2 (zero egress, S3-compatible, cheaper than AWS S3 for India traffic).
- SigV4 signing implemented with Node.js built-in `crypto` — no `@aws-sdk` dependency to keep bundle lean.

## 2026-02-26 - nodemailer version pinned to v6
- nodemailer v8 is ESM-only and incompatible with NestJS CommonJS module system.
- Pinned to `nodemailer@6` (latest CJS-compatible version) + `@types/nodemailer`.
- Will revisit when NestJS moves to ESM or nodemailer ships a CJS-compatible v8.

## 2026-02-26 - MEILI_URL/MEILI_MASTER_KEY made optional
- Changed from `Joi.string().uri().required()` to `Joi.string().allow('').default(...)`.
- Rationale: Meilisearch is not required for Phase 1 core booking flow. Startup should not fail if Meili is not running.
- Search falls back to PostgreSQL ILIKE queries when Meili is not configured.

## 2026-02-26 - DATABASE_URL validator relaxed
- Changed from `Joi.string().uri().required()` to `Joi.string().required()`.
- Rationale: Prisma connection strings with `?schema=public` or `?sslmode=require` are valid but fail Joi's strict URI parser.

## 2026-07-15 - Local infrastructure setup (Windows native)
- PostgreSQL 16 installed via winget (`PostgreSQL.PostgreSQL.16`), running as Windows service `postgresql-x64-16` on port 5432.
- Postgres superuser password: `postgres` (dev only — never use in production).
- DB user `dhyana` / password `dhyana` / database `dhyana_stays` created.
- Redis: tporadowski/redis v5.0.14 extracted to `C:\redis\`, started via `Start-Process` with `redis.windows.conf`.
- Redis has no auth in dev (default config). Production must set `requirepass`.
- API started via `pnpm exec ts-node --project tsconfig.json src/main.ts` in a separate PowerShell window.
- Decision: Use native installs (not Docker) for local dev on Windows to avoid WSL2/Hyper-V dependency.
- Trade-off: Docker compose remains the canonical production/CI path; native is dev-only convenience.

## 2026-02-25 - Cancellation policy (locked)
- ≥48h before check-in → 100% refund
- <48h but >10h → 50% refund
- ≤10h → 0% refund
- Implemented in `PricingService.computeRefundAmount()`. Policy is locked per spec.

## 2026-02-25 - Platform commission rate (locked)
- 10% of booking total retained by platform.
- Host receives 90% of captured payment amount.
- Implemented as `PLATFORM_FEE_RATE = 0.10` constant in `PricingService`.
- Host share computed in `BookingService.confirmPayment()` as `Math.round(amount * 0.9)`.

## 2026-02-25 - Balance due date calculation
- Balance due = 48 hours before check-in date.
- Grace period for payment = 24 hours after balance due date.
- After grace period expires, booking is auto-cancelled by background job.
- Decision: 48h window gives guests enough time to pay while protecting host inventory.

## 2026-02-25 - Payout eligibility window
- Payout eligible = check-in date + 24 hours.
- Rationale: ensures guest has arrived and no immediate cancellation/no-show dispute.
- Weekly batch runs Monday 03:30 UTC to avoid peak traffic.

## 2026-02-25 - Razorpay stub mode
- When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are not set, RazorpayService runs in stub mode.
- Stub mode: `createOrder` returns a fake order ID, `verifyWebhookSignature` returns `true`.
- This allows local development and testing without real Razorpay credentials.
- Production MUST set all three: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

## 2026-02-25 - Idempotency strategy
- Payments: idempotency key (UUID) required on `POST /payments/init`. Same key returns existing record.
- Bookings: `holdId` is unique on the `Booking` table — same hold cannot create two bookings.
- Webhooks: `payment.captured` events check `payment.status === 'CAPTURED'` before processing.
- All idempotency checks happen before any state mutation.

## 2026-02-25 - Prisma JsonValue cast pattern
- `booking.priceSnapshot` is stored as Prisma `Json` type → typed as `JsonValue` after generate.
- Cast pattern: `booking.priceSnapshot as unknown as PriceSnapshot` (double cast via `unknown`).
- This is intentional and safe: the snapshot is always written by our own `PricingService.quote()`.
- Alternative considered: store snapshot as a separate typed table — rejected for Phase 1 (over-engineering).

## 2026-02-25 - Background job schedule
- Hold expiry: every 1 minute (cron `* * * * *`) — short TTL requires frequent checks.
- Balance due + auto-cancel: every 15 minutes — acceptable latency for balance transitions.
- Payout eligibility: every 1 hour — low urgency, reduces DB load.
- Weekly payout batch: Monday 03:30 UTC — off-peak, gives weekend bookings time to settle.

## 2026-02-25 - Phase 1 test strategy
- Unit tests only for Phase 1 (no integration tests requiring live DB).
- All Prisma calls mocked via plain object `as any` pattern.
- Rationale: fast CI, no DB dependency, covers all business logic paths.
- Integration tests (with real DB) deferred to Phase 1.5 / pre-production hardening.
- Concurrency test: documented in `docs/testing.md` as manual reproduction steps.
