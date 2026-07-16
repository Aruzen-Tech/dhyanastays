# Dhyana Stays — PDF Exploration & Gap Analysis

> Source: `Dhyana stay webapplication.pdf` (123 pages, 23 chapters)
> Prepared by: Dhyana Arc Creation LLP (for copyright registration)
> Analysis date: 2026-04-11
> Compared against: current `apps/api` + `apps/web` codebase

This document is the companion to `PRODUCTION_AUDIT.md`. Where the audit scores
the *implemented* code against production standards, this document scores the
*implemented* code against the *specification* in the uploaded PDF — i.e. it
answers "how much of the intended product actually exists in the repo today?"

---

## Executive summary

The PDF describes a **full-scope travel operating system** spanning discovery,
booking, AI planning, pre-booking add-ons, in-stay services, SOS, rewards,
investor dashboards, five-level admin ops and multi-party settlement.

The current codebase is a **well-engineered MVP** that implements the core
booking pipeline (discover → price → hold → pay → confirm → cancel → refund)
with strong back-end primitives (state machine, HMAC price snapshots, ledger,
webhook verification, double-booking exclusion constraint). It covers roughly
**35–40% of the features described in the PDF** by surface area, but the parts
that *are* built are built correctly and are the riskiest parts of the product
(money, concurrency, auth).

The single biggest structural gap is the **role model**: the PDF specifies
five admin levels plus a distinct investor vs property-owner vs service-team
separation; the code has a three-role enum (`GUEST | HOST | ADMIN`).

---

## Chapter map (23 chapters, 123 pages)

| # | Chapter | Pages | Implementation status |
|---|---|---|---|
| 1 | Introduction | 1–5 | N/A (narrative) |
| 2 | Platform Overview | 6–14 | Narrative now mirrored in README.md |
| 3 | User Types & Access Levels | 15–22 | **PARTIAL — 3 of 5+ roles** |
| 4 | Authentication System | 23–28 | **PARTIAL — no MFA, no social, no OTP** |
| 5 | Homepage & Navigation | 29–34 | PARTIAL — pages exist, personalisation missing |
| 6 | Stay Discovery & Search | 35–41 | IMPLEMENTED (Meilisearch facets) |
| 7 | Property Listing & Details | 42–48 | IMPLEMENTED — no 360°/VR |
| 8 | Booking Engine | 49–57 | **IMPLEMENTED (core strength of the repo)** |
| 9 | Pre-Booking Add-ons | 58–65 | **MISSING** |
| 10 | Experience & Event Module | 66–72 | **MISSING** |
| 11 | AI Itinerary Planner | 73–79 | **MISSING** |
| 12 | Post-Booking Dashboard | 80–84 | PARTIAL (guest dashboard exists; no concierge) |
| 13 | Service Integrations | 85–89 | **MISSING** (no transport/food/wellness APIs) |
| 14 | SOS & Support System | 90–94 | **MISSING** |
| 15 | Rewards & Membership | 95–100 | PARTIAL — referrals + credit ledger; no tiers |
| 16 | Investor Dashboard | 101–105 | **MISSING** |
| 17 | Admin Panel | 106–111 | PARTIAL — flat admin only |
| 18 | Payment System | 112–116 | IMPLEMENTED (Razorpay + ledger + payouts) |
| 19 | Notifications | 117–119 | PARTIAL — in-app only, no SMS/WhatsApp |
| 20 | Content & Media Management | 120–121 | PARTIAL — CDN yes, 360°/video editor no |
| 21 | Security & Data Protection | 122 | PARTIAL — see audit findings |
| 22 | Technical Architecture | 123 | **IDENTICAL to repo's ARCHITECTURE.md** |
| 23 | Future Scope | 123 | Roadmap (see §Roadmap below) |

---

## Detailed gap analysis

### Ch. 3 — User Types & Access Levels

**PDF specifies four stakeholder groups:**

1. **Travellers (Guests)** — browse, book, plan, review, earn rewards
2. **Investors & Property Owners** — *two distinct roles*: Investors contribute
   capital to properties; Owners operate them. Each has their own dashboard,
   revenue view, and approval chain.
3. **Admin & Operational Teams — 5 levels:**
   - L1 Super Admin — platform-wide control
   - L2 Operational Admin — finance, compliance, escalations
   - L3 Cluster / Regional Admin — geographic cluster ownership
   - L4 Property-Level Admin — per-property ops
   - L5 Service-Level Admin — per-service (transport, F&B, wellness) ops
4. **Employees & Service Teams** — concierge, housekeeping, drivers, chefs,
   wellness coaches, experience hosts, on-ground support

**Codebase reality** (`prisma/schema.prisma`, `UserRole` enum):

```prisma
enum UserRole { GUEST HOST ADMIN }
```

No distinction between investor and owner. No admin hierarchy — a single flat
`ADMIN` role. No service-team model at all. `Host` table has no parent/org,
no cluster linkage, no employee sub-accounts.

**Gap severity: STRUCTURAL (high).** This ripples through the entire
authorisation layer, the admin UI, the payout logic (multi-party settlement
assumes distinct payee roles), and the audit trail.

---

### Ch. 4 — Authentication System

PDF describes: email+password, social login (Google, Apple, Facebook),
phone+OTP, **MFA with SMS/TOTP/email fallback**, 3FA for admin, device
fingerprinting, session management with "active devices" list.

Codebase: email+password (Argon2 ✓), Auth0 sync path ✓, JWT access+refresh ✓.
**No MFA, no TOTP, no phone OTP, no social login wired up, no device list,
no session revocation UI.** Refresh token is stored in plaintext on the
`User` row with no rotation or family-tracking.

**Gap: HIGH for admin accounts (PDF mandates 3FA); MEDIUM for guests.**

---

### Ch. 5 — Homepage & Navigation

PDF describes personalised landing (intent-based carousels: *Wellness*,
*Heritage*, *Nature*, *Family*), geolocation greeting, trending searches,
"continue your trip planning" resume blocks, Pay Later banner, Trip-Savings
SIP entry point.

Codebase: `apps/web/app/page.tsx` exists with curated sections, but
personalisation is static. No SIP, no Pay Later, no resume-planning block.

---

### Ch. 6 — Stay Discovery & Search

PDF describes faceted filters (price, location, amenities, experience type,
dates, guest count), typo-tolerant search, map view, saved searches, alerts
on price drop, "similar stays" recommendations.

Codebase: Meilisearch is wired in (`search` module), facets are configured,
debounced query, map view present. Missing: saved searches, price-drop
alerts, "similar stays" retrieval. **~70% covered.**

---

### Ch. 7 — Property Listing & Details

PDF describes gallery with 360° viewer, video walkthroughs, host bio,
amenity matrix, availability calendar, nearby attractions, verified reviews,
"stay stories" (editorial), cancellation policy summary, price breakdown
preview.

Codebase: listing detail page, photo gallery, calendar, reviews, cancellation
policy summary, price preview all exist. **Missing: 360° viewer, video
walkthroughs, stay stories editorial layer, nearby-attractions map overlay.**

---

### Ch. 8 — Booking Engine ⭐ **(repo strength)**

This is where the codebase matches the PDF most completely.

PDF requirements → code mapping:

| PDF requirement | File | Status |
|---|---|---|
| Quote with frozen price | `pricing.service.ts` + HMAC signer | ✓ |
| Hold with TTL | `booking.service.ts` + `hold_expiry` cron | ✓ |
| Guarded state transitions | `booking.state-machine.ts` | ✓ |
| Double-booking prevention | `0003_db_integrity` trigger (tsrange &&) | ✓ |
| Razorpay order + webhook | `razorpay.service.ts` + `payment.controller.ts` | ✓ |
| Idempotent payment capture | `IdempotencyInterceptor` | ✓ |
| Cancellation policy tiers | `pricing.service.computeRefundAmount` | ✓ (48h/10h/0) |
| Append-only financial log | `LedgerEvent` + UPDATE/DELETE trigger | ✓ |
| Deposit vs paid-in-full split | `CONFIRMED_DEPOSIT` / `CONFIRMED_PAID` states | ✓ |
| Balance-due reminder | `balance_due` cron + notification | ✓ |

**One thing the PDF asks for that is missing: "Pay Later" (book now, pay in
instalments).** This is a distinct flow from deposit-then-balance and would
need its own state (e.g. `PAY_LATER_SCHEDULED`) with a payment schedule table.

---

### Ch. 9 — Pre-Booking Add-ons ❌ **MISSING**

PDF specifies a full add-on shopping cart attachable to any booking:

- Airport / station pickup (private cabs, priority)
- In-stay meals (curated chef, local tiffin, fixed menus)
- Workshops (pottery, cooking, farming, yoga)
- Local experiences (guided treks, temple tours, sound baths)
- Equipment rental (bikes, kayaks, cameras)
- Gift hampers / welcome kits
- Travel insurance upsell

Each add-on has its own price, availability window, cancellation tier, and
is settled to a distinct service provider.

**Codebase: no `AddOn`, `BookingAddOn`, or `ServiceProvider` models exist.**
The `Booking` row has no line-item child table.

**Gap severity: HIGH (user-facing revenue feature).**

---

### Ch. 10 — Experience & Event Module ❌ **MISSING**

PDF describes events as first-class bookable entities separate from stays:
retreats, workshops, concerts, festivals, wellness camps — with capacity,
ticket tiers, waitlist, organiser dashboard, post-event reviews.

Codebase has no `Event` / `Experience` / `TicketTier` models. Listings are
stays only.

**Gap severity: HIGH (a whole product surface).**

---

### Ch. 11 — AI Itinerary Planner ❌ **MISSING**

PDF describes an LLM-backed planner that:

1. Asks travellers about interests, pace, budget, companions
2. Generates a day-by-day plan using available stays + add-ons + events
3. Grounds the output against the platform's inventory (no hallucinated
   properties — the PDF explicitly flags this)
4. Produces a bookable bundle with a single checkout
5. Learns from feedback to improve ranking

Codebase: **nothing**. No LLM client wired in, no vector store, no
recommendation service.

**Gap severity: HIGH (flagship differentiator in the PDF).**

---

### Ch. 12 — Post-Booking Dashboard

PDF: booking timeline, checklist (ID upload, waiver signature, add-on
selection, arrival form), in-app concierge chat, itinerary view, expense
tracker, photo album auto-generated from on-property Wi-Fi uploads,
post-stay review prompt, digital receipts.

Codebase: guest dashboard page exists at `apps/web/app/dashboard/page.tsx`
with booking list + status, and basic booking detail. **Missing: concierge
chat, expense tracker, photo album, arrival form, ID upload.**

---

### Ch. 13 — Service Integrations ❌ **MISSING**

PDF lists external partner APIs: cab aggregators (Ola, Uber, Rapido),
food delivery (Swiggy, Zomato), wellness bookings, adventure operators,
ticketing (BookMyShow). Integration pattern: OAuth → provider-side
inventory sync → commission split → ledger event.

Codebase: no external service integrations present. Razorpay is the only
external API.

---

### Ch. 14 — SOS & Support System ❌ **MISSING**

PDF describes a panic-button experience inside the guest app:

- One-tap SOS → sends GPS, booking context, guest profile to 24×7 ops
- Local emergency number surfacing based on guest location
- Medical / security / transport incident tiers
- Incident record → admin audit → follow-up protocol
- Trusted contacts list with auto-SMS on SOS activation

Codebase: **nothing**. No incident model, no emergency broadcaster, no
ops console for SOS.

**Gap severity: HIGH (safety/brand critical, and PDF foregrounds it as a
trust pillar).**

---

### Ch. 15 — Rewards & Membership

PDF describes **tiered membership** (Explorer → Wanderer → Sojourner →
Patron → Ambassador) with:

- Earned credits per booking
- Tier-based perks (early access, free upgrades, priority SOS)
- **Trip Savings SIP** — guests deposit monthly into a wallet that earns
  bonus credits, redeemable against future bookings
- Referral engine (codes, double-sided rewards, fraud caps)
- Anniversary gifts

Codebase: `referral.service.ts`, `ReferralCode`, `CreditLedger` models
exist and `AuthService.register` applies referral codes. **Tiers are not
modelled, SIP is not modelled, anniversary gifts don't exist.**

**Partial — ~25%.**

---

### Ch. 16 — Investor Dashboard ❌ **MISSING**

PDF describes a dedicated investor surface: portfolio of properties,
monthly occupancy, revenue share, ROI curves, capex requests, document
vault (agreements, KYC, tax forms), distribution statements, capital call
notifications.

Codebase: no `Investor`, `Investment`, `Distribution`, or `CapitalCall`
models. The `Host` table is the only party-to-property linkage.

---

### Ch. 17 — Admin Panel

PDF describes a 5-level admin console with role-scoped views:

- L1 Super Admin: user management, role assignment, platform toggles
- L2 Operational Admin: finance reconciliation, dispute resolution, KYC
- L3 Cluster Admin: regional performance, property approvals
- L4 Property Admin: per-property ops, pricing rules, calendar
- L5 Service Admin: service-provider onboarding, menus, schedules

Codebase: `apps/web/app/admin/*` exists with listing approval + user
management + basic reports. **All admins see the same views — no
role-scoping beyond `UserRole.ADMIN`.**

**Gap severity: HIGH (security + ops separation of duties).**

---

### Ch. 18 — Payment System

This chapter maps closely to the repo. PDF specifies:

- Razorpay as primary gateway ✓
- Hosted checkout (PCI-safe) ✓
- HMAC-SHA256 webhook verification ✓
- Idempotency for payment capture ✓
- Append-only ledger ✓
- Multi-currency support (INR primary, USD/EUR future) — **INR only in code**
- **Multi-party settlement** (platform fee + host payout + service-partner
  shares in a single transaction) — *the PDF itself lists this under "Future
  Scope"*. Codebase has single-party weekly host payouts.
- Pay Later / EMI — **missing**
- Refund policy engine with admin override ✓

---

### Ch. 19 — Notifications

PDF: in-app, email, **SMS, WhatsApp, push (FCM/APNs)** across the booking
lifecycle, balance-due reminders, review prompts, SOS broadcasts.

Codebase: in-app notifications + email (transactional templates exist).
**SMS, WhatsApp, push all missing.**

---

### Ch. 20 — Content & Media Management

PDF: CDN-backed media, **360° viewer**, video walkthroughs, editorial
"stay stories", drone footage, host-uploaded video intros, moderation
workflow with human review.

Codebase: S3/CDN image pipeline exists (pre-signed uploads, WebP, responsive
sizes). **360°/video/editorial story system absent.**

---

### Ch. 21 — Security & Data Protection

PDF: TLS 1.2+, HSTS, CSP, **MFA**, Argon2 passwords, RBAC, audit logs,
rate limiting, GDPR-style right-to-erasure, DPDP compliance, encrypted
at rest, key rotation, pen-test cadence.

Codebase: Argon2 ✓, RBAC ✓, audit logs ✓, rate limiting ✓, CSP (Razorpay-
scoped) ✓, HMAC webhook ✓. **Missing: MFA, right-to-erasure flow, explicit
DPDP consent capture, key rotation runbook, pen-test artefacts.** Refresh
tokens are plaintext in DB (audit finding).

---

### Ch. 22 — Technical Architecture

**This chapter is effectively identical to the repo's `ARCHITECTURE.md`.**
It lists the same 22 Prisma models, 19 NestJS feature modules, 90+ API
endpoints, 41 frontend pages, 8 migrations and 4 background jobs. In
other words, the PDF's "technical architecture" chapter documents the
*current* repo, not the full PDF-spec product. The implication: the PDF
was authored knowing the MVP ships with the current architecture, and the
missing modules (Ch. 9–16) are intentionally deferred.

---

### Ch. 23 — Future Scope

PDF's own roadmap (ordered as listed in the document):

1. **Mobile apps** (React Native, iOS + Android)
2. **AI enhancements** — itinerary planner, dynamic pricing, chat concierge
3. **Marketplace expansion** — experiences, events, service marketplace
4. **International scaling** — Southeast Asia → Europe → Middle East
5. **Advanced service ecosystem** — transport/F&B/wellness partner network
6. **Creator marketplace** — travel creators, editorial, UGC monetisation
7. **Franchise & cluster scaling** — operational templates for new regions
8. **Data-driven optimisation** — ML ranking, fraud detection, LTV models

Reading the PDF end-to-end, items 2–5 are described in detail in Chapters
9–16 but listed again under "Future Scope", which strongly suggests the
PDF author is aware those modules are on the roadmap rather than already
shipped.

---

## Consolidated implementation scorecard

| Domain | PDF weight | Repo coverage |
|---|---|---|
| Core booking pipeline | ~20% | ~95% ✓ |
| Payments + ledger + payouts | ~15% | ~85% ✓ |
| Search & discovery | ~10% | ~70% |
| Listings & media | ~8% | ~60% |
| Auth & RBAC | ~8% | ~55% |
| Admin panel | ~8% | ~35% |
| Post-booking guest experience | ~7% | ~35% |
| Rewards & membership | ~5% | ~20% |
| Notifications | ~4% | ~30% |
| Pre-booking add-ons | ~5% | 0% |
| Experiences & events | ~3% | 0% |
| AI itinerary planner | ~3% | 0% |
| Service integrations | ~2% | 0% |
| SOS & support | ~1% | 0% |
| Investor dashboard | ~1% | 0% |
| **Weighted total** | **100%** | **≈ 40%** |

---

## Prioritised roadmap (what to build next)

Ordered by *user-visible value per unit of effort*, assuming the current
team size and the PDF's Future Scope ordering:

### Tier 1 — Ship in the next 1–2 sprints

1. **Fix the role model** — migrate `UserRole` to hierarchical admin
   levels + distinct Investor and Owner. This unblocks admin panel,
   investor dashboard, and audit-log separation of duties.
2. **MFA for admin accounts** — TOTP minimum (PDF mandates 3FA; TOTP
   satisfies the immediate compliance ask). Also protects the production
   admin console.
3. **Refresh-token rotation** — kill plaintext refresh tokens in DB; use
   family tracking per the `jwt-refresh-token-rotation` skill.
4. **SMS + WhatsApp notifications** — balance-due reminders currently sit
   in in-app only; adding transactional SMS closes the highest-loss
   revenue gap (missed balance payments).

### Tier 2 — Next 1 month

5. **Pre-booking add-ons** (Ch. 9) — introduce `AddOn`, `BookingAddOn`,
   `ServiceProvider` models. Reuse the existing price-snapshot HMAC signer
   and ledger pipeline so add-on money flows through the same audit trail.
6. **Rewards tiers + Trip Savings SIP** (Ch. 15) — promote the existing
   `CreditLedger` into a tier-aware wallet. Reuses the append-only ledger
   primitive.
7. **Admin role-scoped views** — now that the role model supports L1–L5,
   gate each admin page behind a `@Roles(L3, L4)` guard.

### Tier 3 — Next quarter

8. **Experiences & events module** (Ch. 10) — second bookable entity type.
   State machine mirrors `Booking` but with capacity/waitlist.
9. **SOS & support system** (Ch. 14) — incident model + ops console +
   trusted-contact broadcast. Safety-critical, PDF-foregrounded.
10. **AI itinerary planner MVP** (Ch. 11) — start with retrieval-only
    (no LLM generation): query the existing inventory with filters, rank
    via rule-based scoring, return a skeleton plan. Use the
    `rag-grounded-ai-generation` skill when adding an LLM stage.
11. **Investor dashboard** (Ch. 16) — surfaces ROI over existing booking
    data; mostly read-only queries against the ledger.

### Tier 4 — Future (matches PDF Ch. 23)

12. Mobile apps (React Native).
13. Dynamic pricing + ML ranking.
14. Creator marketplace.
15. Multi-currency + international expansion.
16. Multi-party settlement on the payment rail (PDF already lists this
    under Future Scope).

---

## How this doc relates to `PRODUCTION_AUDIT.md`

- `PRODUCTION_AUDIT.md` is the **quality audit**: is what we have ready to
  serve real users? (Answer: yes after the 4 blocker fixes already applied.)
- `PDF_EXPLORATION.md` (this file) is the **scope audit**: is what we have
  the full product the spec describes? (Answer: ~40%, but the 40% that
  exists is the riskiest 40% and is built correctly.)

Both documents should be updated together whenever a module from the Tier
1–3 roadmap lands.
