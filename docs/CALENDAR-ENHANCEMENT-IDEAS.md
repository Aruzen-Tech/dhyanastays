# Interactive Calendars — Research, Ideas & Implementation Plans

**Date:** 2026-07-24 · **Status:** brainstorm / proposal (nothing built yet)
**Scope:** the three calendar surfaces + the data + a phased plan.

---

## 1. Where calendars live today (grounded in the code)

| Surface | File | What it is now | Biggest gap |
|---|---|---|---|
| **Guest booking** | `apps/web/app/listings/[id]/page.tsx` | Two native `<input type="date">` (check-in / check-out) + guests. Hold-status banner for dates held by others. **No visual calendar, no availability, no price-per-night.** | Guests can't *see* what's open or what it costs per night — they pick blind and only learn a date is taken when the hold/quote fails. |
| **Host availability** | `apps/web/app/host/calendar/page.tsx` | Hand-rolled month grid; booking chips coloured by status (green/blue/amber/gray). Read-only. | No way to block dates, set seasonal prices, or see occupancy/revenue from the calendar. |
| **Admin ops** | `apps/web/app/admin/calendar/page.tsx` | Month grid of bookings for one listing. | Single-listing, no multi-property timeline, no check-in/out-today ops view. |

**Critical missing piece:** there is **no public availability endpoint**. Public
listing routes are only `/`, `/search`, `/map`, `/:id`, `/meta/tags`,
`/meta/facets`. So any guest-facing availability calendar needs a new endpoint
first.

**Data already available to colour a calendar** (all keyed by listingId + date range):
- `Booking` (status: CONFIRMED_PAID / CONFIRMED_DEPOSIT / BALANCE_DUE / PAYMENT_PENDING / CHECKED_IN …)
- `Hold` (`expiresAt` — active when `> now`; already surfaces "on hold — MM:SS")
- `AvailabilityBlock` (host-blocked ranges + `reason`)
- `SeasonalRate` (per-range `nightlyRate` override, in paise)
- `RateRule` (`baseNightlyRate`, `minNights`, `maxGuests`, `cleaningFee`)
- The booking-overlap definition (GiST + half-open ranges) already exists server-side and can be reused verbatim.

---

## 2. The core idea — one availability colour language

A single, legible colour system used consistently across all three calendars
(so hosts, guests, and admins read the same signals). Built on the design tokens
(`brand`, `gold`, `gray`, semantic statuses) and theme-aware for dark mode.

| State | Visual | Meaning |
|---|---|---|
| **Available** | surface + subtle border | Open to book |
| **Available · seasonal price** | small `gold` price pill / warm tint | Open, but priced differently than base |
| **Selected range** | `brand-700` fill, rounded ends | The guest's chosen check-in→out |
| **Hover preview** | `brand-100` wash | Range the cursor would select |
| **On hold (other guest)** | `amber` diagonal + live MM:SS | Temporarily locked; frees when the timer ends |
| **Booked — paid** | `green` | CONFIRMED_PAID / CHECKED_IN / COMPLETED |
| **Booked — deposit** | `blue` | CONFIRMED_DEPOSIT |
| **Booked — balance due** | `amber` | BALANCE_DUE |
| **Pending payment** | `gray` | PAYMENT_PENDING (soft-held) |
| **Host-blocked** | gray hatch + reason tooltip | Owner made it unavailable |
| **Turnover day** | split cell (▟) | Checkout in the morning, check-in same evening — bookable as an arrival |
| **Past / disabled** | muted | Not selectable |
| **Min-nights unreachable** | faint strike | Can't satisfy `minNights` from here |

The turnover-day split cell is the subtle, high-value one: it visually encodes
the half-open range rule the booking engine already enforces (checkout day ==
next check-in day is allowed), so back-to-back stays don't *look* blocked.

---

## 3. Guest booking calendar — the flagship

Replace the two native date inputs with an interactive month calendar.

**Core interactions**
1. **Colour-coded days** using §2, with the **nightly price rendered in each
   cell** (base or seasonal, in ₹ via `formatINR`).
2. **Range select** — click check-in, hover shows the candidate range + a **live
   running total** (nights × nightly + cleaning + fees + GST), click check-out
   to confirm. Invalid checkouts (crossing a booked/blocked day, or violating
   `minNights`) are disabled.
3. **Live hold countdown** painted directly on held days ("2 nights held —
   03:41") — reuses the existing hold-status data, far clearer than today's
   separate banner.
4. **Dual-month view** on desktop (plan across a month boundary); single
   swipeable month on mobile with big tap targets.
5. **Price heatmap toggle** — cell background intensity ∝ nightly price, so
   cheaper nights pop. Great for flexible travellers.
6. **Scarcity nudge** — "only 4 nights left this month" when occupancy is high
   (drawn from the same availability payload; honest, not fake urgency).

**Creative extensions**
- **Flexible dates** — "± 3 days, cheapest 3-night window" finds the lowest-cost
  valid range and highlights it.
- **Theme-tinted calendar** — tint the calendar with the listing's Stay Pass
  theme colour (the `stayThemeId` we just added), so the forest villa's calendar
  is evergreen, the heritage haveli's is amber — a small identity thread from
  discovery → booking → the Stay Pass ticket.
- **"Good for a weekend / long weekend"** chips that jump the selection to the
  next open Fri–Sun.
- **Min-nights hint** — hovering a date whispers "3-night minimum" instead of
  silently rejecting.

---

## 4. Host availability calendar — from viewer to control surface

Upgrade the existing month grid into an editing surface.

- **Paint-to-block** — click-drag across days to block/unblock a range
  (creates/deletes `AvailabilityBlock`); a reason prompt on release.
- **Drag-to-price** — select a range and set a **seasonal rate** inline
  (`SeasonalRate`), with the new price previewed in the cells immediately.
- **Occupancy / revenue overlay** — a toggle that shades each day by occupancy,
  or shows the day's booked revenue (host's payout share, in paise) — turns the
  calendar into a mini analytics view.
- **Booking chips with guest + payout** and a day-click quick-action sheet
  (block, price, message guest, view booking).
- **Min-stay per season** (e.g., 2-night minimum in peak) — a natural companion
  to seasonal rates.
- **Bigger / later: iCal two-way sync** — import Airbnb/Booking.com `.ics` to
  block externally-booked dates, and expose an outbound `.ics` feed. This is the
  highest-value "creative" item for real multi-channel hosts, but it's a
  multi-sprint effort (parsing, conflict resolution, a sync worker).

---

## 5. Admin ops calendar — a control tower

- **Multi-listing timeline (Gantt)** — rows = listings, horizontal bars =
  bookings coloured by status; the fastest way to read the whole portfolio at a
  glance. Replaces the single-listing month grid.
- **"Today" ops rail** — arrivals, departures, and turnovers happening today,
  with the Stay Pass check-in state (scanned vs not).
- **Filters + KPIs** — filter by city/host/status; header KPIs for occupancy and
  ADR (average daily rate) over the visible window.
- **Anomaly flags** — a balance-due booking whose check-in is <48h away, or a
  CHECKED_IN booking with no payout eligibility yet — surfaced as coloured dots.

---

## 6. Implementation plan

### 6.1 Backend — the enabling endpoint (do first)
`GET /api/listings/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` (Public).
Returns a per-day array:

```jsonc
{ "date": "2026-08-14",
  "state": "AVAILABLE|BOOKED|HELD|BLOCKED|TURNOVER|PAST",
  "priceMinor": 500000,           // base or seasonal, paise
  "isSeasonal": true,
  "minNights": 2,
  "heldUntil": "2026-08-14T18:22:10Z"  // when HELD
}
```
- One query each for `Booking` (active-status overlap — reuse the exact half-open
  overlap the engine uses), active `Hold` (`expiresAt > now`), `AvailabilityBlock`,
  `SeasonalRate`; fold into a day map over `[from, to]` in the listing's timezone
  (`Asia/Kolkata`).
- **Never leak PII** — the public payload has states + prices only (no guest
  names/booking ids). A host/admin variant can include booking detail.
- Cacheable (short TTL); cap the window (e.g. ≤ 90 days) to bound cost.

### 6.2 Frontend — a shared calendar component
- The host calendar already hand-rolls a month grid; **extract a reusable
  `<MonthGrid>`** (days, week rows, month nav) and build three thin skins on it:
  guest (read + range-select), host (edit), admin (timeline is separate).
- **Library vs custom:** you have no calendar lib today and a strong design
  system. A **custom lightweight component is the pragmatic pick** — full control
  over the colour language, price-in-cell, turnover split cells, and dark mode,
  with no new heavy dependency. (If range-select ergonomics get fiddly,
  `react-day-picker` is the fallback — headless, ~small, themeable.)
- Money strictly in **paise**, rendered via `formatINR`; all colours from design
  tokens; theme-aware light/dark; keyboard + ARIA for the grid.

### 6.3 Phasing
- **P1 — Guest availability (flagship).** New endpoint + `<MonthGrid>` +
  colour-coded read calendar with price-in-cell + range select + live total +
  hold countdown. Replaces the native inputs. *Highest UX impact, self-contained.*
- **P2 — Host control.** Paint-to-block + drag-to-price + occupancy overlay on
  the same `<MonthGrid>`.
- **P3 — Admin timeline.** Multi-listing Gantt + today rail + KPIs + anomaly dots.
- **P4 — Delight & sync.** Flexible-dates, theme-tinted calendars, price heatmap;
  then iCal two-way sync as its own project.

### 6.4 Correctness & testing
- The availability endpoint's "booked" definition **must match the booking
  engine's overlap rule exactly** (half-open ranges; the GiST/`tsrange` logic) —
  reuse it, don't re-derive, or the calendar will disagree with what the engine
  accepts. Unit-test the day-folding (seasonal override precedence, block vs
  hold vs booking priority, turnover days) and timezone boundaries (IST).
- Guest range-select must enforce `minNights` and refuse ranges that cross any
  non-available day — mirror the server so the UI never offers an impossible
  booking.

### 6.5 Cross-cutting constraints (house rules)
Paise-integer money · design tokens only (no hardcoded hex) · theme-aware ·
RBAC (host edits only own listings; admin any) · audit host block/price changes ·
feature-flag the guest calendar rollout · works with Meilisearch absent · both
changelog tiers on ship.

---

## 7. Recommended first slice
Ship **P1** behind a flag: the availability endpoint + a colour-coded guest
booking calendar with price-per-night and range-select. It's the single biggest
UX upgrade (guests currently book blind), it's self-contained (no schema
changes — all the data exists), and it establishes the shared `<MonthGrid>` +
colour language that P2/P3 build on. Ballpark ~1 sprint.
