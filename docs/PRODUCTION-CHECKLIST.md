# Dhyana Stays — Production Feature Checklist

**Source:** `all modules.pdf` — "Complete Module Breakdown (V1→V3)", 34 modules.
**Audited:** 2026-07-18, against the actual codebase (grep-verified, not assumed).
**Companions:** [`TODO.md`](./TODO.md) (engineering debt) · [`DEPLOYMENT.md`](./DEPLOYMENT.md) (infra) · [`CHANGELOG-detailed.md`](./CHANGELOG-detailed.md)

**Legend:** ✅ done to standard · 🟡 partial (exists, gaps noted) · ❌ not built · 🔮 explicitly future (PDF module 34 / V3)

**The PDF's own phasing:** Phase 1 (MVP) = modules 1–10 · Phase 2 = 11–20 · Phase 3 = 21–34.

---

## Scorecard at a glance

| Phase | Modules | ✅ | 🟡 | ❌ |
|---|---|---|---|---|
| Phase 1 (MVP, 1–10) | 10 | 4 | 5 | 1 |
| Phase 2 (11–20) | 10 | 2 | 6 | 2 |
| Phase 3 (21–34) | 14 | 2 | 6 | 6 |

Core guest journey (discover → book → pay → stay → review) is **production-hardened**
(260 unit + 34 integration tests, concurrency-proofed booking engine, deployed to
staging). The largest gaps are **account-recovery flows, invoices, coupons,
booking modification** (Phase-1 polish) and the **partner-operations modules**
(inspection, food/bike/local services as full marketplaces, CRM/CMS).

---

## Module-by-module checklist

### 1. Authentication & User Management — 🟡
| Feature | Status | Notes |
|---|---|---|
| User Registration | ✅ | guest/host, dual-mode (custom JWT / Auth0) |
| Login | ✅ | argon2, progressive login rate limiting |
| OTP Verification (phone) | ❌ | no phone OTP flow |
| Email Verification | ❌ | accounts active immediately |
| Forgot / Reset Password | ❌ | **critical gap — users who forget are locked out** |
| Social Login (Google, Apple) | 🟡 | via Auth0 mode only; not in custom-JWT mode |
| Two-Factor Authentication | ✅ | TOTP (otplib), setup/confirm/challenge |
| User Roles | ✅ | GUEST/HOST/ADMIN + kinds + L1–L3 admin levels |
| Session Management | ✅ | refresh-token families, theft detection, session list |
| Device Management | 🟡 | sessions listable; no per-device naming/revoke UX |
| User Profile / Photo | 🟡 | profile ✅; photo upload wired to storage (stub locally, R2/S3 in prod) |
| Change Password | ✅ | |
| Delete Account | ❌ | no self-service deletion (privacy/DPDP consideration) |
| Notification Preferences | ✅ | per-channel opt-outs (§5.17) |
| Privacy Settings | ❌ | |

### 2. Traveller Module — 🟡
| Feature | Status | Notes |
|---|---|---|
| Dashboard / My Profile | ✅ | |
| Saved Addresses | ❌ | |
| Wishlist / Favourite Stays | ✅ | |
| Recently Viewed | ❌ | |
| Booking History / Upcoming / Previous | ✅ | |
| Reviews Given | ✅ | |
| Reward Points | ✅ | loyalty points on completed stays (§5.13) |
| Coupons | ❌ | no coupon wallet (see module 25) |
| Travel Preferences | ✅ | dietary + wellness (Guest Hub P1) |
| Emergency Contacts | ✅ | SOS trusted contacts |
| Download Invoice | ❌ | no invoice/PDF generation anywhere |
| Support Tickets | ✅ | GuestIssue + Assistance Hub |

### 3. Stay Discovery — 🟡 *(active work: `feature/discovery-map`)*
| Feature | Status | Notes |
|---|---|---|
| Homepage / Search / Filters | ✅ | Meilisearch + Postgres fallback; facets §5.18 |
| AI Search (natural language) | ❌ | |
| Map Search | 🟡 | Leaflet grid/map/split ✅; no bounds-based "search this area" |
| Nearby Search (geo-radius) | ❌ | lat/lng exist; no distance query |
| Categories (workation, farm stays, pet friendly, luxury…) | 🟡 | experience tags + property type cover some; PDF's full category taxonomy not modeled |
| Featured / Recommended / Trending / Seasonal | ❌ | no curation/ranking surfaces |

### 4. Property Details — 🟡
| Feature | Status | Notes |
|---|---|---|
| Gallery, Amenities, Description, Host, Reviews/Ratings, Cancellation Policy, Location Map, Availability | ✅ | |
| Videos / 360 Tour | ❌ | media is images-only |
| Story Behind Stay | ❌ | no dedicated field |
| House Rules | ✅ | |
| Nearby Attractions / Restaurants / Cafes / Experiences | 🟡 | host-curated directions/guide exists; no structured nearby dataset |
| Share Property | ❌ | no share/OG deep-link affordance |

### 5. Booking Engine — ✅ *(the hardened core)*
| Feature | Status | Notes |
|---|---|---|
| Calendar / Availability / Holds | ✅ | 15-min holds, release-on-abandon, countdown for others |
| Dynamic Pricing | 🟡 | base + seasonal rates ✅; no demand-based engine |
| Coupon | ❌ | loyalty-tier discount exists; no coupon codes |
| Guest Selection / Extra Guest | 🟡 | guest count ✅; no per-extra-guest pricing |
| Add-ons (Food / Bike / Experience) | ✅ | §5.7 with commission + provider share |
| Summary / Taxes / Discounts / Confirmation | ✅ | GST 18% on platform fee, signed price snapshot |
| Invoice | ❌ | |
| Booking Status | ✅ | full state machine, append-only history |
| Modify Booking (dates/guests) | ❌ | cancel + rebook only |
| Cancel / Refund Management | ✅ | 100/50/0 tiers, frozen policy snapshot, admin refund engine |

### 6. Payment Module — ✅
| Feature | Status | Notes |
|---|---|---|
| Razorpay (UPI/Cards/NetBanking/Wallet) | ✅ | via Razorpay Checkout; live keys pending KYC |
| EMI | 🟡 | Razorpay-side toggle; Pay-Later instalments (§5.6) are the platform's own EMI |
| Partial / Deposit / Balance | ✅ | DEPOSIT_50 + balance settlement (hardening pass) |
| Refund | ✅ | ledgered, webhook-confirmed |
| GST Invoice | ❌ | tax math ✅; no GST-compliant invoice document |
| Payment History / Status | ✅ | |

### 7. Host Dashboard — 🟡
| Feature | Status | Notes |
|---|---|---|
| Dashboard / Revenue / Occupancy / Calendar / Guest Details / Reviews / Notifications | ✅ | host analytics module |
| Booking Requests | 🟡 | instant-book model; no request/approve flow |
| Availability / Pricing | ✅ | incl. seasonal rates |
| Promotions | ❌ | |
| Expenses / Maintenance | ❌ | (trip-group expenses are guest-side) |
| Documents | ❌ | |

### 8. Property Onboarding — 🟡
| Feature | Status | Notes |
|---|---|---|
| Apply as Host / Property Details / Images / Amenities / House Rules / Pricing / Approval Status | ✅ | admin approval + re-approval on sensitive edits |
| KYC | ❌ | no identity-document flow |
| Property Verification | 🟡 | admin approval yes; no verification evidence trail |
| Documents Upload | 🟡 | storage service ready; no onboarding doc requirements |
| Bank Details | ❌ | **payouts have no stored bank/UPI target — blocks real host payments** |
| Videos | ❌ | |

### 9. Curated Stay Inspection — ❌
Not built: no inspection checklist, architecture/interior/cleanliness/hospitality/
sustainability/safety/guest-experience scores, final rating, or reinspection flow.
(This is Dhyana's brand differentiator — see priority list.)

### 10. Admin Dashboard — ✅
All PDF items ✅ (users, hosts, property approval, bookings, revenue, payments,
reports/analytics/forecast, support/SOS console, notifications, settings)
**except CMS ❌** (see module 28).

### 11. Investor Dashboard — 🟡
Portfolio, monthly revenue/distributions, occupancy, reports, capital calls ✅.
Documents/Agreements 🟡 (model exists; no signing flow). ROI calculator ❌.
Financial statements ❌. Exit request ❌.

### 12. Split Investment — 🟡
Distributions + capital calls ✅. Projects/unit availability ❌. Investment
calculator ❌. Share allocation 🟡 (ownership share stored). Investor wallet ❌.
Exit strategy ❌. Payment tracking 🟡 (capital-call status).

### 13. Architecture Consultancy — ❌ (lead-capture form at minimum)
### 14. Hospitality Consultancy — ❌ (same)

### 15. AI Trip Planner — 🟡
Itinerary generator ✅ (Anthropic, 3-step, per-user cost cap, stub fallback).
Stay recommendation 🟡 (inside itineraries). Budget/route planning ❌.
Weather/food/event suggestions ❌. Packing checklist ❌.
AI chat assistant 🟡 (Concierge Chat §5.10 is human+SLA, not AI).

### 16. Experience Marketplace — ✅
Host-created experiences with categories (yoga, wellness, tours, cultural…),
guest booking, admin moderation (§5.15).

### 17. Bike Rental — 🟡
Exists as a booking **add-on** with provider share. No partner onboarding,
vehicle inventory, document/deposit handling, or return workflow.

### 18. Curated Food — 🟡
Food packages as booking **add-ons**. No restaurant partners, menus, pre-order,
or room-delivery workflow.

### 19. Local Services — ❌
No taxi/auto/guide/doctor/pharmacy/grocery/laundry directory. (SOS ops contacts
exist but are emergency-only.)

### 20. SOS & Safety — ✅
Emergency button, tiers, <5s broadcast queue, trusted contacts, ops phone/email,
admin console ✅. Share live location ❌. One-tap police/ambulance dial 🟡
(numbers shown, no tel: quick actions).

### 21. Reviews & Reputation — 🟡
Reviews + ratings ✅. Photos/videos on reviews ❌. Host reply ❌.
Report review ❌. AI sentiment ❌.

### 22. Rewards & Membership — ✅
Loyalty points, tiers with discounts, SIP membership, referral credits ✅.
Cashback ❌. Coupons ❌ (module 25). Premium membership 🟡 (SIP is the vehicle).

### 23. Notifications — 🟡
Email + SMS + in-app via outbox (§5.17) ✅. WhatsApp 🟡 (channel enum exists,
no provider). Push ❌. Promotional campaigns ❌.

### 24. CRM — ❌ · 25. Marketing — ❌ (no promo codes, offers, banners, affiliates)

### 26. Analytics — 🟡
Booking/revenue/occupancy + admin forecast + host analytics ✅.
Conversion rate ❌. Retention/cancellation analytics ❌. (No product-analytics tooling.)

### 27. Finance — 🟡
Revenue ledger, payouts (batches, eligibility), commission (10% fee) ✅.
Expenses ❌. P&L ❌. GST/TDS reports ❌.

### 28. CMS — ❌
No blogs, FAQs, policy pages, about/careers/contact management. (Static pages
partially exist in the web app; nothing editable.)

### 29. Customer Support — 🟡
Tickets (GuestIssue) + Assistance Hub + Concierge Chat with SLA ✅.
Help center / FAQ / knowledge base ❌.

### 30. Mobile App Sync — 🟡
Clean REST API + JWT refresh ✅ (mobile-ready). Push, deep links, offline sync ❌.

### 31. API & Integrations — 🟡
Razorpay ✅ · Maps 🟡 (Leaflet/OSM, not Google) · Email ✅ (Resend/SendGrid/SMTP)
· SMS ✅ (MSG91/Twilio) · Storage ✅ (S3/R2) · AI ✅ (Anthropic) ·
WhatsApp ❌ · Analytics APIs ❌.

### 32. Security — 🟡
JWT ✅ · RBAC ✅ · Audit logs ✅ · Rate limiting ✅ · API security (HMAC
snapshots, webhook verification, idempotency) ✅ · Encryption 🟡 (TLS + argon2;
no field-level encryption) · Firewall 🟡 (platform-level) ·
**Backup & Recovery ❌ (no automated backups or restore drill).**

### 33. Super Admin — ✅
Control panel, feature flags, L1–L3 hierarchy, platform settings, system config ✅.
Multi-location/organization management ❌ (single-org by design for now).

### 34. Future Expansion — 🔮
Android/iOS, voice booking, smart locks, IoT, EV, carbon tracking, i18n,
franchise, white-label SaaS, corporate portal, insurance, flight/train — all
explicitly future; none built, none expected for launch.

---

## TO-BE-DONE — prioritized for production standard

### P0 — Launch blockers (guest/host/money trust)
1. **Forgot / reset password** (email-token flow) — without it, locked-out users churn. Includes email verification while touching the mailer.
2. **Host bank details + payout target** (account/IFSC or UPI, with masked storage) — payout batches currently have nowhere to send money.
3. **GST-compliant invoice generation** (PDF per booking; guest download + admin copy) — legally expected for Indian B2C lodging.
4. **Automated DB backups + one restore drill** (also on `TODO.md` P3) — no recovery story today.
5. **Production providers go-live** (Razorpay live KYC, Resend/MSG91 or Twilio, R2, Anthropic key, SOS contacts) — env-validated already; accounts + keys pending.
6. **Monitoring/alerting** (Sentry + uptime + queue-lag alerts for `sos-broadcast`/outbox).

### P1 — Phase-1 polish (top-standard core journey)
7. **Coupon/promo-code engine** (admin-created codes, validity windows, usage caps; hooks into the quote pipeline next to loyalty discount).
8. **Modify booking** (date/guest changes with re-quote + delta payment/refund through the state machine).
9. **Review upgrades**: host reply, report/moderation, photo uploads.
10. **Curated Stay Inspection module** (module 9 — checklist, seven scores, final rating badge on listings, reinspection) — the brand's core differentiator and currently 0%.
11. **Discovery upgrades** (in progress on `feature/discovery-map`): bounds/nearby search, category surfaces (featured/trending/seasonal collections), share links with OG images.
12. **Booking-request mode** (host approval flow) as an opt-in alternative to instant book.
13. **Delete account + privacy settings** (DPDP Act hygiene).

### P2 — Phase-2 completion (partner operations)
14. Bike rental as a real vertical: partner onboarding, vehicle inventory, deposits, returns.
15. Curated food: restaurant partners, menus, pre-order + delivery scheduling.
16. Local services directory (taxi/guide/doctor/laundry…) with SOS quick-dial integration.
17. Investor: ROI calculator, financial statements, exit-request workflow; split-investment projects + calculator.
18. SOS live-location sharing + tel: quick actions.
19. AI trip planner: weather/food/packing enrichment; make Concierge optionally AI-assisted.
20. Consultancy modules (13/14) as lead-capture + project-tracking lite.

### P3 — Phase-3 platform maturity
21. CMS (blogs/FAQ/policies/banners) — unlocks SEO + the marketing module.
22. Marketing: offers, seasonal campaigns, banner management, affiliates.
23. CRM: lead pipeline, segmentation, email/WhatsApp campaigns.
24. WhatsApp provider + web push notifications; promotional campaign sends.
25. Finance depth: expense tracking, P&L, GST/TDS report exports.
26. Analytics depth: conversion funnel, retention, cancellation analytics.
27. Help center / knowledge base.
28. Mobile enablers: push infra, deep links (API is already mobile-ready).

### Engineering debt gate (applies across all of the above)
Every new feature ships with: integer-paise money handling, RBAC + audit trail,
idempotency where money moves, unit tests (+ integration tests for money paths),
lint/typecheck green, both changelog tiers updated, and works with Meilisearch
absent. CI (now green) gates every PR; integration suite in CI is still pending
(`TODO.md` P1).
