# Changelog

All notable changes to **Dhyana Stays** are recorded here. Newest first.
Format: [Keep a Changelog](https://keepachangelog.com/). Migrations cited as
`0000_name`; commits as short SHAs.

**Two-tier changelog:**
- **This file** — concise, scannable summary (one line per item).
- **[`docs/CHANGELOG-detailed.md`](docs/CHANGELOG-detailed.md)** — granular record
  (files, method/endpoint signatures, migration DDL, rationale, test results).

> **Convention:** every change is recorded in *both* files — a one-line entry here
> under the current dated section (right category: Added / Changed / Fixed /
> Security / Infrastructure / Migration), and a full breakdown in the detailed file.
> Cite the migration and/or commit.

---

## 2026-07-17 — Discovery map loading and empty states

### Added
- Added non-blocking loading, error, and empty-area overlays for Map and Split
  views while keeping the Leaflet map visible and interactive.
- Map viewport errors are now handled separately from page-level Discovery
  errors, and stale requests cannot incorrectly change the loading state.

---

## 2026-07-17 — Discovery map price markers

### Changed
- Replaced standard Leaflet pins with theme-aware nightly-price markers and
  improved listing popups with property type, location, guest capacity,
  experience, price, and listing links.
- Selected markers now receive a highlighted state when their matching card is
  hovered in split view.

---

## 2026-07-17 — Discovery map viewport loading

### Changed
- Map and split views now load approved listings for the current Leaflet
  viewport through `GET /api/listings/map`, ignore stale responses, and keep
  active search and filter results applied to visible markers and split cards.
- Removed duplicate map requests by relying on Leaflet's `moveend` event, and
  corrected coordinate checks so valid zero latitude or longitude values are
  supported.

---

## 2026-07-17 — Discovery map bounds validation

### Fixed
- `GET /api/listings/map` now rejects missing, non-numeric, or out-of-range
  coordinates with `400 Bad Request` instead of allowing invalid `NaN` values
  to reach Prisma and return `500 Internal Server Error`. Added unit coverage
  in `apps/api/src/listing/listing.service.spec.ts`.

---

## 2026-07-16 — Docs: discovery/map handoff brief

### Added
- **[`docs/HANDOFF-discovery-map.md`](docs/HANDOFF-discovery-map.md)** — brief
  for the developer taking over discovery/search + map work: setup pointer,
  scope, file map (both apps), project conventions (paise, Meili-fallback,
  design tokens, changelog), guardrails (booking/payment engine off-limits),
  definition of done. Work happens on `feature/discovery-map`, PRs to `dev`.

---

## 2026-07-16 — CORS: graceful denial + wildcard origins (fixes login 500)

### Fixed
- `apps/api/src/main.ts`: a disallowed `Origin` header made the CORS callback
  **throw** → unhandled 500 on every request — including same-origin traffic
  proxied through the web app's `/api` rewrite (the proxy forwards the browser's
  Origin). Now denies gracefully (`callback(null, false)` + warn log): the
  request proceeds, the browser enforces cross-origin blocking, and rewrite
  traffic just works.
- `ALLOWED_ORIGINS` entries now support `*` wildcards
  (e.g. `https://myapp-*.vercel.app`) to cover Vercel's per-deployment URLs.

---

## 2026-07-16 — Web: tolerate trailing slash in NEXT_PUBLIC_API_URL

### Fixed
- `apps/web/next.config.js`: the `/api/*` rewrite now strips trailing slashes
  from `NEXT_PUBLIC_API_URL`. A value saved as `https://host/` produced
  `https://host//api/...` → 404 (`Cannot GET //api/listings`) on the deployed
  site.

---

## 2026-07-16 — Allow NODE_ENV=staging (deployed-for-testing mode)

### Fixed
- `env.validation.ts`: `NODE_ENV` enum now includes **`staging`** — the mode the
  Render blueprint uses. The API crashed at boot (`"NODE_ENV" must be one of
  [development, test, production]`). Every code branch checks `=== 'production'`,
  so staging behaves like development (stub providers legal) while running live;
  production-only strictness is unchanged.

---

## 2026-07-12 — Fix Render deploy crash: pnpm layout in API runtime image

### Fixed
- `apps/api/Dockerfile` runtime stage: container crashed on boot with
  `Cannot find module '@nestjs/common'`. pnpm links each package's deps inside
  its own `node_modules` as relative symlinks into the root `.pnpm` store; the
  runtime stage flattened `dist` to `/app` and copied only the root
  `node_modules`, breaking resolution. Now preserves the workspace layout
  (root store + `apps/api/node_modules` + `apps/api/dist`) and runs from
  `WORKDIR /app/apps/api`.

---

## 2026-07-12 — CI green: fix all 273 lint errors + the last failing unit test

### Fixed
- **ESLint config** (`eslint.config.mjs`): spec files may use `any` (mocks need
  it — kills ~230 noise errors); `no-unused-vars` now honors the `^_` convention
  (BullMQ `_job` params etc.).
- **~40 real lint errors fixed properly across 17 src files**: dead imports
  removed (payout/referral/feature-flag controllers, mfa, investor, trip-group,
  add-on, DTOs); `where: any` → typed `Prisma.BookingWhereInput`/
  `AuditLogWhereInput` (admin, booking, host-analytics); JSON casts →
  `Prisma.InputJsonValue`; `priceSnapshot as any` → narrow snapshot types;
  `(line.host as any)` → typed host-user shape (payout); `require('crypto')` →
  top-level import (storage); dead `TxClient` alias removed (payment);
  20 stale eslint-disable directives auto-removed.
- **`listing.service.spec.ts` — the long-standing pre-existing failure**: the
  mock returned the ownership-check row for every `findUnique`, but
  `updateHostListing` re-fetches after update and returns that row. Mock now
  models both reads. Unit suite fully green for the first time: **260/260**.

---

## 2026-07-12 — Deployment kit: live staging on Render + Vercel

### Added
- **[`render.yaml`](render.yaml)** — Render Blueprint provisioning the API
  (Docker), PostgreSQL 16, and a Redis-compatible Key Value store
  (`noeviction` for BullMQ) in one click; `NODE_ENV=staging` so stub providers
  stay legal while live; auto-generated JWT/price-snapshot secrets.
- **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)** — step-by-step live-for-testing
  guide (Render + Vercel + Razorpay test mode), the third-party services list
  split into required-for-testing vs required-for-production (mirroring
  `env.validation.ts`), migrate/seed-from-local commands, webhook setup, smoke-test
  checklist, and the production upgrade path.
- **[`.dockerignore`](.dockerignore)** — critical: Docker builds previously had
  no ignore file, so `COPY . .` would have baked local `.env` secrets (and
  node_modules/build outputs) into images.

### Changed
- `apps/api/Dockerfile`: prisma client generation now calls
  `pnpm --filter @dhyana/api exec prisma generate` directly — the package script
  wraps it in `dotenv -e .env`, which is absent (correctly) from the build context.

---

## 2026-07-12 — Docs: clone & setup guide

### Added
- **[`docs/SETUP.md`](docs/SETUP.md)** — complete new-machine setup guide:
  prerequisites table (Node 22, pnpm 10.2.0, Postgres 16, Redis/Memurai,
  Meilisearch optional), key dependency versions, env-file walkthrough with the
  minimum required edits, Docker and native (Windows) infra paths, DB
  migrate → GiST post-migrate → seed sequence, dev/test/production commands,
  and a copy-paste quick-reference block.

---

## 2026-07-12 — Fix IDE "Cannot find name 'jest'" in API spec files

### Fixed
- `apps/api/tsconfig.json`: added explicit `"types": ["node", "jest"]`. The real
  compiler always resolved Jest globals (0 errors, tests green), but VS Code's
  TS server intermittently failed the automatic `@types` visibility scan under
  pnpm-on-Windows symlinks, flooding spec files with false `Cannot find name
  'jest'/'describe'/'it'/'expect'` diagnostics. Explicit types make resolution
  deterministic. No ambient globals from other `@types` packages are in use, so
  nothing else is affected.

---

## 2026-07-08 — Dev performance: Turbopack + Redis recovery

### Changed
- **Web dev server now uses Turbopack** (`next dev --turbopack`) — page-to-page
  clicks in dev were slow because webpack compiled each of the 80+ routes
  on-demand (measured 3.5s first visit vs 0.5s after); Turbopack compiles
  drastically faster. Production builds unchanged.

### Infrastructure (local dev, no code change)
- Diagnosed "slow clicks": API was healthy (~60 ms); Redis (Memurai Windows
  service) was stopped, silently disabling all 12 background queues (hold
  expiry, balance due, outbox, SOS…). Started Memurai, restarted the API —
  all queues re-registered. Meilisearch remains down (no Docker on this
  machine); listing search gracefully falls back to Postgres.

---

## 2026-07-08 — Nature-luxury visual theme (all pages)

### Changed
- **Design system re-skinned to a nature-luxury palette** — because every page
  reads colors from CSS variables, redefining the tokens in `globals.css`
  restyled all 76 pages at once: deep-evergreen brand scale (light) / soft sage
  (dark), warm ivory & stone neutrals replacing cool grays, forest-night dark
  surfaces, warm glass/nav tints, forest-tinted shadows, and an ambient evergreen
  wash behind every page.
- **Antique-gold accent** (`--gold`, Tailwind `gold`, `.text-gold`, `.eyebrow`):
  gold-tinted button shimmer, evergreen→gold `.text-gradient` and
  `.gradient-border`.
- **Listing photo placeholders** now use deterministic forest/moss gradients
  instead of monochrome blacks.

### Fixed
- Production build: wrapped `useSearchParams()` in Suspense boundaries on
  `/auth/register` and `/sos` (pre-existing prerender failures that blocked
  `next build`). All 76 pages now prerender.

---

## 2026-07-08 — Docs: Word test report + roadmap

### Added
- **[`docs/booking-engine-test-report.docx`](docs/booking-engine-test-report.docx)** —
  native Word version of the test report (converted with the `docx` lib; headings,
  8 tables, code blocks preserved).
- **[`docs/TODO.md`](docs/TODO.md)** — prioritized P0–P3 roadmap after the
  hardening pass: housekeeping (push, untrack `dist/`, listing-spec triage),
  engine follow-ups (integration tests in CI, pay-later 2+, balance notification),
  product gaps (PAY_LATER in booking UI), launch readiness.

---

## 2026-07-06 — Booking-engine hardening: top-standard test suite + 4 reliability fixes

Comprehensive real-service integration suite for the booking engine
(`test/integration/booking-lifecycle.int-spec.ts`, 17 tests) exercising the full
lifecycle through the *actual* production services. It exposed four genuine
defects — all fixed; engine now green across 260 unit + 34 integration tests and
the concurrency proofs at 50 iterations.

### Fixed
- **Payment confirmation was broken for every capture.** The overlap backstop
  query in `BookingService.confirmPayment` used `tsrange(...)` with JS `Date`
  params, which Prisma binds as `timestamptz` — no matching `tsrange` overload,
  so the query threw `42883` on *every* capture. Bound params now converted to
  the UTC wall-clock the `timestamp` columns store (`AT TIME ZONE 'UTC'`). The
  existing unit test had mocked `$queryRaw`, so it never caught this.
- **DEPOSIT_50 balance never settled.** Paying the balance marked the payment
  CAPTURED but left the booking at `BALANCE_DUE` forever (no `CONFIRMED_PAID`, no
  balance ledger entry, no second payout). `BALANCE_PAID` was dead code with no
  emitter. Added `BookingService.settleBalance` (lock → idempotency → HMAC →
  amount vs `balanceAmount` → `BALANCE_PAID` → ledger → second payout line) and
  routed balance captures to it in `handlePaymentCaptured` (by booking status).
- **Auto-complete cron under-counted and logged false warnings.** It passed the
  sentinel `'SYSTEM_AUTO_COMPLETE'` as `AuditLog.actorUserId` (a nullable FK to
  User), so the post-commit audit write threw *after* the booking was already
  COMPLETED. System completions now log `actorUserId = null` (sentinel kept in
  metadata).
- **PAY_LATER bookings could never be paid.** `initPayment` had no `PAY_LATER`
  branch (rejected FULL/DEPOSIT/BALANCE), yet `confirmPayment` fully supported the
  first capture — so a guest could create an un-payable booking that held
  inventory. Wired the first (booking-time) instalment using
  `snapshot.payLaterFirstInstalment`.

### Changed
- `BALANCE_PAID` state transition now also accepts `CONFIRMED_DEPOSIT` (balance
  paid early, before the balance-due cron), not just `BALANCE_DUE`.

### Tests / Infrastructure
- New real-service harness (`test/integration/services-harness.ts`): wires every
  real booking service against dev Postgres; only NotificationService (no-op) and
  Razorpay (stub mode) are doubled.
- New lifecycle suite covers quote (paise/GST/HMAC/TTL), FULL + DEPOSIT_50 +
  PAY_LATER lifecycles, money math (ledger + host-payout sums), cancellation
  refund tiers (100/50/0), webhook replay/amount-mismatch/tamper, idempotency
  keys, crons, and overlap/expired-hold guards.
- Unit tests added for `settleBalance` (6) and balance-capture routing (1).
- `teardownFixtures` rewritten to clean rows minted with random cuIDs by the real
  services (relationship-based; adds Refund / HostNotification / GuestNotification).
- **Test report:** [`docs/booking-engine-test-report.md`](docs/booking-engine-test-report.md)
  — full inventory (34 integration + new unit cases), methodology, the 4 defects,
  money-correctness math, and results.

---

## 2026-07-02 — Hold lifecycle: release-on-abandon + shared visibility

Commit `0f38f27`.

### Added
- **Release a hold when the guest abandons the flow.** `HoldService.releaseHold`
  (owner-only, idempotent, refuses holds already converted to a booking) +
  `DELETE /holds/:id`. Frees the dates immediately instead of holding them for the
  full 15-minute TTL.
- **Hold status for other guests.** `HoldService.getHoldStatus` →
  `{ held, mine, heldUntil, remainingSeconds }` + `GET /holds/status`. The
  hold-create conflict response is enriched with `heldUntil` + `remainingSeconds`.

### Changed
- **Booking panel** (`apps/web/app/listings/[id]`): releases the hold on tab close
  (`pagehide` + `fetch(keepalive)`), SPA unmount, and an explicit "Back (release
  hold)" button — guarded so a hold that became a booking is never released. Shows
  a live **"on hold — MM:SS remaining"** banner to other guests at quote time and
  on a lost race; disables the Hold button until the countdown expires, then
  auto-rechecks. The hold-reaper cron remains the backstop.

---

## 2026-07-02 — Platform Control Panel + Feature Flags

Commit `2b67128`. Migration `0032_feature_flags_host_settings`.

### Added
- **Feature-flag system.** Canonical code registry (`feature-flags.registry.ts`,
  12 features / 7 categories) merged with admin DB overrides (`FeatureFlag`).
  `FeatureFlagService` with a 15s hot-path cache.
- **`@FeatureGate('key')` decorator + global `FeatureGuard`** — a disabled feature
  returns **503** for everyone (admins included). Applied to 14 feature controllers
  (experiences, trip-groups, itineraries, SOS, membership, referrals, pay-later,
  investor, guest/host messaging, guest/host concierge).
- **Endpoints:** `GET /admin/features`, `PATCH /admin/features/:key`,
  `PATCH /admin/features/bulk` (L1+); public `GET /platform/features` (enabled map).
- **Host control panel.** `HostSetting` model + `GET/PATCH /host/settings` —
  `instantBook`, `allowGuestMessages`, `allowConciergeChat`, `emailOnNewBooking`,
  `smsOnNewBooking`.
- **Admin control panel UI** (`/admin/control-panel`) — grouped toggles,
  critical-feature confirm, search, optimistic updates.
- **Host control panel UI** (`/host/control-panel`) — own toggles + read-only
  platform feature availability.
- **`FeatureContext`** (web) for UI gating; navbar hides disabled features and
  links to both control panels.

### Changed
- Messaging `startConversation` (guest→host) gated by host `allowGuestMessages`;
  concierge access gated by `allowConciergeChat`.

---

## 2026-06 — Booking-engine production-correctness pass

Migrations `0029_booking_status_history`, `0030_booking_gist_index`,
`0031_booking_correctness_pass`. (Landed under commit `2b67128`.)

### Added
- **`BookingStateMachine`** — single chokepoint for every `Booking.status`
  transition with an append-only `statusHistory` audit trail. Illegal transitions
  rejected. All status writes route through it (grep-verified zero direct writes).
- **`withSerializableRetry`** — SERIALIZABLE isolation + single retry on 40001/P2034,
  emits `db.serialization_retry` metric log. Used only in `createHold` and confirm.
- **Seven-step atomic confirm** (`confirmPayment`, tx-scoped): FOR UPDATE →
  idempotency → HMAC re-verify → amount check → overlap check → state machine →
  ledger append. Exceptions `TamperedSnapshotException`, `AmountMismatchException`.
- **GiST partial index** `idx_booking_active_range` (mirrors the overlap trigger's
  predicate), applied `CONCURRENTLY` via `prisma/post-migrate/` + `pnpm post-migrate`.
- **`ProcessedRazorpayEvent`** — webhook event-ID dedup (INSERT after signature verify).
- **`Booking.cancellationPolicySnapshot`** — refund tiers frozen at confirm; cancel
  reads the snapshot, never the live policy.
- **Idempotency** on `POST /bookings` via `IdempotencyInterceptor`.
- **Integration suite** (`test/integration/`, real Postgres, `pnpm test:int`):
  overlap-trigger double-booking prevention, GiST index usage, ledger immutability,
  webhook dedup, **concurrency proofs at 50 iterations** (exactly-one-winner),
  serializable retry, tampered-snapshot HMAC, state-machine persistence.

### Fixed
- **Nested-transaction split-brain** in the webhook confirm path — `confirmPayment`
  is tx-scoped (inline steps) and `withSerializableRetry` wraps the whole webhook
  handler, so payment-capture + confirm + ledger commit atomically.

---

## 2026-06 — Phase-1 production hardening (Parts I–IV)

Migrations `0025_booking_terms_acceptance`, `0026_trusted_contact_email`,
`0027_itinerary_chat_and_usage`, `0028_sos_chat`.

### Fixed — Part I (critical booking bugs)
- **Razorpay 100× overcharge** — snapshot amounts are paise; removed the erroneous
  `× 100` at `createOrder`.
- **Webhook unit mismatch** — stopped dividing captured paise by 100 (had broken
  status transitions and under-recorded payouts).
- **Host-share computation** — host receives `subtotal + cleaningFee` allocated
  proportionally to the captured amount; platform keeps the markup.

### Added / Changed — Part II (booking flow)
- 30-min **quote/snapshot TTL** (HMAC-covered `expiresAt`; 410 on expired).
- **GST 18%** line item on platform fee + add-on commission.
- **Hold reaper** now deletes expired rows (was audit-only).
- **Payment reconciliation cron** (recovers missed webhooks).
- **Server-enforced terms acceptance** (`acceptedTermsAt` required).
- **Distributed cron locks** via deterministic BullMQ job IDs.
- **ICS calendar attachment** on the booking-confirmed email.
- **Auto-complete cron** (stay ended 24h+ ago → COMPLETED).
- Frontend **hold-expiry countdown**; add-ons **disabled in Phase 1 UI**.

### Added / Changed — Part III (SOS)
- Production env gates (`SOS_OPS_PHONE`/`SOS_OPS_EMAIL`), **SMS circuit breaker**,
  ack-latency metrics, strict E.164 validation.
- **Platform-level SOS**: trusted contacts support email + phone; broadcast fans
  out to both.
- **SOS console**: guest live incident page (status timeline + chat + call), admin
  incident console, guest SOS history; trigger redirects to the live console.

### Added / Changed — Part IV (AI Itinerary)
- No silent stub in production; per-user rate limits; monthly cost cap
  (`ItineraryUsage`); prompt caching; retry/backoff.
- **3-step planner**: trip form → AI concept suggestions → full plan → chat
  refinement (`ItineraryMessage`).

### Infrastructure
- Env validation requires `REDIS_URL`, `ANTHROPIC_API_KEY`, SOS ops contacts in
  production; app fails fast if Redis is unreachable in prod.
- Installed **Memurai** (Redis-compatible) for BullMQ locally.
- Fixed geolocation `Permissions-Policy` (`geolocation=(self)`) for the SOS page.
- `docs/PRODUCTION_LAUNCH_ROADMAP.md` — 7-part launch plan.

---

## 2026-04-23 — Remaining spec sections

Commit `3c0f24e`. Migrations `0021`–`0024`.

### Added
- **§5.15 Experiences** — host/guest/public/admin, atomic seat allocation
  (`0024_experiences_groups_itinerary`).
- **§5.8 Trip Groups** + expense splitting (EQUAL/CUSTOM) + balances.
- **§5.9 AI Itinerary** — generation via Anthropic Haiku.
- **§5.10 Concierge Chat** (`0021_concierge_chat`) + host quick replies.
- **§5.14 Investor Dashboard** (`0022_investor_dashboard`).
- **§5.18 Discovery facets** (`0023_listing_discovery_facets`).

---

## 2026-04-19 — SOS service foundation

Commit `de191fd`. Migration `0020_sos_support`.

### Added
- SOS incident service, trusted-contact register, BullMQ `sos-broadcast` queue
  (priority 1, inline dispatch for the P99 < 5s SLA).

---
<!-- ── Historical entries below (Phase 1/2, Auth0, providers) ──────────────── -->

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
