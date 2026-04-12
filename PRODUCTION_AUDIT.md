# Dhyana Stays — Production Readiness Audit

**Audit scope.** Full-stack review of the Dhyana Stays marketplace covering
authentication, payments, database integrity, state machines, background
jobs, API surface, DevOps, observability, search / performance, testing and
compliance — mapped against the twelve domains defined by the
`dhyana-stays-production` skill.

**Method.** Static source review of `apps/api` (NestJS 10 + Prisma + Postgres),
`apps/web` (Next.js 15), `infra/` and `.github/workflows/`. The sandbox did
not have a working `node_modules` tree for this copy of the repo (pnpm
content-addressable symlinks didn't survive the copy), so this audit is
static — findings were verified by cross-referencing unit specs, schema,
migrations and config sources.

**Outcome.** **15 findings** in total: 4 blockers fixed in-place during the
audit, 3 high-severity items deferred as follow-up work, 8 medium / low
items for the backlog. The codebase is **structurally sound and already
surprisingly production-shaped** — most of the remaining work is tightening
defence-in-depth, role modelling and observability rather than foundational
refactors.

---

## Top-level summary

| # | Domain                           | Status        | Blockers | High | Medium |
|---|----------------------------------|---------------|----------|------|--------|
| 1 | Auth & Security                  | GOOD          | 1 fixed  | 1    | 1      |
| 2 | Payment Security                 | GOOD          | 2 fixed  | 0    | 1      |
| 3 | Database Architecture            | GOOD          | 0        | 0    | 1      |
| 4 | State Machines                   | GOOD          | 0        | 0    | 1      |
| 5 | Background Jobs                  | GOOD          | 0        | 1    | 0      |
| 6 | API Design                       | GOOD          | 0        | 0    | 1      |
| 7 | DevOps & CI/CD                   | NEEDS WORK    | 1 fixed  | 0    | 2      |
| 8 | Monitoring                       | NEEDS WORK    | 0        | 1    | 1      |
| 9 | Search & Performance             | GOOD          | 0        | 0    | 0      |
|10 | Testing                          | OK            | 0        | 0    | 1      |
|11 | Compliance                       | NEEDS WORK    | 0        | 0    | 1      |

---

## Domain 01 — Auth & Security

**Status: Good.** Dual-mode (custom JWT or Auth0 / JWKS) is properly
implemented in `jwt.strategy.ts`, which throws at boot if `JWT_ACCESS_SECRET`
is missing. Login is Argon2id, and a Redis-backed sliding-window limiter
(`LoginRateLimiterService`) throttles credential stuffing with a 5 / 10 / 20
threshold progressive lockout. RBAC is enforced server-side via
`JwtAuthGuard` + `RolesGuard` + `AccessControlService` with resource
ownership checks, and `@Public()` is opt-in.

**Findings.**

1. **[BLOCKER — fixed]** `auth.service.ts#issueTokens` used
   `process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret'`, introducing a
   hardcoded fallback. The Joi env schema does catch this at boot in
   production, but the service itself would have happily signed tokens with a
   default secret if the schema were ever relaxed. **Fix applied:** the
   helper now throws if either secret is missing.

2. **[HIGH — follow-up]** Refresh tokens are stored in plaintext in
   `user.refreshToken`, and there is no rotation / family-tracking / theft
   detection. The `jwt-refresh-token-rotation` skill prescribes a rotating
   token-family model with replay detection. **Recommendation:** introduce
   a `RefreshToken` table (`id`, `userId`, `familyId`, `hash`, `createdAt`,
   `revokedAt`, `replacedById`) and rotate on every `/auth/refresh`; revoke
   the entire family on a reused-token signal.

3. **[MEDIUM — follow-up]** Role model only exposes `GUEST | HOST | ADMIN`
   (see `UserRole` in `schema.prisma`). The platform PDF (Section 2)
   describes a five-level admin hierarchy (Super / Operational / Cluster-
   Regional / Property-Level / Service-Level) and a distinction between
   Property Owner and Investor. This is an architectural gap, not a bug —
   consciously deferred.

---

## Domain 02 — Payment Security

**Status: Good.** `RazorpayService` wraps Razorpay's REST API with native
`fetch` (no SDK dependency), throws at boot when credentials are missing in
production, uses HMAC-SHA256 + `crypto.timingSafeEqual` for webhook
verification, and preserves the raw body via `main.ts`'s `rawBody: true`.
`PaymentService.handleWebhook` verifies the signature **before** JSON-parsing,
is idempotent on `payment.captured` (short-circuits when
`status === 'CAPTURED'`), and all state changes happen inside a Prisma
transaction alongside a ledger + audit write.

Client-side idempotency is enforced via a unique `Payment.idempotencyKey`
column plus the DB-backed `IdempotencyInterceptor` for the whole API.
Price snapshots are HMAC-signed by `PriceSnapshotSignerService` at quote
time and re-verified inside `PaymentService.initPayment` — tampered snapshots
are rejected with `BadRequestException('Price snapshot tampered')`.

**Findings.**

4. **[BLOCKER — fixed]** `RazorpayService.verifyWebhookSignature` passed
   `Buffer.from(signature, 'hex')` straight into `timingSafeEqual`. An
   attacker sending a non-hex or wrong-length `x-razorpay-signature` header
   would trigger a `RangeError`, surfacing as **HTTP 500** instead of the
   intended **401 Unauthorized**, and potentially masking the attack in
   logs. **Fix applied:** added explicit length + hex-charset guards before
   the comparison; malformed signatures now return `false` and the endpoint
   returns 401.

5. **[BLOCKER — fixed]** Notification messages in `booking.service.ts` at
   lines 348 / 492 / 607 formatted money as `₹${(snapshot.total / 100).toLocaleString('en-IN')}`.
   The codebase internally stores INR as **integer rupees** (confirmed by
   `pricing.service.ts` and `payment.service.spec.ts` fixtures — the
   Razorpay edge multiplies by 100 to convert to paise), so every
   auto-generated notification was displaying **1 / 100th of the real
   amount**. A ₹17,050 booking would have shown "Total: ₹170.50" in guest,
   host and admin notifications. **Fix applied:** all three `/100`
   divisions removed.

6. **[MEDIUM — follow-up]** The code comment in
   `test/app.e2e-spec.ts:369` (`baseNightlyRate: 500000, // paise (₹5000)`)
   is incorrect — the value is used downstream as rupees. The
   `dhyana-stays-production` skill prescribes **paise everywhere**; the
   codebase instead uses **rupees everywhere except at the Razorpay edge**.
   Both are internally consistent, but the divergence from the skill rule
   should be either (a) documented as an intentional exception, or (b)
   migrated. Migration is non-trivial (touches schema, migrations, fixtures,
   tests, notification formatters, Meilisearch indexing, frontend display)
   and should not be done as part of this audit.

---

## Domain 03 — Database Architecture

**Status: Good.** Schema is comprehensive (33 models), with strong index
coverage via `0005_performance_indexes`. Critical integrity is enforced at
the **database level**, not just the application:

- **Double-booking prevention** (`0003_db_integrity`): a PL/pgSQL trigger on
  `Booking` raises an exception if any pair of active bookings
  (`PAYMENT_PENDING | CONFIRMED_DEPOSIT | CONFIRMED_PAID | BALANCE_DUE`)
  for the same listing overlap, using PostgreSQL's `tsrange && tsrange`
  operator. This is exactly the pattern from the `no-overlap-database-
  constraints` skill, and it's a belt-and-braces defence beyond the
  application-level hold system.
- **Ledger immutability**: `LedgerEvent` has `BEFORE UPDATE` and
  `BEFORE DELETE` triggers that unconditionally `RAISE EXCEPTION`. A tamper
  of the financial event log requires privileged direct DB access plus
  bypassing triggers.
- **Indexes**: booking lookups, payment reports, seasonal-rate windows,
  payout dashboards and hold overlap checks all have supporting composite
  indexes.

**Findings.**

7. **[MEDIUM — backlog]** No PgBouncer / connection-pooling layer is
   configured. The `connection-pooling-pgbouncer` skill prescribes
   transaction-mode pooling with TypeORM / Prisma for horizontal API
   scaling. Under moderate load the Prisma client's default pool will
   suffice; this becomes relevant at >5 replicas.

---

## Domain 04 — State Machines

**Status: Good.** Booking status transitions are explicitly guarded in
`BookingService`:

- `createBooking`: `HOLD → PAYMENT_PENDING` inside a transaction with
  hold-expiry, guest-ownership and idempotency-by-hold checks.
- `confirmPayment`: `PAYMENT_PENDING → CONFIRMED_DEPOSIT | CONFIRMED_PAID`
  based on `plan` and `amountCaptured`, with the ledger write inside the
  same transaction.
- `transitionToBalanceDue`: bulk update `CONFIRMED_DEPOSIT → BALANCE_DUE`
  when `balanceDueAt <= now` (driven by the scheduled job).
- `autoCancelUnpaidBalance`: `BALANCE_DUE → CANCELLED | REFUNDED` after a
  24 h grace period.
- `cancelBooking`: explicitly whitelists the four cancellable states; refund
  calculation goes through `PricingService.computeRefundAmount` (48 h / 10 h
  tiers from the `cancellation-refund-engine` skill).
- `completeBooking`: only allowed from `CONFIRMED_PAID | CONFIRMED_DEPOSIT`.

All transitions write to `AuditLog` and, where financial, also to
`LedgerEvent`.

**Findings.**

8. **[MEDIUM — backlog]** The transitions are currently enforced in service
   methods rather than in a dedicated `BookingStateMachine` class. This is
   workable, but as the state graph grows (e.g. `DISPUTED`, `HOST_
   REQUESTED_CANCEL`, partial refunds) a centralised FSM (per the
   `entity-state-machine` skill) will reduce the risk of a new method
   skipping a guard.

---

## Domain 05 — Background Jobs

**Status: Good.** BullMQ + `@nestjs/schedule` is wired up with four queues
(`hold-expiry`, `balance-due`, `payout-eligibility`, `weekly-payout`), each
with a `JobsScheduler` cron that enqueues with `attempts: 3` and exponential
backoff, plus `removeOnComplete` / `removeOnFail` caps. The weekly payout
batch runs Monday at 03:30 UTC (09:00 IST). The hold expiry job runs every
minute — appropriate for a 15-minute hold TTL.

**Findings.**

9. **[HIGH — follow-up]** No **dead-letter queue** is configured. When a
   job exhausts its three retries, BullMQ currently just marks it failed
   and leaves it in the failed set until `removeOnFail: 50` rotates it out.
   That means a systematic bug in (e.g.) the weekly payout batch could
   silently eat a batch and only surface as "customers aren't getting
   paid". **Recommendation:** a dedicated `dlq` queue fed by the `failed`
   event, persisted to DB with runbook links, and a PagerDuty alert on
   any DLQ insert — per the `job-queue-architecture` and
   `business-critical-alerting` skills.

---

## Domain 06 — API Design

**Status: Good.** Bootstrap in `main.ts` is already hardened:

- `helmet()` with a tight CSP (Razorpay checkout scoped).
- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
  transform: true })` — rejects unknown fields, coerces DTOs.
- 1 MB JSON limit, CORS allowlist via `ALLOWED_ORIGINS` (Joi rejects
  localhost in production).
- `rawBody: true` for HMAC verification of the Razorpay webhook.
- `CorrelationIdInterceptor` stamps every request, and
  `GlobalExceptionFilter` returns a structured JSON error envelope including
  that correlation id.
- Swagger disabled in production; SIGTERM / SIGINT graceful shutdown.

Errors follow a single shape: `{ statusCode, message, errors?,
correlationId, timestamp, path }`. Class-validator array messages are
flattened correctly.

**Findings.**

10. **[MEDIUM — backlog]** The API is **not versioned** (no `/v1` prefix, no
    `@Version()` decorators). The `api-versioning-strategy` skill prescribes
    URI-based versioning with deprecation headers. This is cheap to add
    before any public API consumers exist — much more expensive after.

---

## Domain 07 — DevOps & CI/CD

**Status: Needs work** (and partially fixed during this audit).

The Dockerfile uses a three-stage build (`deps → build → runtime`) on
`node:22-alpine`, runs as a non-root `appuser:appgroup`, and the
`docker-compose.prod.yml` stack is in the repo. `infra/nginx.conf` has
sensible security headers, gzip, per-zone rate limiting (general 30 r/s,
`/auth/login` 5 r/m), and an **unrate-limited** `/api/payments/webhook` path
so Razorpay callbacks aren't dropped under burst.

The GitHub Actions CI spins up Postgres 16 as a service, runs
`prisma:generate`, `test`, `build`, and on `main` verifies the API + Web
Docker builds.

**Findings.**

11. **[BLOCKER — fixed]** The Dockerfile runtime stage had neither a
    `HEALTHCHECK` nor `dumb-init`. Without `dumb-init`, Node is PID 1 and
    doesn't reap orphan children or forward signals cleanly — SIGTERM from
    Kubernetes can take longer than necessary to drain. Without a
    `HEALTHCHECK`, Docker itself has no way to mark the container
    unhealthy. **Fix applied:** runtime now installs `dumb-init` + `wget`,
    adds a `HEALTHCHECK` hitting `/health/live`, and uses
    `ENTRYPOINT ["dumb-init", "--"]`.

12. **[MEDIUM — backlog]** CI does not run `lint` or `typecheck` as
    separate steps — only `test` and `build`. Adding
    `pnpm --filter @dhyana/api lint` and
    `pnpm --filter @dhyana/api typecheck` would catch TS errors before the
    slower test step runs.

13. **[MEDIUM — backlog]** No Terraform / IaC for the production
    environment; deployment is docker-compose-based per
    `docs/cloudflare-deployment.md`. For a single-region deployment this is
    fine; once the platform runs in more than one region or account, the
    `infrastructure-as-code-terraform` skill should be applied.

---

## Domain 08 — Monitoring

**Status: Needs work.** Pino structured logging is configured with
correlation id enrichment, and `HealthController` exposes
`/health`, `/health/live`, `/health/ready` (the latter pings Postgres).
`CHANGELOG.md` references APM work but no Sentry / Datadog DSN is wired
into the API module.

**Findings.**

14. **[HIGH — follow-up]** No **APM / distributed tracing** is currently
    connected. Without it, P95 latency on `/bookings`, `/pricing/quote`, and
    the Razorpay webhook path is invisible. The `apm-distributed-tracing`
    skill prescribes Sentry performance or Datadog APM; Sentry is the
    faster path because the error-tracking half is already in the backlog.

15. **[MEDIUM — backlog]** No **business-critical alerting** rules. A
    failed weekly payout batch, a Razorpay webhook 401 rate spike, or a
    sustained surge in failed logins should all page on-call. Tie this into
    the DLQ work from Domain 05.

---

## Domain 09 — Search & Performance

**Status: Good.** Meilisearch is configured via `MEILI_URL` /
`MEILI_MASTER_KEY` and the `meilisearch-faceted-search` skill is already
being honoured. Frontend is Next.js 15 with the App Router, which gives
streaming SSR and server components out of the box. No findings during this
audit pass — this domain should be revisited once real production traffic
shapes show up in APM.

---

## Domain 10 — Testing

**Status: OK.** The API has **8 unit spec files** covering auth, booking,
listing, notification, payment, pricing, storage and the price-snapshot
signer, plus **1 end-to-end spec** (`apps/api/test/app.e2e-spec.ts`). The
`CHANGELOG.md` reports 234 / 234 passing. Spot checks:

- `payment.service.spec.ts` exercises the webhook path with a correctly
  HMAC-signed body and verifies `createOrder` is called with paise
  (`852500` for an ₹8525 deposit), confirming the rupee-internal /
  paise-at-edge convention.
- `price-snapshot-signer.service.spec.ts` verifies the timing-safe
  comparison.

**Findings.**

16. **[MEDIUM — backlog]** No dedicated **concurrency / race-condition
    tests** prove the no-double-booking guarantee under parallel
    `createBooking` calls. The `concurrency-race-condition-tests` skill
    prescribes a test that fires N simultaneous requests at a single hold
    and asserts only one booking survives. The DB trigger already provides
    the guarantee — but a test would catch a future regression where
    someone relaxed the trigger condition.

---

## Domain 11 — Compliance

**Status: Needs work.** The append-only ledger (`LedgerEvent` + immutability
trigger) and `AuditLog` together provide the raw material for financial
retention and audit. But the platform is aimed at Indian travellers and
hosts, which means:

- **GST / tax.** No tax calculation is visible in `PricingService`. GST on
  hospitality in India is 12 % or 18 % depending on tariff band, and
  Razorpay does **not** handle this server-side — it has to be computed in
  the quote, stored in the snapshot, and reflected on the invoice.
- **DPDP (Data Protection & Digital Privacy Act, 2023).** No consent
  records, no right-to-erasure endpoint, no retention policy on
  `AuditLog` / `GuestPreference` / `Message`.

**Findings.**

17. **[MEDIUM — roadmap]** GST + DPDP are out of scope for the initial
    launch but must be closed before the first invoice is issued and before
    any marketing collects user data. The `gst-tax-compliance`,
    `data-privacy-compliance` and `financial-record-retention` skills are
    the applicable playbooks.

---

## Fixes applied during this audit

All four blockers identified above were fixed in-place:

| File                                            | Change                                                                                             |
|-------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `apps/api/src/auth/auth.service.ts`             | `issueTokens` throws if `JWT_*_SECRET` env vars are unset; removed hardcoded `'dev-access-secret'` fallback. |
| `apps/api/src/payment/razorpay.service.ts`      | `verifyWebhookSignature` rejects non-hex / wrong-length signatures before `timingSafeEqual`, preventing 500s. |
| `apps/api/src/booking/booking.service.ts`       | Removed `/ 100` divisions in three notification templates — amounts are stored as rupees, so the old code was showing 1/100 of reality. |
| `apps/api/Dockerfile`                           | Added `dumb-init` as PID 1, a Docker `HEALTHCHECK` hitting `/health/live`, and graceful signal forwarding. |

Each change is small, surgical, and does not affect DB schema or public API
shape. They are safe to land as a single commit.

---

## Prioritised follow-ups

**Before next production release:**

1. **Refresh-token rotation with family tracking.** Defence against session
   replay — currently plaintext refresh tokens in a single column.
2. **Dead-letter queue + PagerDuty alert on insert.** Closes the "silent
   job failure" gap in Domain 05.
3. **APM (Sentry Performance or Datadog).** Currently flying blind on P95
   latency and slow endpoints.
4. **Lint + typecheck in CI.** Two extra steps, cheap.

**Before first paid booking in production:**

5. **GST calculation in `PricingService` + GSTIN on invoices.**
6. **Concurrency test for no-double-booking under parallel load.**
7. **API versioning (`/v1` prefix) added before any external consumers.**

**Roadmap (non-blocking):**

8. **Role-model expansion** — implement the five-level admin hierarchy and
   the Property-Owner / Investor split from PDF Section 2. This is an
   architectural change, not a bug fix, and should be designed before
   implementation.
9. **DPDP consent + right-to-erasure endpoints.**
10. **Centralised `BookingStateMachine` class.**
11. **PgBouncer for >5 API replicas.**
12. **Terraform once multi-region / multi-account.**

---

## Appendix A — Architectural gap: role model vs. platform PDF

The canonical platform description (uploaded PDF, Section 2) defines four
distinct stakeholder groups:

1. **Travellers (Guests)** — served today by `UserRole.GUEST`.
2. **Property Owners & Investors** — served today by a single
   `UserRole.HOST`. The PDF distinguishes between the operator who runs the
   property day-to-day and the investor who owns the asset. These have
   different financial views (investor sees yield; operator sees bookings
   and payouts).
3. **Admin & Operational Teams (five levels)** — served today by a single
   `UserRole.ADMIN`. The PDF specifies:
   - Super Admin
   - Operational
   - Cluster / Regional
   - Property-Level
   - Service-Level
4. **Employees & Service Teams** — not modelled at all in the current
   schema.

**Impact.** The current codebase is correct for a three-role MVP but will
not scale to the vision in the PDF without a schema change. Recommendation:
(a) keep shipping on the three-role model for the initial launch, (b) plan
a `UserRole` + scoped-permission migration (likely adding an `AdminLevel`
enum and a separate `ServiceTeam` model) as a dedicated phase, and (c)
ensure all new RBAC checks go through `AccessControlService` so the
migration is contained.

---

## Appendix B — Money-unit convention

The codebase uses **integer rupees** everywhere internally, and multiplies by
100 only at the Razorpay edge (`payment.service.ts:90` →
`razorpay.createOrder(amountInr * 100, ...)`). This is **different** from
the `dhyana-stays-production` skill's rule #7 ("All money as integers in
paise"), but internally consistent and verified by
`payment.service.spec.ts` (snapshot.total = 17050 = ₹17,050). The three
notification bugs fixed in this audit arose because the formatting code was
written as if the convention were paise.

Either the convention should be documented as an intentional exception, or
a future migration should unify on paise. Migrating to paise touches schema
(`Int` columns), migrations, seed data, test fixtures, Meilisearch indexing
and the frontend display layer — it is a dedicated workstream, not a
patch.

---

*Audit completed against commit state as of 2026-04-11. Regenerate this
report after the follow-up work lands.*
