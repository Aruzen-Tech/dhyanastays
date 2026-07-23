# Dhyana Stays — Booking Engine End-to-End Test Plan

**Purpose:** verify the full booking flow and, critically, that **confirmation is
correct** — not just that a "confirmed" screen appears, but that the booking
status, payment ledger, host payout, policy snapshot, and notifications all land
in the right state.
**Version:** 1.0 · **Date:** 2026-07-22
**Scope:** the booking engine only — quote → hold → booking → payment/webhook →
**confirm** → balance → cancel/refund → complete → payout.

---

## 1. What "confirmed correctly" means

A booking is only *correctly* confirmed when **all** of these are true — a green
screen alone is not enough:

1. **Status** reaches the right terminal state (`CONFIRMED_PAID` /
   `CONFIRMED_DEPOSIT`).
2. **statusHistory** contains the expected transition event(s), in order.
3. **Ledger** has one `PAYMENT_CAPTURED` row per capture, summing to the amount paid.
4. **Payout line(s)** exist for the host's share, `status = NOT_ELIGIBLE`,
   `eligibleAt = check-in + 24h`.
5. **Cancellation policy** is frozen onto the booking (tiers 100/50/0).
6. **Notifications** fire: guest confirmation, host new-booking, admin DB notice.
7. **No double-charge / no duplicate booking** — idempotent on webhook replay.

Each scenario below tells you exactly which of these to check.

---

## 2. The booking state machine (reference)

| From | Event | To |
|---|---|---|
| (new) | hold → createBooking | `PAYMENT_PENDING` |
| PAYMENT_PENDING | full capture | `CONFIRMED_PAID` |
| PAYMENT_PENDING | deposit capture | `CONFIRMED_DEPOSIT` |
| PAYMENT_PENDING | pay-later 1st capture | `CONFIRMED_DEPOSIT` |
| CONFIRMED_DEPOSIT | balance-due cron | `BALANCE_DUE` |
| CONFIRMED_DEPOSIT / BALANCE_DUE | balance capture | `CONFIRMED_PAID` |
| BALANCE_DUE | auto-cancel (unpaid, past grace) | `CANCELLED` / `REFUNDED` |
| CONFIRMED_PAID / DEPOSIT | guest/admin cancel | `CANCELLED` (0% refund) / `REFUNDED` (>0%) |
| CONFIRMED_PAID / DEPOSIT | stay ended +24h (auto-complete) | `COMPLETED` |

Any transition NOT in this table must be rejected — the engine routes every
status change through one state machine.

---

## 3. Test environment & data

### 3.1 Money reference (3-night stay @ ₹5,000/night, 2 guests)
| Line | Paise | ₹ |
|---|---:|---:|
| Subtotal (3 × 5,000) | 1,500,000 | 15,000 |
| Cleaning fee | 100,000 | 1,000 |
| **Accommodation (= host payout)** | **1,600,000** | **16,000** |
| Platform fee (10%) | 160,000 | 1,600 |
| GST (18% of fee) | 28,800 | 288 |
| **Total (guest pays)** | **1,788,800** | **17,888** |
| Deposit / Balance (50% each) | 894,400 | 8,944 |

### 3.2 Razorpay test instruments (test mode — no real money)
| Purpose | Value |
|---|---|
| Card success | `4111 1111 1111 1111`, any future expiry, any CVV |
| Card failure | `5104 0600 0000 0008` |
| UPI success | `success@razorpay` |
| UPI failure | `failure@razorpay` |

### 3.3 How to inspect backend state (pick one)
- **Admin console** → Bookings: shows status; refunds panel shows refunds.
- **API:** `GET /api/bookings/:id` (as the owning guest) returns status + snapshot.
- **DB (QA with read access)** — read-only queries in Appendix A. Use a fresh
  `bookingId` from each test.

### 3.4 Preconditions for all booking tests
An **APPROVED listing** exists (host created + admin approved) with a nightly
rate and availability, and a **guest** account is logged in.

---

## 4. A — Quote & pricing correctness

**BK-Q-01 — Quote math is exact**
1. On the approved listing, select 3 nights, 2 guests to get a price quote.
- **Expected:** subtotal ₹15,000; cleaning ₹1,000; platform fee ₹1,600; GST ₹288;
  **total ₹17,888**; deposit and balance each ₹8,944. All values in ₹ with no
  rounding drift.
- **Verify:** every line matches §3.1 to the rupee.

**BK-Q-02 — Quote expiry (TTL)**
1. Get a quote; wait past the quote TTL (~15–30 min) without booking. 2. Try to pay.
- **Expected:** an "expired quote — please re-quote" message; you cannot pay on a
  stale quote.

**BK-Q-03 — Snapshot integrity**
1. Get a quote and proceed to book.
- **Expected:** the price is locked (signed) at booking time; the total shown at
  checkout equals the total at confirmation — it never silently changes.

---

## 5. B — Hold lifecycle

**BK-H-01 — Create hold → PAYMENT_PENDING on book**
1. Select dates, place the hold, then create the booking (before paying).
- **Expected:** booking exists in status **PAYMENT_PENDING**; dates show as held.
- **Verify:** `GET booking` → `status = PAYMENT_PENDING`.

**BK-H-02 — Hold countdown visible to others**
1. Place a hold (note the ~15-min timer). 2. In a second browser (second guest),
   open the same listing/dates.
- **Expected:** second guest sees **"on hold — MM:SS remaining"** and cannot hold/
  book those dates until it expires.

**BK-H-03 — Release on abandon**
1. Place a hold. 2. Leave the page / click "back (release hold)".
- **Expected:** the hold is released immediately; the dates become bookable again
  (don't wait the full 15 min).

**BK-H-04 — Hold auto-expiry**
1. Place a hold and do nothing. 2. Wait past the TTL (or QA-shorten it).
- **Expected:** the hold-expiry cron frees the dates automatically.

**BK-H-05 — Book on an expired hold is rejected**
1. Let a hold expire, then attempt to create a booking from it.
- **Expected:** rejected with a clear "hold expired" error; no booking created.

---

## 6. C — FULL payment, end-to-end + confirmation

**BK-F-01 — Happy path: pay in full → CONFIRMED_PAID**
1. Hold 3 nights, 2 guests. 2. Choose **Pay in full**, create the booking. 3. At
   checkout verify the total = ₹17,888. 4. Pay with card `4111…`.
- **Expected (UI):** payment succeeds; a confirmation screen shows a booking
  reference and "confirmed"; the booking appears under **Upcoming trips**.
- **Expected (confirmation integrity — verify all):**
  - status = **CONFIRMED_PAID**
  - statusHistory → one entry, event `PAYMENT_CONFIRMED_FULL` → CONFIRMED_PAID
  - ledger → **one** `PAYMENT_CAPTURED` = **1,788,800** paise
  - payout → **one** line = **1,600,000** paise, `NOT_ELIGIBLE`, eligibleAt =
    check-in + 24h
  - cancellationPolicySnapshot present with tiers **[100, 50, 0]**

**BK-F-02 — Confirmation notifications**
1. Immediately after BK-F-01.
- **Expected:** guest receives a booking-confirmed email (or stub log); the host
  gets a new-booking notification; an admin DB notification is created. None
  block the confirmation.

**BK-F-03 — Payment failure keeps it unconfirmed**
1. Start a full-payment booking; pay with the **failure** card `5104…`.
- **Expected:** status stays **PAYMENT_PENDING** (not confirmed); no ledger
  capture; no payout line; a clear failure message; guest can retry.
- **Verify:** ledger has **0** `PAYMENT_CAPTURED`; status unchanged.

**BK-F-04 — Amount tamper rejected**
1. (API/QA) Attempt a capture whose amount ≠ the quoted total.
- **Expected:** rejected (amount mismatch); booking stays PAYMENT_PENDING; no
  ledger/payout written.

---

## 7. D — Deposit + balance settlement + confirmation

**BK-D-01 — Pay deposit → CONFIRMED_DEPOSIT**
1. Hold 3 nights. 2. Choose **Pay 50% deposit**, create booking. 3. Pay ₹8,944.
- **Expected (UI):** confirmed with a visible outstanding balance of ₹8,944.
- **Verify:**
  - status = **CONFIRMED_DEPOSIT**
  - statusHistory → event `PAYMENT_CONFIRMED_DEPOSIT`
  - ledger → one `PAYMENT_CAPTURED` = **894,400**
  - payout → one line = **800,000** (half of accommodation), NOT_ELIGIBLE

**BK-D-02 — Trigger balance-due**
1. (QA) move the booking's balance-due window into the past; run the balance-due
   cron (or wait for it).
- **Expected:** status → **BALANCE_DUE**; guest sees/receives a "balance due"
  prompt.

**BK-D-02b — Pay balance early (from CONFIRMED_DEPOSIT)**
1. Without waiting for BALANCE_DUE, on a CONFIRMED_DEPOSIT booking choose **Pay
   balance** and pay ₹8,944.
- **Expected:** status → **CONFIRMED_PAID** directly (early balance allowed).

**BK-D-03 — Pay balance → CONFIRMED_PAID (the key settlement check)**
1. On the BALANCE_DUE (or CONFIRMED_DEPOSIT) booking choose **Pay balance**; pay ₹8,944.
- **Expected (UI):** no balance remaining; booking fully confirmed.
- **Verify (this is the settleBalance path — check carefully):**
  - status = **CONFIRMED_PAID**
  - statusHistory now includes the `BALANCE_PAID` transition
  - ledger → **two** `PAYMENT_CAPTURED` rows (894,400 + 894,400) summing to
    **1,788,800**
  - payout → **two** lines (800,000 + 800,000) summing to **1,600,000**
  - *(regression guard: it must NOT get stuck in BALANCE_DUE with the money
    captured — that was a fixed bug)*

**BK-D-04 — Auto-cancel unpaid balance**
1. (QA) leave a BALANCE_DUE booking unpaid past the grace window; run/await the
   auto-cancel cron.
- **Expected:** status → **CANCELLED** or **REFUNDED** (deposit refunded per
  policy); dates freed.

---

## 8. E — Pay Later (first instalment)

**BK-PL-01 — First instalment → CONFIRMED_DEPOSIT + plan**
1. If Pay Later is offered, choose it (e.g. 3 months) and pay the first
   (booking-time) instalment.
- **Expected:**
  - status = **CONFIRMED_DEPOSIT**
  - a **PayLaterPlan** is created (months = 3); the seq-1 instalment is marked paid
  - *(regression guard: the booking must be payable at all — a PAY_LATER booking
    that can't be paid was a fixed bug)*
- **Note:** if Pay Later is not exposed in the UI yet, mark N/A and verify via API.

---

## 9. F — Confirmation integrity deep-dive

**BK-CONF-01 — statusHistory is append-only and ordered**
1. Take the DEPOSIT_50 booking through deposit → balance.
- **Expected:** statusHistory shows, in order, the deposit-confirm event then the
  balance-paid event; earlier entries are never mutated or removed.

**BK-CONF-02 — Ledger reconciles to money paid**
1. For each of FULL and DEPOSIT_50 bookings, sum the `PAYMENT_CAPTURED` rows.
- **Expected:** FULL = 1,788,800 (one row); DEPOSIT_50 = 1,788,800 (two rows).
  Ledger entries are immutable (cannot be edited/deleted).

**BK-CONF-03 — Host payout is correct and not-yet-eligible**
1. Inspect payout lines for a confirmed booking.
- **Expected:** payout total = **1,600,000** (host's full accommodation share),
  status `NOT_ELIGIBLE`, `eligibleAt` = check-in + 24h. Guest paid ₹17,888; host
  share is ₹16,000; platform keeps fee + GST (₹1,888).

**BK-CONF-04 — Payout becomes eligible 24h after check-in**
1. (QA) for a confirmed booking whose check-in was >24h ago, run/await the payout-
   eligibility cron.
- **Expected:** the payout line flips `NOT_ELIGIBLE` → `ELIGIBLE`.

---

## 10. G — Webhook & idempotency

**BK-WH-01 — Webhook confirms the booking (staging)**
1. On staging (Razorpay webhook configured), pay a test booking.
- **Expected:** the booking confirms within seconds via the webhook, without a
  manual refresh; Razorpay's webhook delivery log shows a 200.

**BK-WH-02 — Duplicate webhook is idempotent**
1. (QA) re-deliver the same `payment.captured` event 2–3 times (Razorpay
   dashboard "resend", or replay the same event id).
- **Expected:** the booking confirms **once**; exactly **one** ledger capture;
  exactly **one** statusHistory transition; a dedup record prevents reprocessing.
  No double payout, no double charge.

**BK-WH-03 — Unsigned/invalid webhook rejected**
1. (QA) POST to the webhook endpoint with a bad/missing signature.
- **Expected:** 401 / rejected; no state change.

---

## 11. H — Cancellation & refunds

**BK-C-01 — Cancel ≥48h before check-in → 100%**
1. Fully-paid booking, check-in >48h away. 2. Cancel.
- **Expected:** status → **REFUNDED**; one refund = **1,788,800** (100%); a
  `REFUND_ISSUED` ledger row for the same amount.

**BK-C-02 — Cancel 10–48h before → 50%**
1. Fully-paid booking, check-in 10–48h away. 2. Cancel.
- **Expected:** status → **REFUNDED**; refund = **894,400** (50%).

**BK-C-03 — Cancel <10h before → 0%**
1. Fully-paid booking, check-in <10h away. 2. Cancel.
- **Expected:** status → **CANCELLED**; **no** refund row created.

**BK-C-04 — Policy snapshot is frozen**
1. After a booking is confirmed, (QA) change the platform's live cancellation
   policy, then cancel the booking.
- **Expected:** the refund follows the policy **as it was at confirmation** (the
  frozen snapshot), not the edited live policy.

**BK-C-05 — Admin refund**
1. As admin, issue a refund on a paid booking from the console.
- **Expected:** refund recorded against the booking; ledger + audit updated;
  status reflects the refund; guest notified.

---

## 12. I — Concurrency & overlap

**BK-CC-01 — Double-booking prevented**
1. Confirm a booking on given dates. 2. Attempt to book the same listing + dates again.
- **Expected:** the second attempt is rejected ("dates no longer available"); only
  one CONFIRMED booking exists for those dates.

**BK-CC-02 — Back-to-back allowed**
1. Book dates ending on day X; book a second stay starting on day X (checkout day
   == next check-in day).
- **Expected:** both succeed (half-open ranges don't collide).

**BK-CC-03 — Simultaneous checkout race (QA)**
1. Two guests attempt to confirm the same dates at nearly the same instant.
- **Expected:** exactly **one** confirms; the other is cleanly rejected; no
  double booking, no partial/corrupt state.

---

## 13. J — Scheduled transitions (crons)

**BK-CRON-01 — Auto-complete after checkout**
1. (QA) a CONFIRMED_PAID booking whose stay ended >24h ago; run/await the
   auto-complete cron.
- **Expected:** status → **COMPLETED**; loyalty points awarded; no error in the
  scheduler logs (watch for a clean run — no `Custom Id cannot contain :`).

**BK-CRON-02 — Scheduler health**
1. With Redis up, watch API logs for ~2 minutes.
- **Expected:** hold-expiry, balance-due, payout-eligibility, outbox (every 30s),
  payment-recon, auto-complete all tick without enqueue errors.

---

## 14. K — Negative & edge cases

**BK-N-01 — Cannot pay a cancelled booking** — attempt payment on a CANCELLED
booking → rejected.
**BK-N-02 — Cannot double-pay a confirmed booking** — attempt a second full
payment on a CONFIRMED_PAID booking → rejected/no-op; no extra ledger/payout.
**BK-N-03 — Cannot book someone else's hold** — guest B tries to book guest A's
hold → rejected.
**BK-N-04 — Guests over capacity** — select more guests than the listing allows →
blocked with a clear message.
**BK-N-05 — Zero/negative nights** — check-out ≤ check-in → blocked.

---

## 15. Regression smoke (run before every release)

1. Quote 3 nights → ₹17,888. 2. Hold → book (PAYMENT_PENDING). 3. Pay in full →
   **CONFIRMED_PAID** with 1 ledger capture (1,788,800) + 1 payout (1,600,000).
4. New booking, deposit → CONFIRMED_DEPOSIT → pay balance → **CONFIRMED_PAID**
   with 2 ledger captures (=1,788,800) + 2 payouts (=1,600,000). 5. Replay the
   capture webhook → still one confirmation. 6. Cancel a >48h booking → 100%
   refund. 7. Overlap attempt rejected. 8. Scheduler logs clean.
- All 8 pass ⇒ the booking engine and confirmation are healthy.

---

## Appendix A — Read-only verification queries (QA with DB access)

Replace `:id` with the booking id under test. **SELECT only — never modify.**

```sql
-- Booking status + frozen policy + status history
SELECT id, status, "startsAt", "endsAt", plan,
       "cancellationPolicySnapshot", "statusHistory"
FROM "Booking" WHERE id = :id;

-- Ledger: captures should sum to the amount paid (paise)
SELECT type, amount, "createdAt"
FROM "LedgerEvent" WHERE "bookingId" = :id ORDER BY "createdAt";

-- Host payout lines: should total 1,600,000 for a full stay
SELECT amount, status, "eligibleAt"
FROM "PayoutLine" WHERE "bookingId" = :id;

-- Refunds (present only when refund % > 0)
SELECT amount, reason, "createdAt"
FROM "Refund" WHERE "bookingId" = :id;

-- Webhook idempotency: one processed row per event id
SELECT "eventId", "eventType", "createdAt"
FROM "ProcessedRazorpayEvent" ORDER BY "createdAt" DESC LIMIT 10;
```

---

## Appendix B — Defect log (copy per issue)

| Field | Value |
|---|---|
| Scenario ID |  |
| Severity | Critical (money/confirmation wrong) / Major / Minor |
| Path | FULL / DEPOSIT_50 / PAY_LATER / cancel / cron |
| Environment | local / staging |
| Steps to reproduce |  |
| Expected (status / ledger / payout) |  |
| Actual |  |
| Evidence (screenshot / query output / log) |  |
| Status | Open / Fixed |
