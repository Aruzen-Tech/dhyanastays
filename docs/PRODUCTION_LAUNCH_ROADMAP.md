# Dhyana Stays — Production Launch Roadmap (Phase 1)

Created: 2026-04-25
Scope: Booking Flow + SOS + AI Itinerary, end-to-end production-grade.
Target: Soft launch with limited real users, then full GA.
Estimate: 14–19 working days.

---

## Sign-off checkpoints

Each Part below ends with a **CHECKPOINT** — manual verification before moving on.
Do not skip checkpoints; they catch regressions cheaper than rolling back from prod.

---

## Part I — Critical Bug Fixes (Day 1)

These are correctness bugs that would break Phase 1 immediately. No new features; no DB migration.

### I.1 — Razorpay 100× overcharge
- **File:** `apps/api/src/payment/payment.service.ts:96`
- **Fix:** Drop the `* 100`; pass `snapshot.total` (already paise) directly to `razorpay.createOrder()`. Rename `amountInr` → `amountPaise` for clarity.
- **Accept:** A ₹15,000 quoted booking creates a Razorpay order for `amount: 1500000` (paise), not `150000000`.
- **Rollback:** revert single commit.

### I.2 — Webhook unit mismatch breaks status transitions
- **File:** `apps/api/src/payment/payment.service.ts:175`
- **Fix:** Stop dividing by 100. Pass paise straight through to `confirmPayment(amountPaise)`. `Payment.amount` column stores paise.
- **Accept:** Full payment flips booking to `CONFIRMED_PAID`, not `CONFIRMED_DEPOSIT`. Payout line records `0.9 × accommodation` in paise.

### I.3 — Pay-Later instalment unit consistency
- **File:** `apps/api/src/payment/payment.service.ts:391`
- **Fix:** Store `Payment.amount = instalment.amountMinor` (paise), not divided by 100. Audit log shows `amountPaise`.
- **Accept:** All `Payment.amount` rows in DB are paise. `cancelBookingInternal` `totalPaid` math becomes consistent.

### I.4 — Host-share computation
- **File:** `apps/api/src/booking/booking.service.ts:338`
- **Decision needed:** Confirm spec interpretation:
  - **(A) Recommended** — host gets `0.9 × (subtotal + cleaningFee) × (amountCaptured / snapshot.total)`. Add-ons & platform fee excluded from host share.
  - **(B)** — keep current behavior, accept hosts get a windfall on add-ons.
- **Accept (A):** ₹10k subtotal + ₹1k cleaning + ₹1.1k platform fee + ₹500 add-ons booking → host share = ₹9,900 (90% of ₹11k accommodation), not ₹11,340.

### I.5 — Add-on Phase 1 decision
- **Decision needed:** Add-on `providerShare` is computed but never paid out (no provider payout pipeline). Three options:
  - **(A) Recommended for Phase 1** — disable add-on selection in guest UI. Backend keeps the data model. Defer provider payouts to Phase 2.
  - **(B)** — ship with platform pocketing `providerShare`. Risky for compliance.
  - **(C)** — build provider payout pipeline now. Adds 3+ days.

### CHECKPOINT I
Run the full booking flow with Razorpay test keys: quote → hold → DEPOSIT_50 → webhook fires → status = `CONFIRMED_DEPOSIT` → 48h cron → BALANCE_DUE → balance pay → status = `CONFIRMED_PAID` → cancel → correct refund computed → host payout = correct paise amount.

---

## Part II — Booking Flow Hardening (Days 2–5)

### II.1 — Snapshot TTL (30-min quote expiry)
- Embed `expiresAt` in the snapshot; verify in `holdService.createHold` and `paymentService.initPayment`. Reject expired snapshots with 410 Gone.
- **Accept:** Sleep-31-min between quote and hold → request rejected.

### II.2 — GST line item (18% on platform fee + add-ons)
- **Files:** `pricing.service.ts`, `quote.dto.ts`, `pricing.service.spec.ts`, frontend booking UI.
- Add `gstAmount` and `gstRate` to snapshot. Total = subtotal + cleaning + platformFee + addOns + GST.
- **Accept:** Quote shows GST line; total includes it; refund engine treats GST as part of cancellable amount.

### II.3 — Hold reaper actually deletes
- **File:** `hold.service.ts`, `jobs.scheduler.ts`
- After audit, delete the hold row (or mark `expiredAt`). Add index for cleanup query.
- **Accept:** After 15-min, expired holds removed from DB.

### II.4 — Payment reconciliation cron
- **New file:** `apps/api/src/payment/payment-recon.service.ts`
- Every 15 min, find `INITIATED` payments older than 30 min. Query Razorpay `GET /orders/:id/payments`. If captured, replay webhook handler. If failed, mark FAILED.
- **Accept:** Manually delete a webhook event in Razorpay dashboard test mode → cron picks up the payment within 15 min.

### II.5 — Server-enforced terms acceptance
- Add `acceptedTermsAt: DateTime?` to Booking; require non-null in `createBooking`. UI sends ISO timestamp + checkbox.
- **Accept:** API rejects booking creation without terms acceptance.

### II.6 — Distributed lock for crons
- Use Redis `SET key NX PX <ttl>` pattern around `transitionToBalanceDue`, `autoCancelUnpaidBalance`, `runWeeklyPayouts`, `expireStaleHolds`.
- **Accept:** Spin up two API instances locally; only one runs the cron each tick.

### II.7 — ICS calendar attachment
- Generate RFC 5545 ICS in `notification.service.ts` `buildBookingConfirmedEmail`. Attach to email.
- **Accept:** Confirmation email lands in Gmail with "Add to Calendar" button visible.

### II.8 — Host check-in SMS
- In `guest-assistance.service.ts checkIn`, enqueue host SMS via outbox.
- **Accept:** Guest checks in → host receives SMS within 60s.

### II.9 — PII redaction in logs
- Custom Pino redaction config: `req.headers.cookie`, `req.headers.authorization`, `req.body.password`, `req.body.guestDetails.idNumber`, `req.body.phone`.
- **Accept:** Trigger an error mid-booking; logs show `[REDACTED]` for ID number/phone.

### II.10 — Auto-complete after check-out window
- Cron: every hour, find bookings where `checkOutData != null` AND `endsAt < now() - 24h` AND status ∈ {CONFIRMED_PAID, CONFIRMED_DEPOSIT}. Call `completeBooking`.
- **Accept:** Test booking ends → 25h later → status = COMPLETED, loyalty points awarded.

### CHECKPOINT II
Booking flow works end-to-end through all 4 plans (FULL, DEPOSIT_50, BALANCE_DUE→balance pay, PAY_LATER 3-month). Quote expires correctly. Receipts have ICS. Host gets check-in SMS.

---

## Part III — SOS Production Hardening (Day 6)

### III.1 — Production env validation
- **File:** `env.validation.ts`
- In `production`: require `SOS_OPS_PHONE` (E.164), `SOS_OPS_EMAIL`, and `SMS_PROVIDER ∈ {twilio, msg91}` (already enforced).
- **Accept:** Boot prod without `SOS_OPS_PHONE` → startup error.

### III.2 — SMS circuit breaker
- **File:** `sos-broadcast.service.ts`
- After N consecutive SMS failures, mark provider degraded; fall back to email-only for ops + log critical error. Reset after cooldown.
- **Accept:** Disable SMS provider key mid-burst → SOS still notifies ops via email; admin notification fires.

### III.3 — Latency metric (incident → first ack)
- Record `firstAckAt - openedAt` ms per incident. Expose via `/admin/sos/metrics` for dashboard.
- **Accept:** Trigger SOS, ack from admin console, metric ≤ 5s in dev.

### III.4 — Trusted-contact contact-method validation
- Enforce E.164 phone format + email regex on create.
- **Accept:** Bad number rejected at API level.

### CHECKPOINT III
Trigger 5 SOS incidents in staging with real Twilio key; all reach ops + trusted contacts within 5s; admin acks each within target.

---

## Part IV — AI Itinerary Production Grade (Days 7–8)

### IV.1 — No silent stub in prod
- **File:** `itinerary.service.ts:125`
- If `NODE_ENV=production` AND no `ANTHROPIC_API_KEY`: throw at startup. If API call fails in prod: return 503, do not stub.
- **Accept:** Boot prod without API key → startup error. Stop Anthropic API mid-test → user sees 503, not a fake itinerary.

### IV.2 — Per-user rate limit
- 5 generations / 1 hour / user via `@Throttle()` on the generate endpoint.
- **Accept:** 6th request within hour returns 429.

### IV.3 — Monthly cost cap
- Track input/output tokens per user in DB (new `ItineraryUsage` table). Block if user > N₹/month or platform > total cap.
- **Accept:** Set cap to 0 → next call returns 402 with friendly message.

### IV.4 — Prompt caching
- Add `cache_control: { type: "ephemeral" }` to system prompt block. Reduces cost ~80% on hot calls.
- **Accept:** Inspect Anthropic API response → `cache_read_input_tokens > 0` on second call within 5 min.

### IV.5 — Retry with backoff
- Wrap fetch in single retry on 429/5xx with 2s sleep.
- **Accept:** Mock 503 once → call succeeds on retry.

### IV.6 — "Real-time" decision
- **Decision needed:** (A) Keep blocking POST + good loading UI, (B) switch to streaming SSE.
- (B) adds ~1 day; better UX for 10–20s waits.

### CHECKPOINT IV
Generate 20 itineraries in staging with real key; verify cost stays under $1, no stubs returned, retry recovers from one transient 503.

---

## Part V — Cross-Cutting Infrastructure (Days 9–12)

### V.1 — Error tracking (Sentry or equivalent)
- Add Sentry SDK to API + web. Tag releases. Auto-capture unhandled exceptions.
- **Accept:** Force a 500 in staging → appears in Sentry within 10s with stack + correlation ID.

### V.2 — Structured metrics
- `/metrics` Prometheus endpoint exposing: bookings_created_total, payments_captured_total, sos_open_total, sos_ack_latency_ms, itinerary_generation_seconds, redis_up, db_query_p99_ms.
- **Accept:** Curl `/metrics` returns parseable Prometheus format.

### V.3 — Database indexes audit
- Run `EXPLAIN ANALYZE` on top 10 queries (booking list, host bookings, payouts eligible, hold overlap, sos open). Add indexes where seq scans appear.
- **Accept:** Each query < 50ms on 10k-row dataset.

### V.4 — Secret rotation procedure
- Document in `docs/runbook.md`: how to rotate JWT_ACCESS_SECRET, RAZORPAY_KEY_SECRET, ANTHROPIC_API_KEY, DB password, with zero downtime where possible.
- **Accept:** Dry-run JWT rotation in staging; sessions survive via refresh.

### V.5 — Dependency security audit
- `pnpm audit --audit-level=high` clean. Patch any high/critical CVEs.
- **Accept:** Audit returns 0 high/critical issues.

### V.6 — CI/CD pipeline
- GitHub Actions: typecheck both apps, run Prisma migrate diff against main, run unit tests, build production bundle. Block merge on failure.
- **Accept:** Push a PR with a typecheck error → CI red.

### V.7 — Blue-green deployment + rollback
- Document deployment procedure in `runbook.md`. Tag release versions. One-command rollback to previous tag.
- **Accept:** Deploy v1.0 → v1.1 → roll back to v1.0 in staging within 5 min.

### CHECKPOINT V
Sentry catches errors; metrics dashboard live; CI gates PRs; rollback drill succeeds.

---

## Part VI — Pre-launch QA (Days 13–15)

### VI.1 — End-to-end manual test scenarios
Document and execute in staging with **test-mode Razorpay keys + real Twilio test number + real Anthropic API key**:

| Scenario | Expected outcome |
|----------|------------------|
| FULL payment booking | CONFIRMED_PAID, payout line, ICS email, host SMS |
| DEPOSIT_50 + balance pay | Two payments, CONFIRMED_PAID at end |
| DEPOSIT_50 unpaid past grace | Auto-cancel, refund processed |
| PAY_LATER 6-month | Plan created, instalment 1 captured, dunning fires |
| Cancel >48h before checkin | 100% refund |
| Cancel 10–48h | 50% refund |
| Cancel <10h | 0% refund |
| Two concurrent holds same dates | One succeeds, other gets ConflictException |
| Webhook signature invalid | 401, no state change |
| Webhook fires twice | Idempotent — booking confirmed once |
| Quote 31 min old → hold | 410 Gone |
| SOS trigger | Ops SMS + email + trusted contacts in 5s |
| SOS ack from admin | Status updated, guest notified |
| Itinerary generate | Real plan from Anthropic |
| Itinerary 6th in hour | 429 |
| Itinerary cost cap hit | 402 |

### VI.2 — Staging 24h soak
- Generate synthetic load (k6 or similar): 10 RPS booking flow + 1 RPS itinerary + 0.1 RPS SOS for 24h.
- **Accept:** Zero unhandled errors, p99 < 1s, Redis stable, DB CPU < 60%.

### VI.3 — Runbook drill
- On-call engineer simulates: payment provider outage, Redis crash, DB connection pool exhaustion, Anthropic 503. Walk through runbook for each.
- **Accept:** Each simulated incident resolved per runbook in < 15 min.

### VI.4 — Privacy review
- Verify guest can request data export and deletion (DPDPA compliance for India).
- **Accept:** `GET /guest/data-export` returns ZIP; `DELETE /guest/account` anonymizes within 30 days.

### CHECKPOINT VI
All 16 scenarios green. Soak test clean. Runbook drilled. Privacy endpoints work.

---

## Part VII — Launch + Watch (Days 16–19)

### VII.1 — Soft launch (limited cohort)
- Enable for 50 invite-only guests + 10 hosts. Real Razorpay live keys.
- Watch dashboards every 2h for first 48h.
- Daily standup: defects, latency, support tickets.

### VII.2 — Full GA gate
- Criteria to flip to public: zero critical bugs, p99 < 1s, payment success rate > 99%, no SOS misses, support ticket volume < 5/day.
- Document GA decision in `docs/launch-decision-log.md`.

### VII.3 — 7-day post-launch review
- What broke? What surprised us? What's next?
- Promote Tier 2 backlog into Phase 2 plan.

---

## Decisions needed before starting

1. **Add-on flow (I.5):** disable add-ons in Phase 1, or build provider payouts now? — recommend **disable**.
2. **Host-share interpretation (I.4):** confirm host gets `0.9 × (subtotal + cleaning)`. Add-ons & platform fee excluded.
3. **Itinerary real-time (IV.6):** blocking POST or streaming SSE? — recommend **blocking** for Phase 1.
4. **Cost cap (IV.3):** what's the per-user monthly ₹ ceiling? Suggest ₹50 (~50 generations/user/month at Haiku rates).
5. **Soft-launch cohort size (VII.1):** 50 guests OK, or larger?

Confirm decisions, then we start Part I.

---

## Tier 2 backlog (Phase 2 — post-launch)

- Invoice/receipt PDF generation
- Promo codes / coupons
- Multi-step balance-due reminders (T-48h, T-24h, T-6h)
- Pay-Later dunning schedule
- Failed-payment retry UI
- Cancellation policy preview at quote time
- Real-time booking status (SSE)
- Host quick-decline flow (if instant-book off)
- Booking modification (date change w/ price diff)
- Add-on provider payout pipeline
- Multi-currency display
- Group booking (Trip Group → joint booking, split deposits)
- Auto-extension on flight delay

---

## Effort summary

| Part | Days | Critical |
|------|------|----------|
| I — Critical bug fixes | 1 | YES |
| II — Booking flow hardening | 4 | YES |
| III — SOS hardening | 1 | YES |
| IV — AI itinerary | 2 | YES |
| V — Infrastructure | 4 | YES |
| VI — Pre-launch QA | 3 | YES |
| VII — Launch + watch | 4 | YES |
| **Total** | **19** | |

Realistic with buffer: **3 calendar weeks** at full focus, or **5 weeks** at half-time.
