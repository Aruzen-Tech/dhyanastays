# Dhyana Stays — Manual Test Plan

**Purpose:** end-to-end manual test scenarios covering the entire platform.
**Version:** 1.0 · **Date:** 2026-07-22
**Applies to:** local dev (`http://localhost:3000`) or staging (your Vercel URL).

---

## 1. How to use this document

Each scenario has an **ID**, **preconditions**, numbered **steps**, and the
**expected result**. Execute the steps in order and record the outcome:

- **Result:** mark **Pass** or **Fail**.
- **Notes:** record anything unexpected, the error text, and a screenshot name.

Test in this order — later modules depend on data created by earlier ones
(a host + approved listing must exist before bookings can be tested).

**Severity for any failure:** Critical (blocks core money/safety flow) · Major
(feature broken, workaround exists) · Minor (cosmetic / edge case).

---

## 2. Test environment & setup

### 2.1 Prerequisites
1. API running (`pnpm --filter @dhyana/api start:dev`) and Web running
   (`pnpm --filter @dhyana/web dev`), OR the deployed staging site.
2. Postgres, Redis (Memurai) reachable; migrations applied + seed run.
3. Razorpay in **test mode** (test keys), or stub mode for non-payment flows.

### 2.2 Test accounts to prepare
| Role | How to get it |
|---|---|
| Admin (L1) | Seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`pnpm --filter @dhyana/api seed`) |
| Guest | Register fresh in the app (Scenario TC-AUTH-01) |
| Host | Register, then apply/get approved as host (Section H) |
| Second guest | For hold-contention + trip-group tests |

### 2.3 Razorpay test payment instruments (test mode only — no real money)
| Instrument | Value |
|---|---|
| Card (success) | `4111 1111 1111 1111`, any future expiry, any CVV |
| Card (failure) | `5104 0600 0000 0008` |
| UPI (success) | `success@razorpay` |
| UPI (failure) | `failure@razorpay` |

### 2.4 Money reference (a 3-night stay at ₹5,000/night)
Subtotal ₹15,000 + cleaning ₹1,000 = ₹16,000; platform fee 10% = ₹1,600; GST 18%
of fee = ₹288; **total ₹17,888**; deposit/balance = ₹8,944 each; host payout ₹16,000.

---

## 3. Authentication & Account Management

**TC-AUTH-01 — Register a new guest**
1. Open `/auth/register`. 2. Enter name, unique email, password, role = Guest,
   accept terms. 3. Submit.
- **Expected:** account created, auto-logged-in, redirected to dashboard; JWT
  stored; a welcome/guest state shown.

**TC-AUTH-02 — Login with valid credentials**
1. Log out. 2. Open `/auth/login`. 3. Enter the TC-AUTH-01 email + password. 4. Submit.
- **Expected:** logged in, redirected to dashboard.

**TC-AUTH-03 — Login with wrong password**
1. On `/auth/login`, enter a valid email + wrong password. 2. Submit repeatedly.
- **Expected:** "Invalid credentials" (never reveals which field); after ~5
  rapid attempts, a rate-limit message with a retry delay appears.

**TC-AUTH-04 — Two-factor (TOTP) enable + challenge**
1. In profile/security, enable 2FA. 2. Scan the QR with an authenticator, enter
   the 6-digit code to confirm. 3. Log out and log back in.
- **Expected:** setup confirms; on next login a TOTP code is required before a
  session is issued; wrong code is rejected.

**TC-AUTH-05 — Session persists / logout**
1. Log in, refresh the page. 2. Click logout.
- **Expected:** session survives refresh (token/refresh works); logout clears
  the session and protected pages redirect to login.

**TC-AUTH-06 — Access control (guest cannot reach admin)**
1. As a guest, navigate directly to `/admin`.
- **Expected:** blocked / redirected (403 or login), no admin data shown.

---

## 4. Stay Discovery & Search

**TC-DISC-01 — Homepage lists approved stays**
1. Open `/`.
- **Expected:** approved listings render as cards with photo/placeholder, title,
  location, nightly price; unapproved listings never appear.

**TC-DISC-02 — Text search**
1. Type a known city/title in search. 2. Wait for results (debounced).
- **Expected:** relevant listings shown; clearing the box restores the full list.
  (Works even with Meilisearch off — Postgres fallback.)

**TC-DISC-03 — Discovery facets/filters**
1. Apply an experience-tag / property-type / dietary filter. 2. Combine two
   filters. 3. Change sort (price asc/desc, newest).
- **Expected:** result set narrows correctly; sort reorders; facet counts/chips
  reflect the active filters.

**TC-DISC-04 — Map & split view**
1. Toggle to map view, then split view.
2. Pan/zoom; click a map marker.
- **Expected:** markers appear at correct locations; marker popup shows the right
  listing; clicking opens the listing; grid/map/split toggle works.

**TC-DISC-05 — Empty / no-results state**
1. Search for a nonsense string.
- **Expected:** a friendly "no results" state, not an error or blank screen.

---

## 5. Property Details

**TC-PROP-01 — View listing detail**
1. Open a listing from the grid.
- **Expected:** gallery, description, amenities, house rules, cancellation policy,
  host info, reviews/ratings, and a location map all render; price + availability
  visible.

**TC-PROP-02 — Availability & guest selection**
1. Open the date picker; select check-in/out. 2. Set guest count.
- **Expected:** unavailable/held dates are blocked; price recalculates for the
  chosen nights and guests; min-nights enforced.

---

## 6. Booking Engine — Full Payment

**TC-BOOK-01 — Hold → book → pay in full → confirmed**
1. On a listing, pick 3 available nights, 2 guests. 2. Choose **Pay in full**. 3.
   Place the hold; proceed to checkout. 4. Review the summary (subtotal, cleaning,
   platform fee, GST, total = ₹17,888). 5. Pay with test card `4111…`.
- **Expected:** booking moves PAYMENT_PENDING → **CONFIRMED_PAID**; confirmation
  screen + email (or logged in stub); booking appears in "Upcoming trips".

**TC-BOOK-02 — Hold countdown & release**
1. Place a hold, note the 15-min timer. 2. In a second browser (second guest),
   try the same dates.
- **Expected:** second guest sees "on hold — MM:SS remaining" and cannot book;
  after you abandon/leave, the hold releases and dates free up.

**TC-BOOK-03 — Overlap prevention**
1. With a confirmed booking on given dates, try to book the same dates again.
- **Expected:** rejected ("dates no longer available"); no double booking created.

**TC-BOOK-04 — Payment failure**
1. Start a booking; pay with the **failure** test card.
- **Expected:** booking stays PAYMENT_PENDING (not confirmed); a clear failure
  message; guest can retry payment.

---

## 7. Booking Engine — Deposit + Balance

**TC-DEP-01 — Pay 50% deposit**
1. Book 3 nights; choose **Pay 50% deposit**. 2. Pay the deposit (₹8,944) with
   the test card.
- **Expected:** status → **CONFIRMED_DEPOSIT**; summary shows balance ₹8,944 due
  later; booking confirmed with balance outstanding.

**TC-DEP-02 — Pay the balance**
1. Open the deposit booking; choose **Pay balance**. 2. Pay ₹8,944.
- **Expected:** status → **CONFIRMED_PAID**; no balance remains; ledger reflects
  two captures totalling ₹17,888.

**TC-DEP-03 — Balance-due reminder (time-permitting)**
1. (Requires a booking whose balance-due window has passed — ops/QA DB tweak.)
- **Expected:** booking flips to BALANCE_DUE; guest sees/receives a balance-due
  prompt; if left unpaid past grace, the auto-cancel cron cancels + refunds.

---

## 8. Add-ons

**TC-ADD-01 — Add an add-on to a booking**
1. During checkout, add a food package / bike rental / experience add-on. 2.
   Complete payment.
- **Expected:** add-on cost is included in the total; the confirmed booking lists
  the add-on; provider share/commission recorded (admin-visible).

---

## 9. Cancellation & Refunds

**TC-CANCEL-01 — Cancel ≥48h before check-in (100%)**
1. Create a fully-paid booking with check-in >48h away. 2. Cancel it.
- **Expected:** status → REFUNDED; a 100% refund (₹17,888) is recorded.

**TC-CANCEL-02 — Cancel 10–48h before (50%)**
1. Fully-paid booking with check-in 10–48h away. 2. Cancel.
- **Expected:** status → REFUNDED; 50% refund (₹8,944).

**TC-CANCEL-03 — Cancel <10h before (0%)**
1. Fully-paid booking with check-in <10h away. 2. Cancel.
- **Expected:** status → CANCELLED; **no** refund row.

---

## 10. Host Onboarding & Dashboard

**TC-HOST-01 — Apply as host**
1. As a new user, apply to become a host; submit required details.
- **Expected:** application recorded; status shows Pending; user sees host
  onboarding state.

**TC-HOST-02 — Create a listing**
1. As an (approved) host, create a listing: details, location (lat/lng), amenities,
   house rules, pricing, photos. 2. Submit for approval.
- **Expected:** listing saved as DRAFT/PENDING_APPROVAL; not yet publicly visible.

**TC-HOST-03 — Host dashboard**
1. Open the host dashboard.
- **Expected:** revenue, occupancy, upcoming bookings, guest details, reviews,
  calendar, and notifications render for the host's own listings only.

**TC-HOST-04 — Edit sensitive field → re-approval**
1. Edit a sensitive field (e.g. city/pricing) on an approved listing.
- **Expected:** listing flips to PENDING_APPROVAL (needs re-approval) and drops
  from public results until re-approved.

---

## 11. Admin Console

**TC-ADMIN-01 — Approve a listing**
1. As admin, open pending listings. 2. Approve TC-HOST-02's listing.
- **Expected:** listing becomes APPROVED and now appears in public discovery;
  host is notified.

**TC-ADMIN-02 — Approve/reject a host**
1. In host management, approve the pending host application.
- **Expected:** host gains host capabilities; can now publish; audit log records
  the action + actor.

**TC-ADMIN-03 — Bookings & manual refund**
1. Open booking management; find a paid booking. 2. Issue an admin refund.
- **Expected:** refund recorded against the booking; ledger + audit updated;
  status reflects the refund.

**TC-ADMIN-04 — Staff application review**
1. Submit a staff application (`/auth/admin-register`). 2. As L1 admin, review &
   approve it.
- **Expected:** application appears in the admin staff queue; approval assigns the
  requested role/level.

**TC-ADMIN-05 — Control panel / feature flags**
1. Open the admin control panel. 2. Toggle a feature flag off, then on.
- **Expected:** the gated feature disables/enables accordingly; change is audited.

**TC-ADMIN-06 — Reports & analytics**
1. Open revenue/analytics/forecast dashboards.
- **Expected:** figures render without error and reconcile with known test bookings.

---

## 12. Payments

**TC-PAY-01 — GST-inclusive summary**
1. At checkout, inspect the price breakdown.
- **Expected:** subtotal, cleaning, platform fee (10%), GST (18% of fee), and
  total shown in ₹, matching the money reference.

**TC-PAY-02 — Webhook confirmation (staging)**
1. Complete a test payment on staging (Razorpay webhook configured).
- **Expected:** booking confirms within seconds of payment via the webhook;
  status updates without a manual refresh loop.

**TC-PAY-03 — Payment history**
1. Open the guest's payment/booking history.
- **Expected:** each payment shows amount, type (full/deposit/balance), status,
  and timestamp.

---

## 13. Guest Hub

**TC-GUEST-01 — Wishlist**
1. Click the heart on a listing; open the wishlist; remove it.
- **Expected:** listing added/removed; wishlist persists across sessions.

**TC-GUEST-02 — Travel preferences**
1. Set dietary + wellness preferences in the profile.
- **Expected:** saved and reflected on reload; used by discovery/itinerary where
  applicable.

**TC-GUEST-03 — Booking history split**
1. View Upcoming vs Previous trips.
- **Expected:** bookings are correctly bucketed by date/status.

**TC-GUEST-04 — Support ticket**
1. Raise a support/assistance issue for a booking.
- **Expected:** ticket created and visible; host/admin can see it.

---

## 14. SOS & Safety

**TC-SOS-01 — Trigger an SOS**
1. As a guest (grant location permission), open `/sos`. 2. Pick a tier
   (Medical/Security/Transport/Other), add a message, trigger.
- **Expected:** incident created immediately; confirmation shown; ops + trusted
  contacts alerted (email/SMS or stub logs) within seconds.

**TC-SOS-02 — Trusted contacts**
1. Add a trusted contact (name + phone/email) in the safety settings.
- **Expected:** saved; included in the next SOS broadcast.

**TC-SOS-03 — Admin SOS console**
1. As admin, open the SOS console; acknowledge the TC-SOS-01 incident.
- **Expected:** incident visible with location/map link; acknowledgement recorded;
  status transitions (OPEN → ACKNOWLEDGED).

---

## 15. AI Itinerary Planner

**TC-ITIN-01 — Generate concepts + plan**
1. Open the itinerary planner; enter dates, destination, preferences. 2. Get 3
   concept suggestions; pick one; generate the full plan.
- **Expected:** 3 distinct concepts returned; selecting one produces a day-by-day
  plan; saved to the user's itineraries. (With no API key, a stub plan or a clear
  "unavailable" message — never a hang.)

**TC-ITIN-02 — Monthly cost cap**
1. Repeatedly generate itineraries until the per-user monthly cap is hit.
- **Expected:** further generations are refused with a clear cap message; no
  runaway cost.

---

## 16. Experiences Marketplace

**TC-EXP-01 — Host creates an experience**
1. As a host, create an experience (category, price, capacity). Submit.
- **Expected:** saved pending moderation; not yet public.

**TC-EXP-02 — Admin moderates, guest books**
1. Admin approves it. 2. Guest books the experience.
- **Expected:** experience appears publicly after approval; guest booking succeeds
  and is recorded.

---

## 17. Concierge Chat & Messaging

**TC-MSG-01 — Guest ↔ host message**
1. As a guest with a booking, message the host. 2. As the host, reply.
- **Expected:** thread delivers both ways; unread indicators update.

**TC-MSG-02 — Concierge SLA**
1. Open a concierge thread; leave it unanswered past the SLA (or QA-tweak the deadline).
- **Expected:** an admin alert is created exactly once for the breached thread.

---

## 18. Trip Groups & Expense Splitting

**TC-TRIP-01 — Create a group + invite**
1. Create a trip group for a booking; invite a second guest. 2. Second guest accepts.
- **Expected:** group created; member joins; both see the group.

**TC-TRIP-02 — Split an expense**
1. Add an expense; split it among members (equal/custom).
- **Expected:** per-member shares computed correctly and sum to the total.

---

## 19. Rewards, Membership & Referrals

**TC-REW-01 — Loyalty points on completed stay**
1. Complete a stay (or QA-trigger auto-complete).
- **Expected:** loyalty points awarded (floor of accommodation spend rule);
  visible in rewards.

**TC-REW-02 — Referral credit**
1. Share a referral code; have a new user register with it and complete a booking.
- **Expected:** referral credit applied per the rules.

**TC-REW-03 — SIP / membership**
1. Start a SIP/membership contribution.
- **Expected:** membership state + contribution recorded.

---

## 20. Investor Dashboard

**TC-INV-01 — View portfolio**
1. As an investor user, open the investor dashboard.
- **Expected:** investment portfolio, monthly revenue/distributions, occupancy,
  and reports render; capital-call status visible.

---

## 21. Notifications & Background Jobs

**TC-JOB-01 — Notification delivery**
1. Complete a booking (confirmation) and a cancellation.
- **Expected:** guest gets confirmation + cancellation notices; host gets a new-
  booking + cancellation notice; admin sees a DB notification. (Stub logs to
  console if providers are off.)

**TC-JOB-02 — Background jobs run cleanly**
1. With Redis up, watch the API logs for ~2 minutes.
- **Expected:** scheduler ticks (hold-expiry, outbox every 30s, etc.) run with
  **no** `Custom Id cannot contain :` or other enqueue errors; holds expire and
  the outbox dispatches.

**TC-JOB-03 — Hold auto-expiry**
1. Place a hold and do not book. 2. Wait past the 15-min TTL (or QA-shorten it).
- **Expected:** hold is released automatically; dates become bookable again.

---

## 22. Cross-cutting

**TC-X-01 — RBAC on every role boundary**
1. As guest, attempt host and admin endpoints/pages; as host, attempt admin.
- **Expected:** each unauthorized access is denied (403/redirect); no data leaks.

**TC-X-02 — Input validation**
1. Submit forms with invalid/empty required fields and oversized inputs.
- **Expected:** clear validation errors; no 500s; no malformed data saved.

**TC-X-03 — Error handling**
1. Trigger a not-found (bad URL/id) and an unauthorized action.
- **Expected:** friendly 404/permission messages with a correlation id; no stack
  traces exposed to the user.

**TC-X-04 — Health checks (ops)**
1. Hit `/api/health`, `/api/health/live`, `/api/health/ready`.
- **Expected:** live returns ok; ready returns ok when Postgres is up and 503 when
  it's down.

---

## 23. Regression smoke test (run before every release)

1. Register guest → login. 2. Search + open a listing. 3. Hold → book → pay in
   full → **CONFIRMED_PAID**. 4. Cancel a >48h booking → 100% refund. 5. Admin
   approves a new listing. 6. Trigger + acknowledge an SOS. 7. Generate an
   itinerary. 8. Confirm scheduler logs are clean.
- If all 8 pass, the core platform is healthy.

---

## 24. Defect log (copy per issue)

| Field | Value |
|---|---|
| Scenario ID |  |
| Severity | Critical / Major / Minor |
| Environment | local / staging |
| Steps to reproduce |  |
| Expected |  |
| Actual |  |
| Screenshot / log |  |
| Status | Open / Fixed / Won't fix |
