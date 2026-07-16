# Detailed Changelog

Companion to the root [`CHANGELOG.md`](../CHANGELOG.md). The root file is the
concise, scannable summary; **this file is the granular record** — files touched,
method/endpoint signatures, migration DDL, enforcement points, rationale, and
test results.

Newest first. Covers work from **2026-04-23 onward** (commit `3c0f24e`+). Earlier
history remains fully detailed in the root `CHANGELOG.md`.

> **Convention:** every change is recorded in both files — a one-line-per-item
> entry in the root `CHANGELOG.md`, and a full breakdown here.

---

## 2026-07-16 — CORS: graceful denial + wildcard origins (fixes login 500)

**Commit:** _pending_ · **Migration:** none

- **Symptom:** login on the deployed site → 500; Render log:
  `Unhandled exception [unknown]: Error: Origin https://dhyanastays-<hash>-….vercel.app
  not allowed by CORS`.
- **Root causes (two):**
  1. The CORS `origin` callback invoked `callback(new Error(...))` for
     disallowed origins — the cors middleware surfaces that as an unhandled
     exception → 500. Crucially this also killed **same-origin** traffic: the
     web app calls `/api/*` on its own domain and Next's rewrite proxies to the
     API **forwarding the browser's Origin header**, so any origin not in the
     allowlist 500'd even though no cross-origin request ever happens
     browser-side.
  2. The user was browsing a Vercel **deployment-hash URL**
     (`dhyanastays-<hash>-<team>.vercel.app`) — a new one exists per deploy, so
     exact-match allowlisting can never keep up.
- **Fix (`main.ts`):** deny gracefully — `callback(null, false)` + a `CORS:`
  warn log. The request proceeds without CORS headers; browsers enforce
  cross-origin blocking (auth is Authorization-header based, not cookies, so no
  CSRF exposure from processing the request). `ALLOWED_ORIGINS` entries may now
  contain `*` wildcards, compiled to escaped regexes
  (`https://myapp-*.vercel.app` → `^https://myapp\-.*\.vercel\.app$`).
- **Verified:** tsc 0 errors, lint clean. Probes against the live API had
  already proven auth healthy when called with no Origin (register + login 201s
  direct to Render) — pinpointing the Origin header as the differentiator.

---

## 2026-07-16 — Web: tolerate trailing slash in NEXT_PUBLIC_API_URL

**Commit:** _pending_ · **Migration:** none

- **Symptom (deployed Vercel site):** every API call 404s with
  `Cannot GET //api/listings` — note the double slash. The request *did* reach
  the Render API (that's a Nest/Express 404 body), but with a malformed path.
- **Root cause:** `NEXT_PUBLIC_API_URL` was saved in Vercel with a trailing
  slash; `next.config.js` concatenates `${base}/api/:path*` → `host//api/...`,
  which matches no route under the `api` global prefix.
- **Fix:** rewrite destination now uses
  `(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '')`.
  Env-var hygiene still recommended (no trailing slash), but the build no longer
  breaks on it. Note rewrites are evaluated at **build time** — changing the env
  var or config requires a redeploy.

---

## 2026-07-16 — Allow NODE_ENV=staging (deployed-for-testing mode)

**Commit:** _pending_ · **Migration:** none

- **Symptom:** after the pnpm-layout fix, the Render container reached config
  validation and crashed: `Config validation error: "NODE_ENV" must be one of
  [development, test, production]` — the blueprint sets `NODE_ENV=staging`.
- **Fix:** `src/config/env.validation.ts` — `staging` added to the `NODE_ENV`
  enum. Audited every `NODE_ENV` branch in `src/` (app.module Redis warning,
  logger, itinerary, main.ts docs gate, notification, razorpay, sos-broadcast,
  storage): all compare `=== 'production'` (or `!==`), so staging inherits
  development behavior — stub providers legal, production runtime guards off.
  The production-only Joi strictness block keys on `NODE_ENV === 'production'`
  and is unaffected.
- **Verified:** `tsc` 0 errors; schema check — `staging` accepted, unknown
  values still rejected.

---

## 2026-07-12 — Fix Render deploy crash: pnpm layout in API runtime image

**Commit:** _pending_ · **Migration:** none

- **Symptom:** first Render deploy built fine, then crashed at boot:
  `Error: Cannot find module '@nestjs/common'` from `/app/dist/main.js`.
- **Root cause:** pnpm's virtual-store layout. Direct deps of `@dhyana/api`
  exist only as relative symlinks at `apps/api/node_modules/<pkg>` →
  `../../node_modules/.pnpm/<pkg>@<ver>/…`. The runtime stage copied `dist` to
  `/app/dist` and the root `node_modules` only — Node's resolver walking up
  from `/app/dist` finds no `@nestjs/common` (the root `node_modules` holds
  only the `.pnpm` store + root-level deps, not the API's links).
- **Fix:** runtime stage now mirrors the build layout —
  `/app/node_modules` (store) + `/app/apps/api/node_modules` (symlinks) +
  `/app/apps/api/{dist,prisma,package.json}` — and sets
  `WORKDIR /app/apps/api` before `CMD ["node", "dist/main.js"]`. Relative
  symlinks resolve identically to the build stage. Prisma engines + generated
  client ride along inside the store. Container migrate commands
  (`npx prisma migrate deploy --schema prisma/schema.prisma`) keep working from
  the new workdir.
- **Note:** Render builds from `main` (merged from `dev` on GitHub) — fixes must
  be merged to `main` to trigger a rebuild.

---

## 2026-07-12 — CI green: fix all 273 lint errors + the last failing unit test

**Commit:** _pending_ · **Migration:** none

### Context
GitHub CI's lint job (`pnpm --filter @dhyana/api lint`) failed with 293 problems
(273 errors). ~230 were `no-explicit-any` in spec files (mock noise); ~40 were
genuine issues in production source.

### `eslint.config.mjs`
- Override block for `src/**/*.spec.ts`: `@typescript-eslint/no-explicit-any: off`
  — mocks and Prisma doubles legitimately need `any`; enforcing it in specs
  produces noise, not safety.
- `@typescript-eslint/no-unused-vars` configured with
  `argsIgnorePattern/varsIgnorePattern/caughtErrorsIgnorePattern: '^_'` — the
  processors' `_job` params and `_dto` were already following this convention
  but the rule wasn't.

### Real fixes (17 files)
- **Typed Prisma filters**: `where: any` → `Prisma.BookingWhereInput`
  (`booking.service.getAllBookings`, `admin.service.getCalendarBookings`,
  `host-analytics` calendar + getBookings) and `Prisma.AuditLogWhereInput`
  (`admin.service` audit query); `status` string params cast to `BookingStatus`.
- **JSON writes**: `metadata/value as any` → `Prisma.InputJsonValue`
  (admin-notification, host-analytics notification, admin systemConfig ×3).
- **Snapshot reads**: `priceSnapshot as any` → narrow inline types
  (`{ total?: number; depositAmount?: number; balanceAmount?: number } | null`)
  in admin revenue rollup + 3 host-analytics call sites.
- **payout.service**: `(line.host as any).user` → single typed cast for the
  host-user include shape.
- **storage.service**: two `require('crypto')` lazy imports → `createHmac` added
  to the existing top-level crypto import.
- **payment.service**: dead `type TxClient = any` alias removed.
- **Dead imports removed**: `AddOn` (add-on), `generate` (mfa),
  `PricingService` (booking spec), `UserRole`+`Roles` (feature-flag controller),
  `InvestorDocumentKind` (investor), `IsObject` (update-preparation DTO),
  `Body`+`MarkBatchPaidDto` class+`IsString` (payout controller),
  `Delete`+`Param` (referral controller), `Prisma` (trip-group).
- **upsert-preferences DTO**: `DIETARY_OPTIONS`/`WELLNESS_OPTIONS` exported
  (documented allowed values, previously unused consts).
- 20 stale `eslint-disable` directives auto-removed via `--fix`.

### `listing.service.spec.ts` — pre-existing failure root-caused
`updateHostListing` reads the listing twice: ownership check, then a re-fetch
(with `rateRules` + `media`) which is the return value. The mock returned the
ownership row (no `status`) for both reads → `result.status` undefined. Fixed
with `mockResolvedValueOnce` per read. The service was always correct.

### Verification
- `eslint "src/**/*.ts"` → exit 0 (was 273 errors).
- `tsc --noEmit` → 0 errors (one narrow-type miss caught and fixed:
  `balanceAmount` added to the admin snapshot cast).
- Unit suite: **260/260 — fully green for the first time** (the listing spec
  was failing since before the booking-engine hardening pass).

---

## 2026-07-12 — Deployment kit: live staging on Render + Vercel

**Commit:** _pending_ · **Migration:** none

### Architecture
Browser → **Vercel** (Next.js, free Hobby; `/api/*` rewrite proxies to the API →
no CORS) → **Render** free tier: NestJS API via the existing
`apps/api/Dockerfile`, managed PostgreSQL 16, Key Value (Redis) for BullMQ.
API runs `NODE_ENV=staging` — production-mode validation (real Razorpay,
non-stub email/SMS/storage, Anthropic key, SOS contacts) stays off while the
platform is live for testing; Razorpay test keys exercise the real checkout +
webhook path.

### Files
- **`render.yaml`** (new): `databases:` dhyana-postgres (free, PG16);
  `keyvalue` dhyana-redis (free, `maxmemoryPolicy: noeviction` — BullMQ
  requirement, `ipAllowList: []`); `web` dhyana-api (runtime docker,
  `dockerContext: .`, healthcheck `/api/listings`). Env: DATABASE_URL/REDIS_HOST/
  REDIS_PORT wired via `fromDatabase`/`fromService`; JWT + price-snapshot
  secrets `generateValue: true`; WEB_URL/ALLOWED_ORIGINS/Razorpay/ADMIN_*
  `sync: false` (dashboard prompts). Free tier lacks pre-deploy hooks →
  migrations run from a dev machine against the external DB URL (documented).
- **`.dockerignore`** (new): excludes all `.env*` (keeps `*.example`) — before
  this, `COPY . .` in both Dockerfiles would have copied real local secrets
  into images — plus node_modules/dist/.next/.git/docs/dump.rdb.
- **`apps/api/Dockerfile`**: `RUN pnpm --filter @dhyana/api prisma:generate` →
  `RUN pnpm --filter @dhyana/api exec prisma generate` (package script wraps
  dotenv `-e .env`; that file is no longer in the build context).
- **`docs/DEPLOYMENT.md`** (new): required-for-testing services (GitHub, Render,
  Vercel, Razorpay test mode) vs required-for-production (live Razorpay,
  Resend/SendGrid/SMTP, MSG91/Twilio, R2/S3, Anthropic, managed Redis, SOS
  contacts — mirroring `env.validation.ts` production block); Render blueprint
  walkthrough; migrate + GiST post-migrate + seed against the cloud DB
  (PowerShell + bash); Vercel import (`apps/web` root, `NEXT_PUBLIC_API_URL`);
  Razorpay webhook (`/api/payments/webhook`, events payment.captured/
  payment.failed/refund.processed); smoke-test checklist; free-tier caveats
  (API idle sleep, 30-day free Postgres); production upgrade path.

---

## 2026-07-12 — Docs: clone & setup guide

**Commit:** _pending_ · **Migration:** none (documentation only)

- **`docs/SETUP.md`** (new) — everything to stand the platform up on a fresh
  device. Facts sourced from the repo, not memory: pnpm `10.2.0` from the root
  `packageManager` field; Node 22 from CI; `postgres:16` / `redis:6.2.0` /
  `getmeili/meilisearch:v1.12` from `docker-compose.yml`; required env vars from
  `env.validation.ts` (DATABASE_URL, JWT secrets ≥16 chars dev / ≥32 prod;
  `PRICE_SNAPSHOT_SECRET` has a dev default; `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  gate the seed's admin creation); command sequence from `package.json` scripts
  (`prisma:generate` → `prisma:deploy` → `post-migrate` GiST index → `seed`).
  Covers Docker and native-Windows (Memurai) paths, graceful degradation
  without Redis/Meilisearch, test commands with expected results, production
  build (`prod:*` scripts) with the Windows symlink caveat, and a
  quick-reference block of the full sequence.

---

## 2026-07-12 — Fix IDE "Cannot find name 'jest'" in API spec files

**Commit:** _pending_ · **Migration:** none

- **Symptom:** VS Code flagged ~100 `Cannot find name 'jest'/'describe'/'it'/
  'expect'` (TS2304/TS2593) errors in `payment.service.spec.ts` and other specs.
- **Diagnosis:** `@types/jest` was correctly declared, linked at
  `apps/api/node_modules/@types/jest`, and `tsc --noEmit -p tsconfig.json`
  reported **zero** such errors — so code, deps, and config were sound. Only the
  IDE's TS server failed, in its *automatic* @types visibility scan (flaky with
  pnpm symlinked node_modules on Windows).
- **Fix:** `apps/api/tsconfig.json` — added `"types": ["node", "jest"]` to make
  global-type inclusion explicit. Safety check: `types` only restricts *global*
  ambient inclusions; module-based types (`@types/express`, etc.) still resolve
  via imports, and a grep confirmed no `Express.Multer`/`declare global`
  ambient-global usage in `src/`.
- **Verified:** `tsc --noEmit` → 0 errors; `payment.service.spec.ts` → 15/15
  pass. Requires a one-time "TypeScript: Restart TS Server" in VS Code.

---

## 2026-07-08 — Dev performance: Turbopack + Redis recovery

**Commit:** _pending_ · **Migration:** none

### Symptom & diagnosis
"Clicking around the platform is slow." Measured each layer:
- Ports: Postgres :5432 OPEN, **Redis :6379 CLOSED**, **Meilisearch :7700 CLOSED**,
  API :3001 OPEN, Web :3000 OPEN.
- API latency: `/api/listings` 59–174 ms — backend healthy. Meilisearch-down is
  harmless (search falls back to Postgres per `listing.service.ts`).
- Web: running `next dev` (webpack) — first visit to a route compiles it
  on-demand: **3,529 ms first hit vs 532 ms warm** on `/experiences`. This was
  the perceived slowness.
- Redis: no Docker/WSL on this machine; Redis is **Memurai 4.1.2** (Windows
  service, StartType=Automatic) which was **Stopped** — so the API had booted
  with all BullMQ job modules disabled (its graceful-degradation path).

### Fixes
- `apps/web/package.json`: `"dev": "next dev --turbopack -p 3000"` —
  `next.config.js` has no custom webpack config, so Turbopack is safe. Requires
  a one-time dev-server restart to take effect.
- Started Memurai directly (service start needs elevation; ran
  `memurai.exe` as user process — `PING → PONG`), then triggered a nodemon
  restart of the API by touching `src/main.ts`. Verified all **12 BullMQ queues**
  re-registered in Redis (`bull:*:meta`): hold-expiry, balance-due,
  payout-eligibility, weekly-payout, pay-later-dunning, notification-outbox,
  sos-broadcast, concierge-sla, investor-distribution, payment-recon,
  auto-complete, dead-letter.

### Follow-ups (noted for the user)
- Restart the web dev server to activate Turbopack.
- To make Redis survive reboots, start the Memurai *service* once from an
  elevated shell (`Start-Service Memurai`); it is already set to Automatic.
- Meilisearch stays optional locally (needs Docker); DB fallback covers search.

---

## 2026-07-08 — Nature-luxury visual theme (all pages)

**Commit:** _pending_ · **Migration:** none (web styling only)

### Approach
The web app's design system is fully CSS-variable driven (`--brand-*`,
`--gray-*`, `--surface`, glass tints) with Tailwind tokens mapped onto the vars
in `tailwind.config.ts`. Re-skinning the token layer restyles all 76 pages at
once — no per-page edits. Semantic status colors (red/amber/green/blue badges
and alerts) were deliberately left untouched.

### `apps/web/app/globals.css`
- **Light mode:** brand 50–900 rebuilt as a deep-evergreen scale (primary
  `--brand-700: 34 77 56` ≈ `#224d38`); neutrals warmed to stone/linen
  (`gray-900: 28 26 21` … `gray-50: 250 249 246`); surface `246 244 238` warm
  ivory; new `--gold: 166 129 72` (antique gold); `--ambient` radial evergreen
  wash layered over the body's grain texture; glass/nav tints warmed.
- **Dark mode:** brand becomes a sage scale (primary `220 233 224` near-white
  sage); surfaces forest-night (`--surface: 10 13 11`, cards `19 24 20`);
  green-tinted inverted grays; `--gold: 209 174 118` brightened.
- **Components:** `.btn-primary` hover shimmer now gold-tinted;
  `.gradient-border` animates evergreen→gold; `.text-gradient` ends in gold;
  `.card`/`.card-hover` shadows warmed (rgba base 21,32,25); new `.text-gold`
  and `.eyebrow` (small-caps gold kicker) utilities.

### `apps/web/tailwind.config.ts`
- New `gold` color token → `rgb(var(--gold) / <alpha-value>)`.
- `boxShadow` set warmed to the forest-tinted rgba base; `glow` now evergreen.

### `apps/web/components/ListingCard.tsx`
- Placeholder SVG gradients switched from monochrome blacks to five
  deterministic forest/moss/earth pairs (e.g. `#0f2a1c→#2f6349`).

### Build fixes (pre-existing, exposed by verification build)
- `app/auth/register/page.tsx` + `app/sos/page.tsx`: `useSearchParams()` without
  a `<Suspense>` boundary fails Next 15 static prerender. Wrapped both default
  exports in `<Suspense>` (inner component pattern). These failures pre-dated the
  theme work and blocked `next build` entirely.

### Verification
- `next build`: ✓ compiled; **all 76 pages prerendered** (register/sos included).
- Built CSS confirmed to contain the new tokens (`34 77 56`, `246 244 238`,
  both `--gold` values).
- Remaining local-only failure: `output: 'standalone'` copy step needs symlinks,
  which Windows blocks without Developer Mode (EPERM). Environmental; CI/Linux
  unaffected; pre-existing.

---

## 2026-07-08 — Docs: Word test report + roadmap

**Commit:** _pending_ · **Migration:** none

- **`docs/booking-engine-test-report.docx`** — the markdown test report converted
  to a native Word document using the repo's `docx` v9.6.1 library (no pandoc
  available). Real OOXML: Word heading styles, all 8 tables with shaded headers +
  per-column alignment, shaded monospace code blocks, lists/blockquotes/inline
  formatting. Package validated (all required parts present; content intact).
- **`docs/TODO.md`** — forward roadmap after the hardening pass, every item
  verified against the repo: P0 housekeeping (push `dev` [ahead 6], untrack
  committed `apps/api/dist/`, `.docx` decision, `listing.service.spec` triage);
  P1 engine follow-ups (CI runs unit only despite having a Postgres container —
  add `migrate deploy` + `test:int`; pay-later seq-2+ lifecycle test; balance
  notification decision; payout rounding test); P2 product gaps (booking UI plan
  selector offers only FULL/DEPOSIT_50 — expose PAY_LATER behind a feature flag;
  merge `dev`→`main`); P3 launch readiness (no web E2E exists; provider
  provisioning; monitoring; backups; security review).

---

## 2026-07-06 — Booking-engine hardening: top-standard test suite + 4 reliability fixes

**Commit:** _pending_ · **Migration:** none (application + test code only)

### Goal
Build top-standard test coverage for the booking engine, run it against the real
engine, and fix whatever the tests expose so the engine is strong and reliable.

### Approach — real-service integration harness
`apps/api/test/integration/services-harness.ts` (new):
- `makeEngine(prisma)` wires the **actual** production services against dev
  Postgres — `PricingService`, `HoldService`, `BookingService`, `PaymentService`,
  `PayLaterService`, `LedgerService`, `AuditService`, `PriceSnapshotSignerService`,
  `BookingStateMachine`, `OutboxService`, `ReferralService`, `MembershipService`,
  `AddOnService`. Only two adapters are doubled: `NotificationService` (no-op) and
  `RazorpayService` (real class in **stub mode** — no keys → deterministic
  `stub_order_*` ids, `verifyWebhookSignature` → true).
- `makeConfig()` supplies `PRICE_SNAPSHOT_SECRET` + empty Razorpay keys;
  `capturedEvent(orderId, amountPaise)` / `failedEvent(orderId)` build Razorpay
  webhook JSON.
- Exercises the same methods the HTTP controllers call, so the suite proves the
  engine, not a re-implementation.

`apps/api/test/integration/booking-lifecycle.int-spec.ts` (new, 17 tests):
quote correctness (paise, 10% platform fee, 18% GST, signed TTL-bounded snapshot);
FULL lifecycle (→ `CONFIRMED_PAID` + ledger + payout + policy snapshot); DEPOSIT_50
lifecycle (deposit → `CONFIRMED_DEPOSIT` → balance-due cron → balance paid →
`CONFIRMED_PAID`, asserting **2 ledger captures summing 1 788 800** and **2 payout
lines summing 1 600 000**); PAY_LATER first capture (→ `CONFIRMED_DEPOSIT` +
`PayLaterPlan`, seq-1 instalment paid); cancellation refund tiers 100/50/0 from the
frozen policy snapshot; webhook replay ×3 idempotency + amount-mismatch + tampered
snapshot; hold/booking/payment idempotency keys; `autoCancelUnpaidBalance` +
`autoCompleteCheckedOut` crons; overlap + expired-hold guards.

### Fix 1 — overlap query threw on every capture (`src/booking/booking.service.ts`)
`confirmPayment` Step 5 overlap backstop ran:
```sql
… tsrange("startsAt","endsAt",'[)') && tsrange(${booking.startsAt}, ${booking.endsAt}, '[)')
```
`startsAt`/`endsAt` columns are Prisma `DateTime` → Postgres `timestamp` (no tz),
but `$queryRaw` binds a JS `Date` as `timestamptz`. There is no
`tsrange(timestamptz, timestamptz, unknown)`, so Postgres raised `42883
function … does not exist` on **every** payment capture. The pre-existing unit
test mocked `$queryRaw`, so it never executed the real SQL; the prior integration
tests only inserted dedup rows and never drove a capture — the bug was invisible.
**Fix:** convert the bound params back to the UTC wall-clock the column stores:
```sql
… && tsrange((${booking.startsAt}::timestamptz AT TIME ZONE 'UTC'),
             (${booking.endsAt}::timestamptz AT TIME ZONE 'UTC'), '[)')
```
Validated by the double-booking concurrency proof (50 iterations, exactly one
CONFIRMED survivor).

### Fix 2 — DEPOSIT_50 balance never settled (`booking.service.ts`, `payment.service.ts`, `state-machine.ts`)
`BALANCE_PAID` (`BALANCE_DUE → CONFIRMED_PAID`) had **no emitter**. A balance
capture went `handlePaymentCaptured → confirmPayment`, but the booking was
`BALANCE_DUE` (in `confirmPayment`'s already-confirmed set) → `didConfirm:false`.
Net effect: payment row CAPTURED, but booking stuck at `BALANCE_DUE`, no balance
ledger entry, no second payout — money-state inconsistent.
- **`BookingService.settleBalance(tx, bookingId, paymentId, amountCaptured)`**
  (new): lock (`FOR UPDATE`) → idempotency (no-op if `CONFIRMED_PAID`/`COMPLETED`/
  `REFUNDED`) → HMAC re-verify → amount must equal `snapshot.balanceAmount` →
  state machine `BALANCE_PAID` → immutable `PAYMENT_CAPTURED` ledger → second
  payout line (same proportional `round(accommodationTotal × amountCaptured /
  total)` formula, so deposit + balance shares sum to the host's full share).
  Returns `{ booking, didSettle }`.
- **`PaymentService.handlePaymentCaptured`**: the non-pay-later branch now routes
  by booking status — `PAYMENT_PENDING` → `confirmPayment` (initial capture);
  `CONFIRMED_DEPOSIT`/`BALANCE_DUE` → `settleBalance` (balance capture).
  Unambiguous because the branch is only reached for a not-yet-CAPTURED payment,
  and `initPayment` only issues a BALANCE order in those two states. Balance
  settlement deliberately does **not** re-send the "booking confirmed" email.
- **`state-machine.ts`**: `BALANCE_PAID.from` extended to
  `['BALANCE_DUE', 'CONFIRMED_DEPOSIT']` (balance can be paid early).

### Fix 3 — auto-complete cron FK violation (`booking.service.ts`)
`completeBooking` passed the sentinel `'SYSTEM_AUTO_COMPLETE'` as
`AuditLog.actorUserId`, a **nullable FK to User**. The state-machine transition
(committed in its own tx, storing the actor in `statusHistory` JSON) succeeded, but
the subsequent `auditService.log(actorId, …)` threw a P2003 FK violation **after**
the booking was already `COMPLETED`. `autoCompleteCheckedOut` swallowed it →
returned 0 and logged a false "skipped" warning every run. **Fix:** system
completions log `actorUserId = null`, keeping the sentinel in metadata
(`{ systemActor: 'SYSTEM_AUTO_COMPLETE' }`).

### Fix 4 — PAY_LATER bookings were un-payable (`payment.service.ts`)
`initPayment` had branches only for FULL / DEPOSIT / BALANCE — a `PAY_LATER`
booking's first payment threw `BadRequestException`, even though `confirmPayment`
fully supported `PAY_LATER_FIRST_CAPTURED` + `createPlanFromFirstCapture`. A guest
could create a PAY_LATER booking that could never be paid, holding inventory until
a cron cancelled it. **Fix:** added a `PAY_LATER` branch charging the first
booking-time instalment from `snapshot.payLaterFirstInstalment[months]` (the same
field `computeExpectedFirstCapturePaise` checks, so init and confirm agree; and
`createPlanFromFirstCapture` re-derives from the signed `total` as a backstop). The
payment row is stored `type: 'PAY_LATER', payLaterSeq: 1`; instalments 2+ still go
through `initPayLaterInstalmentPayment`.

### Tests
- **Unit** (`src/booking/confirm-payment.spec.ts`): 6 new `settleBalance` tests
  (BALANCE_DUE settle; early settle from CONFIRMED_DEPOSIT; idempotent replay;
  amount mismatch; tampered HMAC; invalid-status rejection).
- **Unit** (`src/payment/payment.service.spec.ts`): balance-capture routing test
  (booking `BALANCE_DUE` → `settleBalance`, not `confirmPayment`, no re-notify) +
  fixed the existing captured-webhook test's tx mock (added `booking.findUnique`).
- **Harness** (`test/integration/harness.ts`): `teardownFixtures` rewritten to
  delete rows the real services mint with random cuIDs — identifies bookings by
  their FK to the RUN_TAG listing and cascades Refund / PayoutLine / Payment /
  LedgerEvent / HostNotification / GuestNotification before the parents.

### Results
- Unit: **259 passed** (1 pre-existing, unrelated `listing.service.spec` failure —
  confirmed failing with these changes stashed).
- Integration: **34 passed** across all 3 suites run together.
- Concurrency crown-jewel (`booking-engine.int-spec`) **@ 50 iterations**: idempotency
  race (exactly 1 winner) + double-booking race (exactly 1 survivor) green.

### Report
- **[`docs/booking-engine-test-report.md`](./booking-engine-test-report.md)** (new) —
  standalone test report: methodology (real-service harness), test-data money
  reference, full per-suite test inventory with assertions and pass/fail, the four
  defects (symptom / root cause / fix / verification), results tables, coverage
  assessment with residual risks, and reproduction steps.

---

## 2026-07-02 — Hold lifecycle: release-on-abandon + shared visibility

**Commit:** `0f38f27` · **Migration:** none

### Problem
A 15-minute hold stayed locked for its full TTL even after the guest left the
page, blocking other guests unnecessarily. Other guests who tried the same dates
got a vague "try again later" with no sense of when.

### Backend — `apps/api/src/hold/hold.service.ts`
- **`releaseHold(guestId, holdId)`** — owner-only (`ForbiddenException` otherwise),
  idempotent (`{ released: true, alreadyGone: true }` when the row is missing/reaped),
  refuses a hold already converted to a booking (`BadRequestException` — that goes
  through booking cancellation with its refund policy). Deletes the row + audits
  `HOLD_RELEASED { reason: 'guest_abandoned' }`.
- **`getHoldStatus(guestId, listingId, checkIn, checkOut)`** → `{ held, mine?,
  heldUntil?, remainingSeconds? }`. Finds the latest-expiring active overlapping
  hold (`booking: null`, `expiresAt > now`, half-open range overlap), `orderBy
  expiresAt desc`. `mine` compares `hold.guestId === guestId`.
- **Enriched conflict:** `createHold`'s overlapping-hold branch now throws a
  structured `ConflictException` with `{ error: 'DatesOnHold', heldUntil,
  remainingSeconds }` instead of a plain string.

### Backend — `apps/api/src/hold/hold.controller.ts`
- `GET /holds/status?listingId=&checkIn=&checkOut=` (declared before any param
  route so `status` isn't captured as an `:id`).
- `DELETE /holds/:id` → `releaseHold`.

### Frontend — `apps/web/lib/api.ts`
- `holdsApi.status(listingId, checkIn, checkOut)` → `HoldStatus`.
- `holdsApi.release(id)` — normal `DELETE` for SPA navigation.
- `holdsApi.releaseBeacon(id)` — `fetch(..., { keepalive: true })` carrying the
  bearer token from `tokenStore`; best-effort, survives tab close.
- New `HoldStatus` interface exported.

### Frontend — `apps/web/app/listings/[id]/page.tsx`
- **`HeldByOthersBanner`** component — live MM:SS countdown; `onFree()` fires once
  at zero so the parent re-checks availability.
- Refs `holdRef` (latest hold) + `holdConsumedRef` (true once a booking is created)
  so the unmount/`pagehide` cleanup reads current values without re-subscribing.
- **Release-on-abandon effect:** `pagehide` listener + unmount cleanup call
  `releaseBeacon` when `holdRef` is set and not consumed.
- **`handleReleaseAndBack`** — explicit "← Back (release hold)" from the guest-details
  step: clears the hold, releases it, returns to the quote step.
- After a quote and on a lost hold race, `refreshOthersHold()` populates the
  "on hold — MM:SS remaining" banner and disables the Hold button until the
  countdown ends.
- `handleCreateBooking` sets `holdConsumedRef.current = true` so a hold that became
  a booking is never released.

### Safety net
- The hold-reaper cron still deletes any straggler whose release beacon failed,
  within a minute.

### Verified
- API + Web `tsc --noEmit` clean.
- Live smoke against the dev DB: guest B sees `{held:true, mine:false, remain:900}`;
  guest A sees `mine:true`; B cannot release A's hold (Forbidden); A releases →
  `held:false`. **SMOKE_OK.**

---

## 2026-07-02 — Platform Control Panel + Feature Flags

**Commit:** `2b67128` · **Migration:** `0032_feature_flags_host_settings`

### Migration `0032`
- `FeatureFlag { key PK, enabled bool, updatedAt, updatedBy }` — admin overrides only.
- `HostSetting { hostId PK/FK→Host, instantBook, allowGuestMessages,
  allowConciergeChat, emailOnNewBooking, smsOnNewBooking, updatedAt }`.
- `Host.settings HostSetting?` back-relation added.

### Feature-flag system — `apps/api/src/feature/`
- **`feature-flags.registry.ts`** — canonical code registry: `FEATURE_REGISTRY`
  (12 features across 7 categories: Bookings & Payments, Guest Experience,
  AI & Concierge, Safety, Loyalty & Growth, Messaging, Investor). Each:
  `{ key, label, description, category, defaultEnabled, audience[], critical? }`.
  The DB stores only overrides; missing row → registry default.
- **`feature-flag.service.ts`** — `isEnabled(key)` (15s in-memory cache on the hot
  path, busted on toggle), `listResolved()`, `enabledMap()`, `setEnabled(actor,
  key, enabled)` (upsert + audit `FEATURE_FLAG_TOGGLED`), `setMany(...)`.
  Unknown keys fail **open** (a typo doesn't 503 everything).
- **`feature-flag.controller.ts`** — `AdminFeatureFlagController` (`@AdminLevelGuard
  L1`): `GET /admin/features`, `PATCH /admin/features/bulk`, `PATCH
  /admin/features/:key`. `PublicFeatureFlagController` (`@Public`):
  `GET /platform/features` → enabled map.
- **`feature.module.ts`** — `@Global()` so the guard can inject the service.

### Enforcement — `apps/api/src/common/`
- **`decorators/feature-gate.decorator.ts`** — `@FeatureGate('key')` (metadata).
- **`guards/feature.guard.ts`** — global `FeatureGuard` (registered in
  `AuthModule` via `APP_GUARD`, after JWT + Roles). Disabled feature → **503**
  `{ error: 'FeatureDisabled', feature }` for everyone, admins included.
- **Applied to 14 controllers:** experiences (guest/host/public), trip-group,
  itinerary, membership, referral, pay-later, investor, SOS, guest/host messaging,
  guest/host concierge. Admin-management controllers left ungated.

### Host settings — `apps/api/src/host-settings/`
- `host-settings.service.ts` — `getForHost(userId)` (lazily upserts a row +
  returns host-audience feature availability), `update(userId, dto)`, and
  enforcement helpers `allowsGuestMessages(hostUserId)` / `allowsConciergeChat(hostUserId)`.
- `host-settings.controller.ts` — `GET/PATCH /host/settings` (`@Roles HOST`).
- Wired into `MessagingService`: `startConversation` (guest→host) throws 403 when
  `allowGuestMessages` is off; `getConciergeThreadForGuest` throws 403 when
  `allowConciergeChat` is off.

### Frontend
- `apps/web/context/FeatureContext.tsx` — `FeatureProvider` fetches
  `/platform/features`; `useFeatures().isEnabled(key)` (fail-open). Wired into
  `app/layout.tsx`.
- `apps/web/lib/api.ts` — `adminFeaturesApi`, `platformFeaturesApi`,
  `hostSettingsApi`; `lib/types.ts` — `ResolvedFeature`, `FeatureEnabledMap`,
  `HostSettings`, `HostControlPanel`.
- `app/admin/control-panel/page.tsx` — grouped feature cards, live toggle switches,
  critical-feature confirm dialog, search, "X/Y enabled" summary, optimistic updates.
- `app/host/control-panel/page.tsx` — host-owned toggles + read-only platform
  feature availability.
- `components/Navbar.tsx` — hides disabled guest features via `isEnabled`; adds
  "🎛 Control Panel" to the admin + host menus.

### Verified
- API + Web `tsc` clean; unit **253/254** (1 unrelated pre-existing listing test).
- Live toggle smoke: `isEnabled('ai_itinerary')` true → off → false (map reflects) →
  on → true. Cleaned up.

---

## 2026-06 — Booking-engine production-correctness pass

**Migrations:** `0029_booking_status_history`, `0030_booking_gist_index`,
`0031_booking_correctness_pass` (under commit `2b67128`)

### Order of operations
Schema → state machine → route all callsites → GiST index → retry wrapper →
seven-step confirm → cross-cutting (idempotency / webhook dedup / policy snapshot).

### Migration `0029`
- `Booking.statusHistory Json @default("[]")` — append-only transition log.

### State machine — `apps/api/src/booking/state-machine.ts`
- `BookingStateMachine.transition(tx, booking, event, ctx)` — single chokepoint.
  Events: `PAYMENT_CONFIRMED_FULL`, `PAYMENT_CONFIRMED_DEPOSIT`,
  `PAY_LATER_FIRST_CAPTURED`, `PAY_LATER_INSTALMENT_CAPTURED`,
  `PAY_LATER_FINAL_CAPTURED`, `BALANCE_DUE_TRIGGERED`, `BALANCE_PAID`,
  `GUEST_CANCELLED`, `ADMIN_CANCELLED`, `AUTO_CANCEL_UNPAID_BALANCE`,
  `AUTO_CANCEL_PAY_LATER_DEFAULT`, `STAY_COMPLETED`, `AUTO_COMPLETED`,
  `ADMIN_FULL_REFUND_ISSUED`. Guards (sync, pure); `IllegalTransitionException` /
  `GuardFailedException`. Cancellation events route to `CANCELLED` vs `REFUNDED`
  by `refundAmountPaise`. Appends `{from,to,event,actorId,at,metadata?}`; **takes
  the caller's tx** (never opens its own).
- `state-machine.spec.ts` — 110 tests (full `status × event` matrix + guards +
  ADMIN_FULL_REFUND_ISSUED).

### Route all callsites — `booking.service.ts`, `payment.service.ts`, `admin.service.ts`
- `confirmPayment`, `transitionToBalanceDue` (per-row), `cancelBookingInternal`
  (event by caller: guest/admin/auto), `completeBooking` (STAY vs AUTO by actor),
  pay-later self-loop + final capture, admin partial-refund engine. **Grep proves
  zero direct `data: { status: 'X' }` writes outside the state machine.**

### Migration `0030` + `prisma/post-migrate/01_booking_gist_index.sql`
- `CREATE EXTENSION btree_gist` (txn-safe, in migration).
- `idx_booking_active_range` — GiST partial index on `(listingId, tsrange(startsAt,
  endsAt,'[)'))` `WHERE status IN (CONFIRMED_DEPOSIT, CONFIRMED_PAID, BALANCE_DUE,
  PAYMENT_PENDING)` — mirrors the overlap trigger's predicate. Applied
  `CONCURRENTLY` outside any txn via `pnpm --filter @dhyana/api post-migrate`.

### Retry wrapper — `apps/api/src/common/services/serializable-retry.ts`
- `withSerializableRetry(prisma, fn, opts)` — SERIALIZABLE + single retry on
  serialization failure (Prisma `P2034` / raw `40001` / "could not serialize
  access"). **Does not** retry `23P01` (real overlap conflict — propagates). Emits
  `metric=db.serialization_retry` log line (Prometheus wiring is a later pass).
  Used only in `createHold` and the webhook confirm handler.
- `serializable-retry.spec.ts` — 13 tests (detector, retry-once, 23P01-not-retried,
  fresh-tx-per-attempt).

### Seven-step atomic confirm — `booking.service.ts` `confirmPayment(tx, ...)`
1. `SELECT … FOR UPDATE` the booking. 2. Idempotency short-circuit
(already-confirmed → `didConfirm:false`; bad state → `ConflictException`).
3. Re-verify snapshot HMAC → `TamperedSnapshotException`. 4. Plan-aware amount
check → `AmountMismatchException`. 5. Explicit overlap query under the lock →
`ConflictException` (clean error before the trigger's 23P01). 6. State-machine
transition. 7. Ledger append + audit + payout line. Cancellation-policy snapshot
written on first confirm. Exceptions in `confirm-payment.exceptions.ts`.
`confirm-payment.spec.ts` — 14 tests.

### Migration `0031`
- `ProcessedRazorpayEvent { eventId PK, eventType, receivedAt }` — webhook dedup.
- `Booking.cancellationPolicySnapshot Json?` — refund tiers frozen at confirm;
  `PricingService.buildPolicySnapshot()` + `computeRefundAmount(...)` reads it.

### Cross-cutting
- `POST /bookings` gains `@UseInterceptors(IdempotencyInterceptor)`.
- `handleWebhook` reads `x-razorpay-event-id`, inserts into `ProcessedRazorpayEvent`
  **after** signature verify (P2002 duplicate → clean exit).
- Ledger UPDATE/DELETE immutability triggers verified in `0003_db_integrity`.

### Bug fixed during audit
- **Nested-transaction split-brain:** `confirmPayment` had opened its own tx while
  the webhook handler already held one. Refactored to a tx-scoped helper; the whole
  webhook handler is now wrapped in one `withSerializableRetry` so payment-capture +
  confirm + ledger commit atomically.

### Integration suite — `apps/api/test/integration/` (`pnpm test:int`, real Postgres)
- `harness.ts` — fixtures (guest/host/listing/rate) with a unique run tag; teardown
  toggles ledger triggers to delete test rows.
- `booking-engine.int-spec.ts` — overlap-trigger double-booking (incl. back-to-back
  allowed by half-open range), GiST index used (EXPLAIN with seqscan off), ledger
  UPDATE/DELETE blocked, `ProcessedRazorpayEvent` dedup, **concurrency proof A**
  (10 concurrent confirms → 1 wins, 9 no-ops), **concurrency proof B** (10 concurrent
  inserts same dates → exactly 1 survives), serializable-retry recovery — run at
  **50 iterations** (500 + 500 concurrent tx).
- `booking-services.int-spec.ts` — tampered-snapshot HMAC on a real DB row + state
  machine statusHistory persistence + illegal-transition reject.
- **17/17 integration tests pass** at 50 iterations; 0 orphan rows after teardown.

---

## 2026-06 — Phase-1 production hardening (Parts I–IV)

**Migrations:** `0025_booking_terms_acceptance`, `0026_trusted_contact_email`,
`0027_itinerary_chat_and_usage`, `0028_sos_chat`

### Part I — critical booking bugs (`payment.service.ts`, `booking.service.ts`)
- **Razorpay 100× overcharge:** snapshot amounts are paise; removed `× 100` at
  `createOrder`; renamed `amountInr`→`amountPaise`. `Payment.amount` is paise
  consistently (pay-later init fixed too).
- **Webhook unit mismatch:** stopped dividing captured paise by 100 → status
  transitions and payout amounts correct again.
- **Host-share:** `(subtotal + cleaningFee) × amountCaptured / total`, allocated
  proportionally; platform keeps the markup; no payout line when 0.

### Part II — booking flow (migration `0025`)
- **Quote/snapshot TTL:** `PriceSnapshot.expiresAt` (30 min, HMAC-covered);
  `initPayment` rejects expired snapshots with **410 Gone** (BALANCE skips).
- **GST 18%:** `gstRate`/`gstAmount` on platform fee + add-on commission; surfaced
  in quote + booking-detail UI; HMAC covers both.
- **Hold reaper** now `deleteMany`s expired rows (was audit-only).
- **Payment reconciliation cron** — `reconcileStalePayments` + `payment-recon.processor`
  queries Razorpay for `INITIATED` payments >30 min old and replays capture/failure.
- **Terms acceptance:** `Booking.acceptedTermsAt` required (`@IsDateString`); UI
  checkbox gates "Confirm booking".
- **Distributed cron locks:** deterministic BullMQ `jobId = bucketJobId(name,
  intervalMs)` so multi-instance schedulers dedupe.
- **ICS attachment** on booking-confirmed email (RFC 5545, all 3 email providers).
- **Auto-complete cron** — `autoCompleteCheckedOut` + `auto-complete.processor`
  (endsAt + 24h → COMPLETED, awards loyalty + referral credit).
- **Hold-expiry countdown UI**; add-ons **disabled** in the Phase-1 booking UI.

### Part III — SOS (migrations `0026`, `0028`)
- Env gates: `SOS_OPS_PHONE` (E.164) + `SOS_OPS_EMAIL` required in production;
  runtime guard in `SosBroadcastService`.
- **SMS circuit breaker** (in-memory, 3-failure threshold, 60s cooldown,
  HALF_OPEN probe; admin alert on open; `SosBroadcast.status` gains `SKIPPED`).
- **Ack-latency metric** — `getOpsMetrics` + `GET /admin/sos/metrics` (p50/p95/p99,
  SLA breaches vs 5s).
- **Platform-level SOS** (`0026`): `TrustedContact.email` added, `phone` nullable,
  "at least one of phone/email" DTO validator; broadcast fans out SMS + email.
- **SOS chat** (`0028`): `SosMessage` model; guest live incident page
  (`/sos/[id]`: status timeline + chat + `tel:` call), admin console
  (`/admin/sos/[id]`), guest history (`/guest/sos`); trigger redirects to the
  live console; guest/admin chat + timeline endpoints; 3s/5s polling.

### Part IV — AI Itinerary (migration `0027`)
- No silent stub in production (`ANTHROPIC_API_KEY` required; 503 on failure,
  never a fake plan); per-user `@Throttle` (5 gen/hr, 10 suggest/hr, 30 chat/hr);
  monthly cost cap via `ItineraryUsage` (default ₹50, **402** when exceeded);
  prompt caching (`cache_control: ephemeral`); single retry on 429/5xx.
- **3-step planner:** `POST /itineraries/suggestions` (3 concept cards) →
  `POST /itineraries/generate` (with `themeHint`) → `POST /itineraries/:id/messages`
  chat refinement (`ItineraryMessage`, assistant returns `{reply, patch}` that
  mutates `days`). Frontend: suggestions step in `/itineraries/new`, chat panel on
  `/itineraries/[id]`.

### Infrastructure
- Env validation: production requires `REDIS_HOST` (non-localhost),
  `ANTHROPIC_API_KEY`, SOS ops contacts; `AppModule` throws on unreachable Redis in
  prod. Installed **Memurai** for local BullMQ. Fixed geolocation
  `Permissions-Policy` to `geolocation=(self)` (`apps/web/next.config.js`).
- `docs/PRODUCTION_LAUNCH_ROADMAP.md` — 7-part launch plan.

---

## 2026-04-23 — Remaining spec sections

**Commit:** `3c0f24e` · **Migrations:** `0021`–`0024`

See root `CHANGELOG.md` for the summary. Modules: Experiences (host/guest/public/
admin, atomic seat allocation), Trip Groups + expense splitting, AI Itinerary v1,
Concierge Chat + host quick replies, Investor Dashboard, Discovery facets. 88 files,
migrations 0021–0024.
