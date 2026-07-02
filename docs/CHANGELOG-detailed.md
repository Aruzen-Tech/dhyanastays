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
