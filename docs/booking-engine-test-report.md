# Booking Engine — Test Report

**Project:** Dhyana Stays · **Component:** Booking Engine (quote → hold → booking →
payment → confirm → balance → cancel/refund → complete → payout)
**Date:** 2026-07-06 · **Author:** Engineering (Claude Code assisted)
**Related:** [`CHANGELOG.md`](../CHANGELOG.md) · [`docs/CHANGELOG-detailed.md`](./CHANGELOG-detailed.md)

---

## 1. Executive summary

A top-standard, real-service test suite was built for the booking engine and run
against the actual production code paths. The suite **exposed four genuine
production defects** — including two that broke core money flows — all of which
were fixed. After the fixes the engine is **green across every booking-engine
suite**, including concurrency proofs at 50 iterations.

| Metric | Result |
|---|---|
| Unit tests (platform-wide) | **259 passed**, 1 pre-existing unrelated failure |
| Integration tests (all suites) | **34 passed / 34** |
| New booking-lifecycle integration tests | **17 passed / 17** |
| New unit tests (settleBalance + routing) | **7 passed / 7** |
| Concurrency proofs @ 50 iterations | **green** (idempotency race + double-booking race) |
| Defects found | **4** (2 critical, 1 high, 1 medium) |
| Defects fixed | **4 / 4** |
| Leaked test rows after full run | **0** (verified) |

**Headline defects fixed**

1. **Critical** — payment confirmation threw on *every* capture (`tsrange`
   timestamptz mismatch).
2. **Critical** — DEPOSIT_50 balance payment never settled (`BALANCE_PAID` was
   dead code); money captured but booking stuck, no balance ledger/payout.
3. **High** — auto-complete cron under-counted and logged false warnings (FK
   violation on a sentinel actor id).
4. **Medium** — PAY_LATER bookings could be created but never paid (`initPayment`
   had no PAY_LATER branch), tying up inventory.

---

## 2. Objectives & scope

**Objective (as requested):** create top-standard test coverage for the booking
engine, run it against the real engine, and — where tests fail — fix the engine so
it is strong and reliable (not just patch the tests).

**In scope**

- Pricing/quote correctness (paise arithmetic, platform fee, GST, HMAC signature, TTL).
- Full booking lifecycles: **FULL**, **DEPOSIT_50** (deposit → balance), **PAY_LATER**.
- Money integrity: immutable ledger entries and host payout lines per capture.
- Cancellation refund tiers (100% / 50% / 0%) from the frozen policy snapshot.
- Webhook robustness: replay idempotency, amount mismatch, tampered snapshot.
- Idempotency keys (hold / booking / payment).
- Scheduled transitions (crons): balance-due, auto-cancel unpaid balance, auto-complete.
- Concurrency control: SERIALIZABLE + `FOR UPDATE` (confirm-idempotency and
  double-booking races), DB integrity triggers/constraints.

**Out of scope**

- Non-booking modules (listings moderation, discovery, analytics, concierge, etc.).
- HTTP/controller layer, auth, and front-end (the suite calls the same service
  methods the controllers invoke; transport is not re-tested here).
- Live Razorpay gateway calls (stub mode used deterministically).

---

## 3. Test methodology

### 3.1 Real-service integration harness (the key decision)

Rather than mock the engine or bootstrap the full NestJS app (Redis/BullMQ +
`forwardRef` complexity), the suite wires the **actual production services**
against the **real dev PostgreSQL** and stubs only the two truly external
adapters. This means every assertion exercises real state-machine transitions,
real ledger writes, real payout math, and real SQL — proving the engine, not a
re-implementation.

| Component | In the test |
|---|---|
| `PricingService`, `HoldService`, `BookingService`, `PaymentService`, `PayLaterService` | **Real** |
| `LedgerService`, `AuditService`, `PriceSnapshotSignerService`, `BookingStateMachine` | **Real** |
| `OutboxService`, `ReferralService`, `MembershipService`, `AddOnService` | **Real** |
| PostgreSQL (dev `dhyana_stays`) | **Real** (migrations + triggers + GiST/partial indexes) |
| `NotificationService` | **Stubbed** — no-op (no email/SMS) |
| `RazorpayService` | **Real class, stub mode** — no keys → deterministic `stub_order_*` ids; `verifyWebhookSignature` → true |

Harness files:

- [`test/integration/services-harness.ts`](../apps/api/test/integration/services-harness.ts)
  — `makeEngine(prisma)` factory; `capturedEvent()` / `failedEvent()` webhook builders.
- [`test/integration/harness.ts`](../apps/api/test/integration/harness.ts)
  — fixtures (`setupFixtures` / `teardownFixtures`), snapshot signing helpers,
  `RUN_TAG` isolation.
- [`test/integration/booking-lifecycle.int-spec.ts`](../apps/api/test/integration/booking-lifecycle.int-spec.ts)
  — the lifecycle suite.

### 3.2 Test isolation & cleanup

- Every fixture row is tagged with a per-run `RUN_TAG` (`inttest_<ts>_<rand>`).
- Each lifecycle test uses a **distinct, non-overlapping date window** (`nextWindow`),
  so the overlap trigger never false-positives across tests.
- `teardownFixtures` deletes all rows created by the run. Because the real services
  mint their own random cuIDs, teardown identifies bookings by their **FK to the
  RUN_TAG listing** and cascades children (Refund, PayoutLine, Payment, LedgerEvent,
  HostNotification, GuestNotification) before deleting parents. LedgerEvent
  immutability triggers are briefly disabled (as table owner) to remove test rows.
- Post-run verification confirmed **0 leaked rows**.

### 3.3 Execution

```bash
# All integration suites
pnpm --filter @dhyana/api exec dotenv -e .env -- \
  jest --config jest-integration.config.json --runInBand --forceExit

# Concurrency proofs at 50 iterations
INT_CONCURRENCY_ITERATIONS=50 pnpm --filter @dhyana/api exec dotenv -e .env -- \
  jest --config jest-integration.config.json --runInBand --forceExit \
  test/integration/booking-engine.int-spec.ts

# Unit suite
pnpm --filter @dhyana/api exec jest
```

---

## 4. Test data fixture (money reference)

A single listing priced at **₹5,000/night**, 3-night stay, 2 guests. All amounts
in **paise** (1 INR = 100 paise). This is the arithmetic every money assertion
checks against:

| Line | Paise | Rupees | Derivation |
|---|---:|---:|---|
| Subtotal | 1,500,000 | ₹15,000 | 3 × ₹5,000 |
| Cleaning fee | 100,000 | ₹1,000 | fixed |
| **Accommodation** | **1,600,000** | **₹16,000** | subtotal + cleaning (= host payout base) |
| Platform fee | 160,000 | ₹1,600 | 10% of accommodation |
| GST | 28,800 | ₹288 | 18% of platform fee |
| **Total (guest pays)** | **1,788,800** | **₹17,888** | accommodation + fee + GST |
| Deposit (50%) | 894,400 | ₹8,944 | total ÷ 2 |
| Balance (50%) | 894,400 | ₹8,944 | total ÷ 2 |
| **Host payout** | **1,600,000** | **₹16,000** | full accommodation, eligible 24h after check-in |

Payout is proportional to the amount captured:
`hostShare = round(accommodation × amountCaptured / total)` — so a FULL capture
yields one payout line of 1,600,000, while deposit + balance yield two lines of
800,000 each (sum 1,600,000).

---

## 5. Test inventory & results

### 5.1 Lifecycle suite — `booking-lifecycle.int-spec.ts` (17/17 ✅)

| # | Test | Key assertions | Result |
|---|---|---|:--:|
| 1 | Quote: paise, GST, HMAC, TTL | subtotal 1,500,000; cleaning 100,000; platformFee 160,000; gst 28,800; total 1,788,800; deposit=balance=894,400; HMAC round-trips via signer; TTL > now+25min | ✅ |
| 2 | FULL: hold → PAYMENT_PENDING → capture → CONFIRMED_PAID | status PAYMENT_PENDING then CONFIRMED_PAID; statusHistory = `[CONFIRMED_PAID]`, event `PAYMENT_CONFIRMED_FULL`; 1 ledger capture = 1,788,800; 1 payout = 1,600,000; policy snapshot tiers `[100,50,0]` | ✅ |
| 3 | DEPOSIT_50: deposit → CONFIRMED_DEPOSIT → balance-due cron → balance → CONFIRMED_PAID | status walks DEPOSIT→BALANCE_DUE→CONFIRMED_PAID; **2 ledger captures summing 1,788,800**; **2 payout lines summing 1,600,000** | ✅ |
| 4 | PAY_LATER: first instalment capture → CONFIRMED_DEPOSIT + plan | status CONFIRMED_DEPOSIT; `PayLaterPlan` created, months=3; seq-1 instalment `paidAt` set | ✅ |
| 5 | Cancel ≥48h before check-in → 100% refund | status REFUNDED; 1 Refund = 1,788,800; 1 REFUND_ISSUED ledger = 1,788,800 | ✅ |
| 6 | Cancel 10–48h → 50% refund | status REFUNDED; Refund = 894,400 | ✅ |
| 7 | Cancel <10h → 0% refund | status CANCELLED; **no** Refund row | ✅ |
| 8 | Webhook replay ×3 (same event id) | booking CONFIRMED_PAID; exactly 1 statusHistory entry; exactly 1 PAYMENT_CAPTURED ledger; 1 dedup row | ✅ |
| 9 | Capture with mismatched amount (off by ₹1) | rejected; booking stays PAYMENT_PENDING; 0 ledger captures | ✅ |
| 10 | Capture with tampered price snapshot | rejected; booking stays PAYMENT_PENDING | ✅ |
| 11 | Idempotency: same hold key → same hold row | `h2.id === h1.id` | ✅ |
| 12 | Idempotency: same holdId → one booking | `b2.id === b1.id` (one booking per hold) | ✅ |
| 13 | Idempotency: same payment key → same order | `p2.paymentId === p1.paymentId` | ✅ |
| 14 | Cron: `autoCancelUnpaidBalance` past grace | booking ∈ {CANCELLED, REFUNDED} | ✅ |
| 15 | Cron: `autoCompleteCheckedOut` (ended 25h ago) | booking COMPLETED | ✅ |
| 16 | Guard: confirmed booking blocks a new overlapping hold | `createHold` rejected | ✅ |
| 17 | Guard: `createBooking` on an expired hold | rejected | ✅ |

### 5.2 Concurrency & DB-integrity — `booking-engine.int-spec.ts` (11/11 ✅ @ 50 iterations)

| # | Test | Assertion | Result |
|---|---|---|:--:|
| 1 | Overlap trigger rejects a second overlapping booking (even at PAYMENT_PENDING) | conflict set includes PAYMENT_PENDING | ✅ |
| 2 | Back-to-back bookings allowed (checkout day == next check-in day) | half-open range, no false conflict | ✅ |
| 3 | Partial index exists with the correct predicate | index present | ✅ |
| 4 | Overlap query uses the index (planner picks it, seqscan disabled) | index-only usable | ✅ |
| 5 | LedgerEvent immutability blocks UPDATE | trigger raises | ✅ |
| 6 | LedgerEvent immutability blocks DELETE | trigger raises | ✅ |
| 7 | Unique constraint rejects duplicate `eventId` | constraint raises | ✅ |
| 8 | Only ONE of N concurrent inserts of the same eventId wins | exactly 1 | ✅ |
| 9 | **Proof A — confirm idempotency race** | 50×: exactly 1 winner, 9 no-ops, 1 history entry, no error leak | ✅ |
| 10 | **Proof B — double-booking race** | 50×: exactly 1 CONFIRMED booking survives each race | ✅ |
| 11 | SERIALIZABLE retry succeeds after a 40001 serialization failure | retries once, succeeds | ✅ |

> Proofs A and B directly exercise the overlap query modified by **Defect 1**'s fix;
> passing at 50 iterations confirms the fix is correct under concurrent load.

### 5.3 Signer & state-machine on real DB — `booking-services.int-spec.ts` (6/6 ✅)

| # | Test | Result |
|---|---|:--:|
| 1 | `verify()` passes for an untampered snapshot read back from the DB | ✅ |
| 2 | `verify()` fails after the snapshot total is mutated directly in the DB | ✅ |
| 3 | Re-signing a tampered snapshot would not match the original signature | ✅ |
| 4 | `PAYMENT_CONFIRMED_FULL` appends a statusHistory entry persisted to the DB | ✅ |
| 5 | Illegal transition rejected; DB row left untouched | ✅ |
| 6 | Full lifecycle persists ordered statusHistory PENDING→DEPOSIT→BALANCE_DUE→PAID→COMPLETED | ✅ |

### 5.4 New unit tests (7/7 ✅)

`src/booking/confirm-payment.spec.ts` — **6** new `settleBalance` cases:

| Case | Assertion |
|---|---|
| BALANCE_DUE settle | transitions `BALANCE_PAID`, writes PAYMENT_CAPTURED ledger + 2nd payout, `didSettle=true` |
| Early settle from CONFIRMED_DEPOSIT | transitions `BALANCE_PAID` |
| Idempotent replay (already CONFIRMED_PAID) | `didSettle=false`, no ledger/payout/transition |
| Amount ≠ `balanceAmount` | throws `AmountMismatchException` |
| Tampered snapshot | throws `TamperedSnapshotException` |
| Invalid status (PAYMENT_PENDING) | throws `ConflictException` |

`src/payment/payment.service.spec.ts` — **1** new routing case: a BALANCE capture on
a `BALANCE_DUE` booking routes to `settleBalance` (not `confirmPayment`) and does
**not** re-send the confirmation notification. (Also fixed the pre-existing
captured-webhook test's tx mock to provide `booking.findUnique`.)

---

## 6. Defects found & fixed

### Defect 1 — Payment confirmation threw on every capture *(Critical)*

- **Symptom:** every `payment.captured` webhook raised Postgres `42883`
  (`function tsrange(timestamp with time zone, …) does not exist`); no booking
  could ever reach a confirmed state.
- **Root cause:** the overlap backstop in `BookingService.confirmPayment` built
  `tsrange(${booking.startsAt}, ${booking.endsAt}, '[)')`. The `startsAt`/`endsAt`
  columns are Prisma `DateTime` → Postgres `timestamp` (no tz), but `$queryRaw`
  binds a JS `Date` parameter as `timestamptz`; there is no `tsrange(timestamptz,
  timestamptz, unknown)` overload.
- **Why it was invisible:** the existing unit test mocked `$queryRaw` (never ran
  the SQL); prior integration tests only inserted dedup rows and never drove a real
  capture.
- **Fix:** convert the bound params back to the UTC wall-clock the column stores —
  `tsrange((… ::timestamptz AT TIME ZONE 'UTC'), …, '[)')`.
  ([`booking.service.ts`](../apps/api/src/booking/booking.service.ts))
- **Verification:** all captures now succeed; double-booking race green @ 50 iterations.

### Defect 2 — DEPOSIT_50 balance never settled *(Critical, money integrity)*

- **Symptom:** paying the balance on a deposit booking marked the payment
  `CAPTURED` but left the booking at `BALANCE_DUE` permanently — no `CONFIRMED_PAID`,
  no balance ledger entry, no second payout line. Money-state inconsistent.
- **Root cause:** the `BALANCE_PAID` transition existed in the state machine but had
  **no emitter**. A balance capture went through `handlePaymentCaptured →
  confirmPayment`, but `confirmPayment` treats `BALANCE_DUE` as already-confirmed
  and returns `didConfirm=false`.
- **Fix:**
  - Added **`BookingService.settleBalance(tx, bookingId, paymentId, amountCaptured)`**
    — lock (`FOR UPDATE`) → idempotency → HMAC re-verify → amount must equal
    `snapshot.balanceAmount` → state machine `BALANCE_PAID` → immutable
    `PAYMENT_CAPTURED` ledger → second proportional payout line.
  - **`PaymentService.handlePaymentCaptured`** now routes non-pay-later captures by
    booking status: `PAYMENT_PENDING → confirmPayment`;
    `CONFIRMED_DEPOSIT`/`BALANCE_DUE → settleBalance`.
  - **`state-machine.ts`**: `BALANCE_PAID.from` extended to `['BALANCE_DUE',
    'CONFIRMED_DEPOSIT']` (balance may be paid early).
- **Verification:** lifecycle test #3 asserts 2 ledger captures summing 1,788,800
  and 2 payout lines summing 1,600,000; 6 new unit tests cover settle/idempotency/
  mismatch/tamper/invalid-status.

### Defect 3 — Auto-complete cron under-counted + false warnings *(High)*

- **Symptom:** `autoCompleteCheckedOut` returned 0 while the booking *was* actually
  set to `COMPLETED`, and logged a "skipped" warning every run.
- **Root cause:** `completeBooking` passed the sentinel `'SYSTEM_AUTO_COMPLETE'` as
  `AuditLog.actorUserId` — a **nullable FK to User**. The state transition committed
  in its own tx (actor kept in `statusHistory` JSON), but the subsequent
  `auditService.log()` threw a P2003 FK violation *after* commit; the cron swallowed
  it and never incremented its counter.
- **Fix:** system completions log `actorUserId = null`, keeping the sentinel in
  metadata (`{ systemActor: 'SYSTEM_AUTO_COMPLETE' }`).
  ([`booking.service.ts`](../apps/api/src/booking/booking.service.ts))
- **Verification:** lifecycle test #15 (stay ended 25h ago → COMPLETED).

### Defect 4 — PAY_LATER bookings were un-payable *(Medium)*

- **Symptom:** a guest could create a `PAY_LATER` booking, but its first payment
  could never be initiated (`initPayment` rejected it), leaving an un-payable
  booking holding inventory until a cron cancelled it.
- **Root cause:** `initPayment` had branches only for FULL / DEPOSIT / BALANCE —
  none for `PAY_LATER` — even though `confirmPayment` fully supported
  `PAY_LATER_FIRST_CAPTURED` + `createPlanFromFirstCapture`.
- **Fix:** added a `PAY_LATER` branch charging the first booking-time instalment from
  `snapshot.payLaterFirstInstalment[months]` (the same field
  `computeExpectedFirstCapturePaise` checks, so init and confirm agree;
  `createPlanFromFirstCapture` re-derives from the signed `total` as a backstop).
  Payment row stored `type: 'PAY_LATER', payLaterSeq: 1`; instalments 2+ still use
  `initPayLaterInstalmentPayment`.
  ([`payment.service.ts`](../apps/api/src/payment/payment.service.ts))
- **Verification:** lifecycle test #4 (first capture → CONFIRMED_DEPOSIT + plan).

---

## 7. Results summary

| Suite | Tests | Passed | Failed |
|---|---:|---:|---:|
| `booking-lifecycle.int-spec.ts` (new) | 17 | 17 | 0 |
| `booking-engine.int-spec.ts` (concurrency/integrity) | 11 | 11 | 0 |
| `booking-services.int-spec.ts` | 6 | 6 | 0 |
| **Integration total** | **34** | **34** | **0** |
| Unit — booking/payment/state-machine/signer/pricing/etc. | 259* | 259 | 0 |
| Unit — `listing.service.spec.ts` (pre-existing, unrelated) | 1 | 0 | 1 |
| **Unit total** | **260** | **259** | **1** |

\* Platform-wide unit total; includes the 7 tests added in this work. Some suites
use parameterized (`it.each`) cases, so per-file `it()` counts do not sum to the
Jest total.

**Concurrency stress:** `booking-engine.int-spec.ts` run at
`INT_CONCURRENCY_ITERATIONS=50` — Proof A (confirm idempotency) and Proof B
(double-booking) both green.

---

## 8. Regression & pre-existing failure

- No regressions were introduced. Changes are confined to
  `booking.service.ts`, `payment.service.ts`, `state-machine.ts`, and their tests
  plus the integration harness.
- One unit test fails and is **pre-existing and unrelated** to the booking engine:
  `listing.service.spec.ts › moves to pending approval when sensitive fields are
  changed` (listing moderation). Confirmed failing with this work's changes stashed;
  left untouched to preserve scope.

---

## 9. Coverage assessment & residual risks

**Well covered**

- Money math (paise, platform fee, GST, deposit/balance split, proportional payout)
  end-to-end through the real ledger and payout tables.
- All three payment plans; all three cancellation refund tiers from the frozen
  policy snapshot.
- Webhook robustness (replay dedup, amount mismatch, tamper) and idempotency keys.
- SERIALIZABLE + `FOR UPDATE` concurrency control and DB integrity triggers.

**Residual risks / recommendations**

1. **Balance-paid notification** — settlement intentionally does not re-send the
   "confirmed" email. Consider a dedicated "balance received" notification (product
   decision).
2. **Pay-later instalments 2+** — the *first* instalment is now covered end-to-end;
   the seq-2+ flow (`initPayLaterInstalmentPayment` / `recordInstalmentCapture`) has
   unit coverage but no full integration lifecycle test yet. Recommended follow-up.
3. **Proportional-payout rounding** — for exotic totals the two deposit/balance
   payout lines could differ by ±1 paise from the accommodation total; harmless but
   worth a targeted rounding test.
4. **Pre-existing listing-moderation unit failure** should be triaged separately.

---

## 10. Appendix — how to reproduce

```bash
# 1. Infra (Postgres, Redis, Meilisearch)
pnpm infra:up

# 2. Full integration suite (all 34)
cd apps/api
pnpm exec dotenv -e .env -- jest --config jest-integration.config.json --runInBand --forceExit

# 3. Just the lifecycle suite
pnpm exec dotenv -e .env -- jest --config jest-integration.config.json --runInBand --forceExit \
  test/integration/booking-lifecycle.int-spec.ts

# 4. Concurrency proofs @ 50 iterations
INT_CONCURRENCY_ITERATIONS=50 pnpm exec dotenv -e .env -- \
  jest --config jest-integration.config.json --runInBand --forceExit \
  test/integration/booking-engine.int-spec.ts

# 5. Unit suite
pnpm exec jest
```

**Files of record**

- Harness: [`test/integration/services-harness.ts`](../apps/api/test/integration/services-harness.ts),
  [`test/integration/harness.ts`](../apps/api/test/integration/harness.ts)
- Lifecycle suite: [`test/integration/booking-lifecycle.int-spec.ts`](../apps/api/test/integration/booking-lifecycle.int-spec.ts)
- Concurrency suite: [`test/integration/booking-engine.int-spec.ts`](../apps/api/test/integration/booking-engine.int-spec.ts)
- Engine fixes: [`src/booking/booking.service.ts`](../apps/api/src/booking/booking.service.ts),
  [`src/payment/payment.service.ts`](../apps/api/src/payment/payment.service.ts),
  [`src/booking/state-machine.ts`](../apps/api/src/booking/state-machine.ts)
- New unit tests: [`src/booking/confirm-payment.spec.ts`](../apps/api/src/booking/confirm-payment.spec.ts),
  [`src/payment/payment.service.spec.ts`](../apps/api/src/payment/payment.service.spec.ts)
