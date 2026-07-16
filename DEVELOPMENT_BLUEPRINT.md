# Dhyana Stays — Development Blueprint

> **Companion documents**
> - `README.md` — platform overview (from PDF §2)
> - `ARCHITECTURE.md` — current technical architecture (matches PDF §22)
> - `PRODUCTION_AUDIT.md` — quality audit of the *existing* code
> - `PDF_EXPLORATION.md` — scope audit vs. the PDF spec
> - **`DEVELOPMENT_BLUEPRINT.md` (this file)** — the forward plan

This document is the single source of truth for building the remaining
~60% of the Dhyana Stays platform described in `Dhyana stay
webapplication.pdf`. Every ticket, PR, migration and new module should
trace back to a section of this document.

---

## Table of contents

0.  How to use this document
1.  Vision & scope alignment
2.  Current state baseline
3.  Target end-state architecture
4.  Phased delivery plan (P0 → P4)
5.  Domain blueprints — one per PDF chapter
    - 5.1  Role model & identity
    - 5.2  Authentication & session
    - 5.3  Homepage & navigation
    - 5.4  Search & discovery
    - 5.5  Listings & property detail
    - 5.6  Booking engine (pay-later + multi-currency)
    - 5.7  Pre-booking add-ons
    - 5.8  Experiences & events
    - 5.9  AI itinerary planner
    - 5.10 Post-booking dashboard
    - 5.11 Service integrations
    - 5.12 SOS & support
    - 5.13 Rewards & membership
    - 5.14 Investor dashboard
    - 5.15 Admin panel (5-level hierarchy)
    - 5.16 Payment system (multi-party settlement)
    - 5.17 Notifications
    - 5.18 Content & media
6.  Cross-cutting concerns
    - 6.1  Security & compliance
    - 6.2  DevOps & infrastructure
    - 6.3  Observability
    - 6.4  Testing strategy
    - 6.5  Performance & scaling
7.  Data-model evolution plan
8.  API surface map
9.  Skill → ticket mapping
10. Team workflow & process
11. Definition of done
12. Risk register
13. Glossary

---

## 0. How to use this document

- **For planners** — read §1–§4 to understand the scope, phasing and
  dependencies before committing deadlines.
- **For engineers picking up a ticket** — jump straight to the relevant
  domain blueprint in §5. Each blueprint lists its data models, API,
  UI, jobs, events, dependencies, relevant skills, tickets and DoD.
- **For reviewers** — check §11 (Definition of Done) before approving any
  PR; check §6.4 for the required test coverage per ticket type.
- **When the spec changes** — edit this file in the same PR that changes
  behaviour. No divergence between code and blueprint.

Every ticket in the project tracker must carry a `blueprint:§X.Y` tag so
that the traceability from PDF → blueprint → ticket → PR → production
is intact.

---

## 1. Vision & scope alignment

**Mission (from PDF §1):** *Freedom through support — enabling people to
travel independently with confidence, while being supported at every
step.*

**Four stakeholder groups** (PDF §3):
1. **Travellers / Guests** — discover, plan, book, experience, review, earn.
2. **Investors & Property Owners** — two distinct roles with separate
   dashboards, approval chains and payout streams.
3. **Admin & Operational Teams** — 5-level hierarchy (see §5.15).
4. **Employees & Service Teams** — concierge, housekeeping, drivers,
   chefs, wellness coaches, experience hosts.

**Product pillars:**
- Curated inventory with verified quality
- Safety-first guest experience (SOS, verified hosts, insurance)
- AI-assisted planning grounded in real inventory
- Transparent revenue sharing with investors
- Community & rewards loop

**Non-goals for the current build year:**
- International markets beyond India (roadmap P4+)
- Native mobile apps (roadmap P4+)
- Creator marketplace / UGC monetisation (roadmap P4+)
- Multi-currency transactions (roadmap P3+, settlement INR-only until then)

---

## 2. Current state baseline

Snapshot dated **2026-04-11**, captured in `PRODUCTION_AUDIT.md` and
`PDF_EXPLORATION.md`.

**What is built and production-grade:**
- Core booking pipeline — quote → hold → pay → confirm → cancel → refund
- Razorpay integration with HMAC-verified webhooks and idempotent capture
- Append-only `LedgerEvent` with DB trigger enforcing immutability
- Double-booking prevention via PostgreSQL `tsrange &&` exclusion
- Booking state machine with guarded transitions
- HMAC-signed price snapshots frozen at quote time
- Background jobs: hold-expiry (1 min), balance-due (15 min), payout
  eligibility (1 h), weekly payout (Mon 03:30 UTC)
- Meilisearch faceted discovery
- S3/CDN image pipeline with WebP + responsive sizes
- Argon2id password hashing, JWT + Auth0 dual-mode auth
- CI pipeline (GitHub Actions) with Postgres 16 service, tests, Docker build
- Multi-stage Docker image with non-root, dumb-init, HEALTHCHECK
- Nginx TLS edge with rate-limit zones and CSP
- Pino structured logging, correlation IDs, global exception filter

**What is partial:**
- Admin panel — single flat `ADMIN` role with shared views
- Rewards — referrals + `CreditLedger` only, no tiers, no SIP
- Post-booking dashboard — booking list + status only
- Auth — no MFA, no social, no phone OTP, refresh tokens plaintext
- Notifications — in-app + email only
- Content — photos only, no 360°, no video, no editorial

**What is missing (zero code today):**
- Pre-booking add-ons (§5.7)
- Experiences & events (§5.8)
- AI itinerary planner (§5.9)
- Service integrations (§5.11)
- SOS & support (§5.12)
- Investor dashboard (§5.14)
- 5-level admin hierarchy (§5.15)
- Multi-party settlement (§5.16)
- SMS / WhatsApp / push notifications (§5.17)

---

## 3. Target end-state architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Edge (Nginx + Cloudflare)                    │
│              TLS 1.2+, HTTP/2, rate limits, WAF, HSTS, CSP              │
└─────────────────────────────────────────────────────────────────────────┘
          │                           │                         │
          ▼                           ▼                         ▼
┌──────────────────┐      ┌──────────────────────┐    ┌────────────────┐
│ apps/web         │      │ apps/api (NestJS 10) │    │ apps/mobile    │
│ Next.js 15       │      │ 30+ feature modules  │    │ React Native   │
│ ISR + RSC        │      │                      │    │ (P4+)          │
└──────────────────┘      └──────────────────────┘    └────────────────┘
                                     │
         ┌───────────────────────────┼────────────────────────────┐
         ▼                           ▼                            ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
│ PostgreSQL 16    │       │ Redis            │        │ Meilisearch      │
│ PgBouncer pool   │       │ BullMQ + cache   │        │ Facets + rank    │
│ RLS policies     │       │ rate limit       │        │                  │
└──────────────────┘       └──────────────────┘        └──────────────────┘
         │                           │                            │
         ▼                           ▼                            ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
│ pgvector         │       │ Workers          │        │ OpenSearch logs  │
│ (AI planner RAG) │       │ (BullMQ)         │        │ (Loki/Grafana)   │
└──────────────────┘       └──────────────────┘        └──────────────────┘

External partners:
  Razorpay  │ Twilio (SMS) │ WhatsApp Business │ FCM/APNs │ Auth0
  S3 + CDN  │ Maps (OSM)   │ Sentry APM        │ PagerDuty │ OpenAI/Anthropic
```

**Module map — target feature modules under `apps/api/src/`:**

```
auth/            users/            identity/         roles/
listings/        media/            search/           geo/
bookings/        pricing/          cancellations/    payment/
addons/          experiences/      events/           itinerary/
dashboard/       concierge/        sos/              incidents/
integrations/    transport/        food/             wellness/
rewards/         credits/          tiers/            sip/
investors/       distributions/    capital-calls/
admin/           admin-l1/ ... l5/ audit-log/        kyc/
notifications/   sms/ email/ push/ whatsapp/
health/          metrics/          jobs/             cron/
```

**Module map — `apps/web/app/`:**

```
(marketing)/     (auth)/           (guest)/          (host)/
(investor)/      (admin)/          (dashboard)/      (sos)/
(concierge)/     (planner)/        (events)/
```

---

## 4. Phased delivery plan

Each phase is a coherent release unit with its own feature-flag, test
suite and rollout plan. Phases run ~8 weeks each (adjust to team size).

### Phase 0 — Stabilise (1 sprint, ≤2 weeks) — *STARTED*

**Goal:** close the four blocker findings from the production audit and
make the existing MVP safe for internal pilot traffic.

- [x] Fix hardcoded JWT secret fallback
- [x] Harden Razorpay webhook signature verification
- [x] Fix 3× notification formatting bugs (/100)
- [x] Dockerfile: dumb-init + HEALTHCHECK
- [ ] CI: add lint + type-check jobs
- [ ] Refresh-token rotation with family tracking
- [ ] MFA (TOTP) for all `ADMIN` role accounts
- [ ] Sentry wired end-to-end
- [ ] Synthetic uptime check on `/health/ready` + `/api/listings`

**Exit criteria:** `PRODUCTION_AUDIT.md` has zero BLOCKER and ≤2 HIGH
findings. Pilot deploy on staging passes 24 h synthetic run.

### Phase 1 — Identity & Role Refactor (4 weeks)

**Goal:** the role model has to be correct before everything else. Touches
every guard, every query and every admin page.

- Role hierarchy + Investor/Owner split (§5.1)
- Admin L1–L5 refactor (§5.15)
- Session management ("active devices", revoke) (§5.2)
- Consent capture + DPDP preferences (§6.1)
- Audit log for role changes (§5.1)

**Exit criteria:** zero legacy `role === 'ADMIN'` checks in code.

### Phase 2 — Revenue expansion (8 weeks)

**Goal:** add the revenue surfaces that the PDF specifies but the MVP
lacks. Each is independently shippable.

- Pre-booking add-ons (§5.7)
- Experiences & events (§5.8)
- Rewards tiers + Trip Savings SIP (§5.13)
- Pay Later / instalments (§5.6)
- Notifications: SMS + WhatsApp + push (§5.17)

**Exit criteria:** first booking with an add-on lands in production. SIP
deposit flows through the ledger and is reconciled.

### Phase 3 — Trust & experience (8 weeks)

**Goal:** safety, personalisation and operational maturity.

- SOS & support system (§5.12)
- Post-booking concierge chat (§5.10)
- AI itinerary planner MVP — retrieval-only (§5.9)
- Service integrations (transport, F&B, wellness) (§5.11)
- 360° + video media pipeline (§5.18)
- Investor dashboard (§5.14)

**Exit criteria:** one end-to-end journey — search → plan → add-on →
book → pay → arrive → SOS drill → review → reward — executes cleanly on
a shadow environment.

### Phase 4 — Scale & future (ongoing)

From the PDF §23 Future Scope, ordered:
- Native mobile apps (React Native)
- Multi-currency settlement
- Dynamic pricing + ML ranking
- International expansion (SE Asia → Europe → ME)
- Creator marketplace
- Franchise/cluster operational templates

---

## 5. Domain blueprints

Each blueprint uses the same 10-section template:

1. Purpose
2. PDF reference
3. Data models
4. API surface
5. UI surfaces
6. Background jobs / events
7. Dependencies
8. Relevant skills
9. Tickets (T-shirt sized: XS ≤ 1 d, S ≤ 3 d, M ≤ 1 w, L ≤ 2 w, XL > 2 w)
10. Test strategy & DoD

---

### 5.1 Role model & identity

**Purpose.** Replace the 3-value `UserRole` enum with a role hierarchy
that supports Investor, Property Owner, 5 admin levels and service teams
while preserving backward compatibility with existing JWTs.

**PDF reference.** §3 User Types & Access Levels.

**Data models.**

```prisma
enum UserKind {
  GUEST
  OWNER
  INVESTOR
  STAFF           // internal admin / service team
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  kind           UserKind
  // ...existing fields...
  staff          StaffRole?
  ownerProfile   OwnerProfile?
  investorProfile InvestorProfile?
}

model StaffRole {
  userId         String    @id
  user           User      @relation(fields: [userId], references: [id])
  level          AdminLevel          // L1..L5
  clusterId      String?             // for L3
  propertyId     String?             // for L4
  serviceType    ServiceType?        // for L5
  createdAt      DateTime  @default(now())
  revokedAt      DateTime?
  createdBy      String              // promoter's user id
  @@index([level])
}

enum AdminLevel { L1 L2 L3 L4 L5 }
enum ServiceType { TRANSPORT FOOD WELLNESS EXPERIENCE CONCIERGE HOUSEKEEPING }

model OwnerProfile {
  userId     String @id
  user       User   @relation(fields: [userId], references: [id])
  legalName  String
  gstin      String?
  kycStatus  KycStatus
  properties Listing[]
}

model InvestorProfile {
  userId       String @id
  user         User   @relation(fields: [userId], references: [id])
  legalName    String
  panMasked    String
  kycStatus    KycStatus
  investments  Investment[]
}

model RoleChangeAudit {
  id        String   @id @default(cuid())
  targetUserId String
  actorUserId  String
  before    Json
  after     Json
  reason    String
  createdAt DateTime @default(now())
  @@index([targetUserId])
}
```

**API surface.**

```
POST   /api/v1/admin/users/:id/role         // L1 only
GET    /api/v1/admin/users/:id/role-history // L1, L2
POST   /api/v1/owners                       // self-service owner signup
POST   /api/v1/investors                    // invite-only
GET    /api/v1/me/capabilities               // derived from kind + staffRole
```

**UI surfaces.**
- `/admin/users/[id]/role` — L1-only page with change history
- `/onboarding/owner` — KYC + property declaration wizard
- `/onboarding/investor` — invite landing + KYC

**Background jobs / events.**
- `role.changed` event → audit log + email notification to target user
- Nightly cron reconciles orphaned `StaffRole` rows (e.g. revoked users)

**Dependencies.** None (this is the foundation for §5.2, §5.14, §5.15).

**Relevant skills.** `rbac-permission-guards`, `row-level-security-policies`,
`data-privacy-compliance`, `append-only-audit-ledger`.

**Tickets.**
- T1 (M) Prisma migration adding `UserKind`, `StaffRole`, `OwnerProfile`,
  `InvestorProfile`, `RoleChangeAudit` with data-migration script for
  existing `ADMIN` users → `STAFF + L1`.
- T2 (S) `CapabilitiesService` that computes a capability set from a
  user's row and caches it on the JWT payload.
- T3 (S) Rewrite `JwtAuthGuard` + `RolesGuard` to use capabilities
  instead of `UserRole` enum comparison.
- T4 (M) RLS policies for `Listing`, `Booking`, `LedgerEvent`,
  `Investment` scoped by cluster / property / investor.
- T5 (S) Admin user-management page with role-change history table.
- T6 (XS) Backfill `OwnerProfile` from existing `Host` rows.

**Test strategy.**
- Unit: capability derivation for each kind/level combination.
- Integration: RLS — L3 Cluster Admin cannot SELECT a `Booking` outside
  their cluster.
- E2E: promoting a guest to Owner via admin panel triggers audit log
  and email.

**DoD.**
- Zero references to `UserRole.ADMIN` in the codebase.
- `apps/api/src/auth/*` uses `CapabilitiesService`.
- Pen-test shows no IDOR on `/api/v1/admin/*`.

---

### 5.2 Authentication & session

**Purpose.** Add MFA, social, phone OTP, device management and
family-tracked refresh rotation.

**PDF reference.** §4 Authentication System, §21 Security.

**Data models.**

```prisma
model RefreshTokenFamily {
  id         String   @id @default(cuid())
  userId     String
  createdAt  DateTime @default(now())
  revokedAt  DateTime?
  revokeReason String?
}

model RefreshToken {
  id         String   @id @default(cuid())
  familyId   String
  family     RefreshTokenFamily @relation(fields: [familyId], references: [id])
  tokenHash  String   // SHA-256 of raw token
  issuedAt   DateTime @default(now())
  expiresAt  DateTime
  rotatedTo  String?
  usedAt     DateTime?
  ipAddress  String?
  userAgent  String?
  @@index([familyId])
  @@unique([tokenHash])
}

model MfaFactor {
  id         String   @id @default(cuid())
  userId     String
  type       MfaType
  secret     String   // encrypted with KMS-backed key
  confirmed  Boolean  @default(false)
  createdAt  DateTime @default(now())
}
enum MfaType { TOTP SMS EMAIL WEBAUTHN }

model Session {
  id         String   @id @default(cuid())
  userId     String
  familyId   String
  device     String
  ipAddress  String
  lastSeen   DateTime @default(now())
  revokedAt  DateTime?
}
```

**API surface.**

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/mfa/setup          // returns QR for TOTP
POST   /api/v1/auth/mfa/verify
POST   /api/v1/auth/mfa/challenge      // during login
POST   /api/v1/auth/phone/send-otp
POST   /api/v1/auth/phone/verify-otp
POST   /api/v1/auth/social/:provider
POST   /api/v1/auth/refresh            // rotates token family
POST   /api/v1/auth/logout             // revokes family
GET    /api/v1/me/sessions
DELETE /api/v1/me/sessions/:id
```

**Background jobs.**
- `session.reaper` — nightly cleanup of expired refresh tokens older than
  30 days.
- `mfa.enforce` — on first login of any `STAFF` user, force MFA setup.

**Relevant skills.** `jwt-refresh-token-rotation`, `password-hashing-argon2`,
`rate-limiting-brute-force`, `secrets-management`,
`encrypted-secret-delivery` (for MFA secret storage).

**Tickets.**
- T7 (L) Refresh token rotation with family tracking + theft detection.
- T8 (M) TOTP MFA, enforced for `STAFF` kind.
- T9 (S) Phone OTP via Twilio (or MSG91 for India).
- T10 (S) Social login via Auth0 federation (Google, Apple).
- T11 (M) Active-sessions page with revoke button.
- T12 (S) WebAuthn/passkey stub behind feature flag (P3).

**DoD.** STAFF user cannot access the admin panel without TOTP. Stealing
a refresh token from DB does not allow login if the family has been
rotated since. Active-sessions page shows every device.

---

### 5.3 Homepage & navigation

**Purpose.** Personalised landing with intent-based carousels and
conversion entry points.

**PDF reference.** §5 Homepage & Navigation.

**Data models.** No new tables; use existing `Listing`, `Experience`,
`UserPreference`.

**API surface.**

```
GET /api/v1/home/personalised          // auth-optional
GET /api/v1/home/carousels/:intent     // wellness/heritage/nature/family
GET /api/v1/home/resume                // "continue planning"
```

**UI surfaces.**
- `/` — hero search, intent carousels, trending, SIP promo, Pay Later
- `/intents/[slug]` — intent landing page

**Relevant skills.** `nextjs-production-optimization`,
`response-caching-redis`.

**Tickets.**
- T13 (M) Personalised home API (rule-based ranking over viewing
  history + wishlist + geo).
- T14 (S) ISR-backed intent landing pages.
- T15 (S) "Resume planning" card using session state from Redis.

---

### 5.4 Search & discovery

**Purpose.** Extend existing Meilisearch setup with saved searches, price
alerts and "similar stays".

**PDF reference.** §6 Stay Discovery & Search.

**Data models.**

```prisma
model SavedSearch {
  id        String @id @default(cuid())
  userId    String
  query     Json
  alertOn   Boolean @default(false)
  createdAt DateTime @default(now())
}
model SearchAlertState {
  savedSearchId String @id
  lastRunAt     DateTime
  lastDigest    Json
}
```

**Background jobs.**
- `search.alerts.runner` — hourly, diffs current results against
  `lastDigest`; emits `search.alert.triggered` on price drop or new match.

**Relevant skills.** `meilisearch-faceted-search`, `response-caching-redis`.

**Tickets.**
- T16 (S) Saved searches CRUD.
- T17 (S) Price-alert cron + email/push notification.
- T18 (M) "Similar stays" endpoint using Meilisearch `similar_to`.

---

### 5.5 Listings & property detail

**Purpose.** Extend listing detail with 360° viewer, video walkthrough,
stay stories and nearby attractions.

**PDF reference.** §7 Property Listing & Details.

**Data models.**

```prisma
model ListingMedia {
  id         String   @id @default(cuid())
  listingId  String
  kind       MediaKind   // PHOTO VIDEO TOUR_360 DRONE
  url        String
  hdrUrl     String?
  durationMs Int?
  hotspots   Json?       // for TOUR_360 navigation links
  sortOrder  Int
  @@index([listingId])
}
enum MediaKind { PHOTO VIDEO TOUR_360 DRONE }

model StayStory {
  id         String   @id @default(cuid())
  listingId  String
  title      String
  bodyMd     String
  heroMedia  String
  publishedAt DateTime?
  author     String
}

model NearbyAttraction {
  id         String @id @default(cuid())
  listingId  String
  name       String
  kind       String
  lat        Float
  lng        Float
  distanceM  Int
}
```

**API surface.**

```
GET /api/v1/listings/:id/media
GET /api/v1/listings/:id/stories
GET /api/v1/listings/:id/attractions
```

**Relevant skills.** `cdn-image-optimization`.

**Tickets.**
- T19 (M) `ListingMedia` migration + upload pipeline for 360°/video.
- T20 (S) Frontend 360° viewer (react-photo-sphere-viewer).
- T21 (S) StayStory CMS surface for editors.
- T22 (XS) Nearby attractions scraper from OSM Overpass API.

---

### 5.6 Booking engine — Pay Later & multi-currency

**Purpose.** Extend the existing booking engine (which is the repo's
strength) with Pay Later instalments and, in P3+, multi-currency.

**PDF reference.** §8 Booking Engine, §18.11 (Pay Later).

**State-machine additions.**

```
… existing states …
+ PAY_LATER_SCHEDULED   — booking confirmed, instalments pending
+ PAY_LATER_OVERDUE     — any instalment missed
+ PAY_LATER_DEFAULTED   — grace exceeded, auto-cancel
```

**Data models.**

```prisma
model PayLaterPlan {
  id          String   @id @default(cuid())
  bookingId   String   @unique
  instalments PayLaterInstalment[]
  currency    String   @default("INR")
  createdAt   DateTime @default(now())
}
model PayLaterInstalment {
  id          String   @id @default(cuid())
  planId      String
  plan        PayLaterPlan @relation(fields: [planId], references: [id])
  seq         Int
  amountMinor Int      // rupees (following house rule)
  dueAt       DateTime
  paidAt      DateTime?
  paymentId   String?
  @@unique([planId, seq])
}
```

**API surface.**

```
POST /api/v1/bookings/:id/pay-later     // creates a plan
GET  /api/v1/bookings/:id/pay-later     // returns instalment schedule
POST /api/v1/bookings/:id/pay-later/:seq/pay
```

**Background jobs.**
- `payLater.reminder` — 72 h / 24 h before each instalment.
- `payLater.overdueCheck` — hourly, marks `OVERDUE` then `DEFAULTED`.

**Relevant skills.** `entity-state-machine`, `payment-idempotency`,
`price-snapshot-integrity`, `atomic-database-transactions`,
`cancellation-refund-engine`.

**Tickets.**
- T23 (L) PayLater data model + state machine transitions.
- T24 (M) PayLater schedule calculator (3/6/12 months).
- T25 (M) Dunning flow: reminder → overdue → default → cancel.
- T26 (S) Guest UI for Pay Later selection and instalment tracking.

**DoD.** A defaulted Pay Later booking refunds fairly per the
cancellation engine, the ledger balances, and the next guest search
immediately sees the freed-up dates.

---

### 5.7 Pre-booking add-ons

**Purpose.** Let guests attach services (airport pickup, chef, workshop,
equipment, insurance) to a booking. Each add-on has its own provider and
settlement stream.

**PDF reference.** §9 Pre-Booking Add-ons.

**Data models.**

```prisma
model ServiceProvider {
  id          String @id @default(cuid())
  name        String
  kind        ServiceType
  ownerUserId String             // links to User.id
  payoutMethod Json
  active      Boolean @default(true)
}

model AddOn {
  id             String @id @default(cuid())
  providerId     String
  provider       ServiceProvider @relation(fields: [providerId], references: [id])
  title          String
  description    String
  priceMinor     Int
  currency       String @default("INR")
  availability   Json              // rules
  cancellationTier CancellationTier
  minLeadHours   Int
  maxPerBooking  Int @default(1)
  active         Boolean @default(true)
  listingScope   AddOnScope        // GLOBAL | CLUSTER | LISTING
  clusterId      String?
  listingId      String?
}
enum CancellationTier { FLEXIBLE MODERATE STRICT NON_REFUNDABLE }
enum AddOnScope { GLOBAL CLUSTER LISTING }

model BookingAddOn {
  id          String @id @default(cuid())
  bookingId   String
  addOnId     String
  quantity    Int
  priceMinor  Int               // snapshot
  commission  Int               // platform cut, snapshot
  state       AddOnState
  snapshotHmac String            // signed at quote time
  @@index([bookingId])
}
enum AddOnState { QUOTED HELD CONFIRMED DELIVERED CANCELLED REFUNDED }
```

**API surface.**

```
GET  /api/v1/listings/:id/addons
POST /api/v1/bookings/:id/addons             // attach at quote time
DELETE /api/v1/bookings/:id/addons/:addOnId
POST /api/v1/admin/addons                    // provider or admin creates
GET  /api/v1/providers/me/addons             // provider dashboard
```

**Background jobs / events.**
- `booking.confirmed` → trigger `addon.allocate` for each `BookingAddOn`
- `booking.cancelled` → compute add-on refund per its tier
- Ledger entries: `addon.charge`, `addon.commission`, `addon.payout`

**Dependencies.** §5.1 (ServiceProvider owner role), §5.6 (price snapshot),
§5.16 (multi-party settlement).

**Relevant skills.** `price-snapshot-integrity`, `payment-idempotency`,
`cancellation-refund-engine`, `append-only-audit-ledger`,
`entity-state-machine`, `unit-testing-business-logic`.

**Tickets.**
- T27 (L) Schema + migration + provider onboarding flow.
- T28 (M) Quote-time add-on selection + HMAC snapshot extension.
- T29 (M) Provider dashboard (listing view, schedule, payouts).
- T30 (M) Add-on cancellation & refund logic.
- T31 (S) Admin approval queue for new add-ons.
- T32 (M) Unit + integration tests for double-counting edge cases.

**Test strategy.**
- Concurrency: two guests racing to buy the last slot of a capped add-on.
- Money: total of add-on snapshots must equal booking total minus
  accommodation subtotal, to the rupee.
- State: cancelling a booking cascades to `BookingAddOn.state` correctly.

---

### 5.8 Experiences & events

**Purpose.** Second bookable entity type: retreats, workshops, festivals,
wellness camps. Distinct from stays — has capacity, ticket tiers,
waitlists.

**PDF reference.** §10 Experience & Event Module.

**Data models.**

```prisma
model Experience {
  id          String @id @default(cuid())
  organiserUserId String
  title       String
  description String
  startsAt    DateTime
  endsAt      DateTime
  venueId     String?           // can reuse Listing as venue
  capacity    Int
  status      ExperienceStatus
  tiers       TicketTier[]
}
enum ExperienceStatus { DRAFT PUBLISHED SOLD_OUT CANCELLED COMPLETED }

model TicketTier {
  id            String @id @default(cuid())
  experienceId  String
  name          String
  priceMinor    Int
  capacity      Int
  sold          Int @default(0)
  waitlistCount Int @default(0)
}

model Ticket {
  id          String @id @default(cuid())
  tierId      String
  userId      String
  bookingId   String?             // links to parent booking if bundled
  state       TicketState
  qrHash      String @unique
  issuedAt    DateTime @default(now())
}
enum TicketState { HELD CONFIRMED USED REFUNDED CANCELLED }

model Waitlist {
  id           String @id @default(cuid())
  tierId       String
  userId       String
  position     Int
  notifiedAt   DateTime?
}
```

**API surface.**

```
GET    /api/v1/experiences
POST   /api/v1/experiences                // organiser creates
GET    /api/v1/experiences/:id
POST   /api/v1/experiences/:id/tickets    // buy
POST   /api/v1/experiences/:id/waitlist
POST   /api/v1/admin/experiences/:id/approve
```

**State rules.** Uses `atomic-database-transactions` with
`SELECT ... FOR UPDATE` on `TicketTier` to guard capacity.

**Relevant skills.** `atomic-database-transactions`, `entity-state-machine`,
`no-overlap-database-constraints` (for venue reuse),
`concurrency-race-condition-tests`.

**Tickets.**
- T33 (L) Experience + tier + ticket schema.
- T34 (M) Capacity-guarded purchase endpoint with FOR UPDATE.
- T35 (S) Waitlist promotion on refund.
- T36 (M) QR check-in scanner (admin page).
- T37 (M) Organiser dashboard.

---

### 5.9 AI itinerary planner

**Purpose.** LLM-assisted day-by-day planner grounded against real
inventory. Ship retrieval-only MVP in P3, add LLM generation in P3.5.

**PDF reference.** §11 AI Itinerary Planner.

**Data models.**

```prisma
model Itinerary {
  id            String @id @default(cuid())
  userId        String
  prompt        Json          // structured intake
  days          Json          // structured day plan
  groundingIds  String[]      // listing/addon/event IDs referenced
  status        ItineraryStatus
  feedback      Json?
  createdAt     DateTime @default(now())
}
enum ItineraryStatus { DRAFT READY BOOKED ARCHIVED }

model ItineraryEmbedding {
  listingId String @id
  embedding Unsupported("vector(1536)")   // pgvector
  updatedAt DateTime @default(now())
}
```

**API surface.**

```
POST /api/v1/itineraries          // structured prompt in
GET  /api/v1/itineraries/:id
POST /api/v1/itineraries/:id/feedback
POST /api/v1/itineraries/:id/bundle-book   // creates a multi-item booking
```

**Relevant skills.** `rag-grounded-ai-generation`, `response-caching-redis`,
`query-optimization-indexing`, `secrets-management` (for LLM keys).

**Tickets.**
- T38 (M) Install pgvector + embeddings backfill job.
- T39 (M) Retrieval service: filter by intent, rank by similarity.
- T40 (L) LLM step: hardened prompt, no entity invention, grounding
  validator rejects any ID not in `groundingIds`.
- T41 (M) Bundle-booking endpoint that atomically creates bookings for
  every item in the itinerary.
- T42 (S) Feedback loop storing thumbs up/down.

**DoD.** 0% hallucinated IDs in validator test suite. Bundle booking is
atomic — either all items confirm or none do.

---

### 5.10 Post-booking dashboard

**Purpose.** Guest's one-stop view of upcoming, in-progress and past
stays with concierge chat, checklist, expense tracker and photo album.

**PDF reference.** §12 Post-Booking Dashboard.

**Data models.**

```prisma
model BookingChecklist {
  bookingId   String @id
  items       Json              // {id, label, required, completedAt}
}

model ConciergeThread {
  id          String @id @default(cuid())
  bookingId   String
  assignedTo  String?           // staff user id
  status      ThreadStatus
  createdAt   DateTime @default(now())
}
enum ThreadStatus { OPEN PENDING RESOLVED }

model ConciergeMessage {
  id          String @id @default(cuid())
  threadId    String
  fromUserId  String
  body        String
  attachments Json?
  createdAt   DateTime @default(now())
}
```

**API surface.**

```
GET  /api/v1/me/dashboard
GET  /api/v1/bookings/:id/checklist
POST /api/v1/bookings/:id/checklist/:item/complete
GET  /api/v1/bookings/:id/concierge
POST /api/v1/bookings/:id/concierge/messages
```

**Relevant skills.** `real-time-websocket-messaging`,
`structured-logging-pino`.

**Tickets.**
- T43 (M) Concierge WS channel scoped to booking participants.
- T44 (S) Checklist template engine per property type.
- T45 (M) Photo album auto-built from post-stay WebP uploads.
- T46 (S) Digital receipt PDF generator.

---

### 5.11 Service integrations

**Purpose.** Wire transport, food, wellness partner APIs. Each
integration is a separate adapter living under `integrations/`.

**PDF reference.** §13 Service Integrations.

**Integration pattern.**

```
providers/
  ola/            uber/           rapido/
  swiggy/         zomato/
  wellness-api/
```

Each provider implements a common contract:

```ts
interface ServiceProviderAdapter {
  listInventory(ctx: Ctx): Promise<InventoryItem[]>;
  hold(item: Id, window: Range): Promise<HoldRef>;
  confirm(hold: HoldRef): Promise<ConfirmationRef>;
  cancel(ref: ConfirmationRef, reason: string): Promise<RefundEstimate>;
  webhookSignature(raw: Buffer, header: string): boolean;
}
```

**Relevant skills.** `webhook-signature-verification`,
`secrets-management`, `api-versioning-strategy`,
`response-caching-redis`, `rate-limiting-brute-force`.

**Tickets.**
- T47 (M) Provider contract + adapter scaffold.
- T48 (L) Ola/Uber adapter (pickup).
- T49 (M) Swiggy adapter (meal).
- T50 (S) Wellness adapter stub.
- T51 (M) Commission ledger entries per provider.

---

### 5.12 SOS & support

**Purpose.** One-tap panic button that pages ops and optionally the
guest's trusted contacts with GPS + booking context.

**PDF reference.** §14 SOS & Support System.

**Data models.**

```prisma
model SosIncident {
  id          String @id @default(cuid())
  userId      String
  bookingId   String?
  tier        SosTier
  lat         Float
  lng         Float
  message     String?
  status      SosStatus
  openedAt    DateTime @default(now())
  resolvedAt  DateTime?
  resolvedBy  String?
}
enum SosTier { MEDICAL SECURITY TRANSPORT OTHER }
enum SosStatus { OPEN ACKNOWLEDGED IN_PROGRESS RESOLVED FALSE_ALARM }

model TrustedContact {
  id        String @id @default(cuid())
  userId    String
  name      String
  phone     String
  relation  String
  primary   Boolean @default(false)
}

model SosBroadcast {
  id         String @id @default(cuid())
  incidentId String
  channel    String        // sms, whatsapp, call, push
  to         String
  status     String
  sentAt     DateTime @default(now())
}
```

**API surface.**

```
POST /api/v1/sos                          // creates incident
POST /api/v1/sos/:id/ack                  // ops acknowledges
POST /api/v1/sos/:id/resolve
GET  /api/v1/admin/sos                    // ops console stream
POST /api/v1/me/trusted-contacts
```

**Background jobs.** `sos.broadcast` runs immediately on incident creation
(not cron) — this is a latency-critical path. Use a dedicated BullMQ
queue with high priority.

**Dependencies.** §5.1 (STAFF L1/L2 for ops), §5.17 (SMS/WhatsApp/Push).

**Relevant skills.** `business-critical-alerting`,
`real-time-websocket-messaging`, `rate-limiting-brute-force`
(tight rate limit on SOS endpoint to guard against spam while still
allowing legitimate double-tap).

**Tickets.**
- T52 (L) Incident model + ops console with live stream.
- T53 (M) Multi-channel broadcast adapter.
- T54 (S) Trusted contact CRUD + invite link.
- T55 (S) Emergency number directory by geo.
- T56 (M) PagerDuty escalation integration.

**Test strategy.** Chaos test: simulate 100 concurrent SOS creations —
every one must reach at least one ops-on-duty channel within 5 s.

---

### 5.13 Rewards & membership

**Purpose.** Promote the existing `CreditLedger` into a full tiered
membership with Trip Savings SIP.

**PDF reference.** §15 Rewards & Membership.

**Data models.**

```prisma
enum MemberTier { EXPLORER WANDERER SOJOURNER PATRON AMBASSADOR }

model Membership {
  userId      String @id
  tier        MemberTier
  points      Int
  tierSince   DateTime
  nextTierAt  Int           // points threshold
}

model TripSip {
  id          String @id @default(cuid())
  userId      String
  monthlyMinor Int
  startedAt   DateTime @default(now())
  status      SipStatus
}
enum SipStatus { ACTIVE PAUSED CLOSED }

model SipContribution {
  id          String @id @default(cuid())
  sipId       String
  amountMinor Int
  depositedAt DateTime @default(now())
  ledgerEventId String
}

model Perk {
  id          String @id @default(cuid())
  tier        MemberTier
  title       String
  description String
  active      Boolean @default(true)
}
```

**API surface.**

```
GET  /api/v1/me/membership
POST /api/v1/me/sip
POST /api/v1/me/sip/contributions
GET  /api/v1/me/perks
```

**Background jobs.**
- `sip.autodebit` — monthly on the user's anchor day.
- `membership.promote` — nightly, recalculates tiers from 12-month
  rolling activity.
- `membership.anniversary` — daily, sends a gift credit on signup
  anniversary.

**Relevant skills.** `append-only-audit-ledger`, `payment-idempotency`,
`cancellation-refund-engine` (for SIP refunds on close).

**Tickets.**
- T57 (M) Tier promotion engine.
- T58 (L) SIP wallet on top of `CreditLedger`.
- T59 (S) Anniversary gift cron.
- T60 (S) Perks catalogue + eligibility guard.

---

### 5.14 Investor dashboard

**Purpose.** Read-oriented surface for Investors. Shows portfolio, ROI,
capital calls, distribution statements and document vault.

**PDF reference.** §16 Investor Dashboard.

**Data models.**

```prisma
model Investment {
  id            String @id @default(cuid())
  investorUserId String
  listingId     String
  sharePct      Decimal        // 0..1
  effectiveAt   DateTime
  endedAt       DateTime?
  @@index([investorUserId])
  @@index([listingId])
}

model Distribution {
  id            String @id @default(cuid())
  investorUserId String
  period        String          // YYYY-MM
  amountMinor   Int
  currency      String @default("INR")
  status        DistributionStatus
  ledgerEventId String
}
enum DistributionStatus { CALCULATED PAID FAILED }

model CapitalCall {
  id            String @id @default(cuid())
  listingId     String
  amountMinor   Int
  reason        String
  dueAt         DateTime
  status        CapitalCallStatus
}
enum CapitalCallStatus { OPEN FUNDED CLOSED CANCELLED }

model InvestorDocument {
  id            String @id @default(cuid())
  investorUserId String
  kind          String          // agreement, kyc, tax_form, statement
  url           String
  uploadedAt    DateTime @default(now())
}
```

**API surface.**

```
GET /api/v1/investor/portfolio
GET /api/v1/investor/distributions
GET /api/v1/investor/capital-calls
GET /api/v1/investor/documents
```

**Dependencies.** §5.1 (Investor kind), §5.16 (multi-party settlement to
create `Distribution` rows).

**Relevant skills.** `financial-record-retention`,
`append-only-audit-ledger`, `row-level-security-policies`,
`data-privacy-compliance`.

**Tickets.**
- T61 (L) Schema + RLS policies (investor can only see their own).
- T62 (M) Distribution calculator cron (monthly close job).
- T63 (S) Investor document vault with pre-signed S3.
- T64 (M) Frontend portfolio page with ROI charts.

---

### 5.15 Admin panel — 5-level hierarchy

**Purpose.** Role-scoped admin surfaces per the 5-level hierarchy.

**PDF reference.** §17 Admin Panel.

**Level responsibilities.**

| Level | Role | Main responsibilities |
|---|---|---|
| L1 | Super Admin | users, roles, platform flags, feature toggles |
| L2 | Operational Admin | finance reconciliation, disputes, KYC review |
| L3 | Cluster / Regional Admin | property approvals, pricing policy, regional KPIs |
| L4 | Property-Level Admin | calendar, pricing overrides, local ops |
| L5 | Service-Level Admin | service-provider menus, schedules, SKU CRUD |

**UI surfaces (apps/web/app/admin/).**

```
/admin/                    → redirects to highest-available view
/admin/l1/users            → L1 only
/admin/l1/feature-flags    → L1 only
/admin/l2/finance          → L2+ (lower L cannot see)
/admin/l2/disputes         → L2+
/admin/l2/kyc              → L2+
/admin/l3/[clusterId]/*    → L3 scoped to own cluster + L1/L2
/admin/l4/[propertyId]/*   → L4 scoped to own property + L1/L2/L3
/admin/l5/[serviceId]/*    → L5 scoped to own service
```

**Guards.** `@AdminLevel(L1)` decorator checks the `StaffRole.level` on
the JWT-derived capability set. Resource endpoints further check
`clusterId` / `propertyId` / `serviceType` matches.

**Relevant skills.** `rbac-permission-guards`,
`row-level-security-policies`, `input-validation-sanitization`.

**Tickets.**
- T65 (XL) Admin panel refactor to level-scoped routes.
- T66 (M) Per-level permission matrix + test suite.
- T67 (M) Audit-log viewer for admin actions (append-only ledger).

**DoD.** A red-team pen-test shows L4 admin cannot see any data outside
their property, even via direct API calls with a tampered URL.

---

### 5.16 Payment system — multi-party settlement

**Purpose.** Current code settles a single host payout weekly. The
target is a ledger that splits every transaction into platform fee,
owner payout, investor distributions and service-provider commissions.

**PDF reference.** §18 Payment System.

**Ledger shape.** Reuse existing `LedgerEvent` with richer `party` enum.

```prisma
enum LedgerParty {
  PLATFORM
  OWNER
  INVESTOR
  SERVICE_PROVIDER
  GUEST
  TAX_AUTHORITY
}
```

Each booking confirmation writes **N rows** (one per party share). The
sum must equal the booking total, enforced by a CHECK constraint and an
integration test.

**Settlement.**
- Weekly payout job groups rows by `party` + `payeeId`, settles via
  Razorpay Route (RazorpayX).
- Investor distributions fire monthly at close, not weekly.
- GST-on-platform-fee writes its own `TAX_AUTHORITY` row.

**Relevant skills.** `append-only-audit-ledger`, `payment-idempotency`,
`webhook-signature-verification`, `pci-compliance-patterns`,
`gst-tax-compliance`, `financial-record-retention`.

**Tickets.**
- T68 (L) LedgerEvent `party` + split-row writer.
- T69 (L) Razorpay Route integration.
- T70 (M) Monthly investor distribution cron.
- T71 (M) Reconciliation report (sum of splits == bookings total).
- T72 (S) CHECK constraint and test suite.

---

### 5.17 Notifications

**Purpose.** Multi-channel notifications with preference centre.

**PDF reference.** §19 Notifications.

**Data models.**

```prisma
model NotificationPreference {
  userId     String @id
  channels   Json   // {sms: true, whatsapp: true, push: true, email: true}
  quietHours Json?
  updatedAt  DateTime @default(now())
}

model NotificationOutbox {
  id        String @id @default(cuid())
  userId    String
  kind      String          // booking.confirmed, sos.ack, sip.debit, ...
  channel   String
  payload   Json
  status    OutboxStatus
  attempts  Int @default(0)
  lastError String?
  @@index([status, attempts])
}
enum OutboxStatus { PENDING SENT FAILED SKIPPED }
```

**Providers.**
- Email: existing transactional.
- SMS: Twilio (global) + MSG91 (India DLT-compliant).
- WhatsApp: WhatsApp Cloud API with template approval list.
- Push: FCM + APNs for mobile, Web Push for browser.

**Relevant skills.** `job-queue-architecture`, `business-critical-alerting`,
`structured-logging-pino`, `rate-limiting-brute-force`.

**Tickets.**
- T73 (M) Outbox table + worker pattern.
- T74 (S) MSG91 adapter with DLT templates.
- T75 (M) WhatsApp Cloud API adapter with template registry.
- T76 (S) FCM/APNs adapter.
- T77 (S) Preference centre UI.

---

### 5.18 Content & media

**Purpose.** 360° viewer, video walkthroughs, editorial stay stories,
drone footage, moderation workflow.

**PDF reference.** §20 Content & Media Management.

See data models under §5.5. Extras:

```prisma
model MediaModeration {
  mediaId  String @id
  status   ModerationStatus
  reviewer String?
  reason   String?
  reviewedAt DateTime?
}
enum ModerationStatus { PENDING APPROVED REJECTED }
```

**Tickets.**
- T78 (M) Video pipeline (HLS via MediaConvert or CloudFlare Stream).
- T79 (S) Moderation queue admin page.
- T80 (S) Content editor with Markdown + image blocks for stay stories.

---

## 6. Cross-cutting concerns

### 6.1 Security & compliance

**PDF reference.** §21 Security & Data Protection.

- **Transport.** TLS 1.2+, HSTS, CSP (Razorpay-scoped), HTTP/2 — *done*.
- **Identity.** Argon2id, MFA/TOTP for STAFF, refresh family rotation,
  Auth0 federation.
- **Authorisation.** Capability guards + RLS at the DB.
- **Audit.** `RoleChangeAudit`, `LedgerEvent`, `MediaModeration`,
  `SosIncident` — all append-only.
- **Secrets.** Nothing hardcoded, Joi env validation, Vault/AWS Secrets
  Manager integration, annual rotation runbook.
- **DPDP / GDPR.** Consent capture at signup, right-to-erasure flow that
  anonymises PII while keeping financial ledger rows (for retention).
  Tax rows held 7 years per Indian rules.
- **Pen-test.** Quarterly internal + annual external.

**Skills.** `secrets-management`, `data-privacy-compliance`,
`rbac-permission-guards`, `row-level-security-policies`,
`rate-limiting-brute-force`, `security-penetration-testing`,
`financial-record-retention`, `append-only-audit-ledger`,
`webhook-signature-verification`, `password-hashing-argon2`,
`input-validation-sanitization`, `structured-error-handling`.

### 6.2 DevOps & infrastructure

- **Containers.** Multi-stage Docker, non-root, dumb-init,
  HEALTHCHECK — *done*.
- **Orchestration.** Kubernetes (EKS or GKE) with HPA driven by CPU +
  BullMQ queue depth.
- **DB.** PostgreSQL 16 on RDS with PgBouncer transaction-mode pool.
- **IaC.** Terraform modules per environment (dev/stg/prod).
- **CI/CD.** GitHub Actions: lint → typecheck → unit → integration →
  build → scan → push → deploy.
- **Deploy.** Zero-downtime rolling update, health gates, auto-rollback.
- **Config.** Environment variables only, Joi-validated at boot.
- **Backups.** Nightly full + continuous WAL, monthly restore drill.

**Skills.** `multi-stage-docker-builds`, `ci-pipeline-github-actions`,
`zero-downtime-deployment`, `infrastructure-as-code-terraform`,
`connection-pooling-pgbouncer`, `nginx-tls-reverse-proxy`,
`health-checks-readiness-probes`, `secrets-management`.

### 6.3 Observability

- **Metrics.** Prometheus scrape on each NestJS pod + BullMQ worker.
- **Logs.** Pino JSON → Loki or OpenSearch with correlation IDs.
- **Tracing.** OpenTelemetry → Sentry APM (or Datadog).
- **Alerts.** PagerDuty for SEV1 (prod outage, payment failure spike,
  SOS broadcast failure), Slack for SEV2/3.
- **Synthetic.** External probes on `/health/ready`, search, booking quote,
  Razorpay sandbox checkout, SOS ack.
- **SLO.** 99.9% API availability; P95 booking-quote < 400 ms; P95 search
  < 300 ms; SOS broadcast P99 < 5 s.

**Skills.** `apm-distributed-tracing`, `log-aggregation-search`,
`uptime-synthetic-monitoring`, `business-critical-alerting`,
`structured-logging-pino`.

### 6.4 Testing strategy

| Layer | Tool | Target coverage | Gate |
|---|---|---|---|
| Unit | Jest | 90% on money/state paths | CI fails < 85% |
| Integration | Supertest + testcontainers | all critical APIs | CI fails any red |
| Concurrency | Jest + pg pool | 0 double-bookings under 100× | CI fails any red |
| E2E | Playwright | 8 critical user journeys | nightly |
| Load | k6 | booking quote 200 rps | pre-release |
| Security | OWASP ZAP | top 10 clean | weekly |

**Critical user journeys for E2E.**
1. Guest search → quote → pay → confirm → receipt
2. Guest cancel within 48 h refund
3. Guest pay-later default → auto-cancel
4. Host onboarding → listing approval → go-live
5. Investor view distribution → download statement
6. L3 admin approve property → listing searchable
7. SOS tap → ops ack → resolve
8. AI planner → bundle book

**Skills.** `unit-testing-business-logic`, `integration-testing-database`,
`concurrency-race-condition-tests`, `e2e-playwright-tests`,
`load-testing-k6`, `security-penetration-testing`.

### 6.5 Performance & scaling

- **Query optimisation.** EXPLAIN-driven indexes, pg_stat_statements
  review monthly.
- **Caching.** Redis cache-aside for home, listing detail, membership
  tier, with ETag.
- **Search.** Meilisearch with warm index post-deploy.
- **N+1 guard.** Prisma `include` linting rule.
- **Bundle size.** Next.js analyser in CI, fail on > 10% regression.

**Skills.** `query-optimization-indexing`, `response-caching-redis`,
`nextjs-production-optimization`, `connection-pooling-pgbouncer`.

---

## 7. Data-model evolution plan

Migration ordering to keep zero-downtime:

1. **0009_identity_kind** — add `UserKind` enum, default `GUEST`.
   Backfill: `ADMIN` → `STAFF + L1`, `HOST` → `OWNER`.
2. **0010_staff_roles** — `StaffRole`, `RoleChangeAudit`.
3. **0011_owner_investor_profiles** — `OwnerProfile`, `InvestorProfile`.
4. **0012_session_family** — `RefreshTokenFamily`, `RefreshToken`, `Session`.
5. **0013_mfa** — `MfaFactor`.
6. **0014_addons** — `ServiceProvider`, `AddOn`, `BookingAddOn`.
7. **0015_experiences** — `Experience`, `TicketTier`, `Ticket`, `Waitlist`.
8. **0016_sos** — `SosIncident`, `TrustedContact`, `SosBroadcast`.
9. **0017_rewards_tiers_sip** — `Membership`, `TripSip`, `SipContribution`,
   `Perk`.
10. **0018_investor** — `Investment`, `Distribution`, `CapitalCall`,
    `InvestorDocument`.
11. **0019_pay_later** — `PayLaterPlan`, `PayLaterInstalment`.
12. **0020_notifications_outbox** — `NotificationPreference`,
    `NotificationOutbox`.
13. **0021_media_extensions** — `ListingMedia` kind enum, `StayStory`,
    `NearbyAttraction`, `MediaModeration`.
14. **0022_itinerary_pgvector** — pgvector extension, `Itinerary`,
    `ItineraryEmbedding`.
15. **0023_ledger_party** — `LedgerEvent.party` enum, CHECK constraint.

Each migration follows the **expand → migrate → contract** pattern so
running pods survive the rollout.

---

## 8. API surface map

Final target: **~230 endpoints** (from today's ~90), grouped under
`/api/v1/`. Versioned per the `api-versioning-strategy` skill — `v2` only
when a breaking change is unavoidable, always with a 6-month deprecation
header on `v1`.

Top-level groupings:

```
auth/      users/     me/        roles/       admin/
listings/  search/    home/      media/       stories/
bookings/  quotes/    addons/    pay-later/
experiences/  tickets/
itineraries/  planner/
concierge/    sos/       notifications/
rewards/      sip/       perks/
investor/     distributions/  capital-calls/
payments/     ledger/    webhooks/
integrations/ providers/
health/       metrics/   admin/l1/  l2/  l3/  l4/  l5/
```

All endpoints are documented automatically via the `openapi-documentation`
skill. Swagger UI mounted at `/docs` and protected by `STAFF` kind.

---

## 9. Skill → ticket mapping

| Skill | Primary tickets |
|---|---|
| `rbac-permission-guards` | T3, T65, T66 |
| `row-level-security-policies` | T4, T61 |
| `jwt-refresh-token-rotation` | T7 |
| `password-hashing-argon2` | existing |
| `rate-limiting-brute-force` | §6.1 |
| `secrets-management` | §6.1 |
| `data-privacy-compliance` | T1, §6.1 |
| `entity-state-machine` | T23, T33 |
| `atomic-database-transactions` | T34, T41 |
| `no-overlap-database-constraints` | existing §5.6 |
| `price-snapshot-integrity` | T28 |
| `payment-idempotency` | existing, T68 |
| `cancellation-refund-engine` | T30, T58 |
| `append-only-audit-ledger` | T67, T68 |
| `webhook-signature-verification` | T47, T69 |
| `pci-compliance-patterns` | T68 |
| `gst-tax-compliance` | T68 |
| `financial-record-retention` | T61, §6.1 |
| `job-queue-architecture` | T25, T73 |
| `business-critical-alerting` | T52, §6.3 |
| `real-time-websocket-messaging` | T43, T52 |
| `rag-grounded-ai-generation` | T38, T39, T40 |
| `meilisearch-faceted-search` | T16, T17, T18 |
| `cdn-image-optimization` | T19, T78 |
| `query-optimization-indexing` | §6.5 |
| `response-caching-redis` | T13, §6.5 |
| `nextjs-production-optimization` | T14, §6.5 |
| `openapi-documentation` | §8 |
| `structured-logging-pino` | §6.3 |
| `apm-distributed-tracing` | §6.3 |
| `log-aggregation-search` | §6.3 |
| `uptime-synthetic-monitoring` | §6.3 |
| `health-checks-readiness-probes` | existing |
| `multi-stage-docker-builds` | existing |
| `ci-pipeline-github-actions` | P0 |
| `zero-downtime-deployment` | §6.2 |
| `connection-pooling-pgbouncer` | §6.2 |
| `nginx-tls-reverse-proxy` | existing |
| `infrastructure-as-code-terraform` | §6.2 |
| `unit-testing-business-logic` | T32, §6.4 |
| `integration-testing-database` | §6.4 |
| `concurrency-race-condition-tests` | T32, §6.4 |
| `e2e-playwright-tests` | §6.4 |
| `load-testing-k6` | §6.4 |
| `security-penetration-testing` | §6.1 |
| `input-validation-sanitization` | every POST endpoint |
| `structured-error-handling` | existing |
| `api-versioning-strategy` | §8 |
| `encrypted-secret-delivery` | T8 (MFA secret storage) |

Any PR that says "implement X from §5.Y" must cite the relevant skills in
its description so reviewers know which checklists apply.

---

## 10. Team workflow & process

**Branching.**
- `main` — protected, only fast-forward from release PRs.
- `develop` — integration branch, CI must be green.
- `feat/<ticket-id>-<slug>` — per-ticket branches.
- `hotfix/<ticket-id>` — cherry-pick path from main.

**Commits.** Conventional Commits. `feat(addons): …`, `fix(sos): …`.

**PRs.** Template requires:
- Ticket ID + blueprint section
- Skill checklist
- Migration plan (if any)
- Test coverage delta
- Rollout plan (flag, phased %)
- Rollback plan

**Code review.** At least one non-author approval. Every PR touching
money, auth, or SOS requires **two** approvals, one of which must be a
senior engineer.

**Feature flags.** Every new module ships behind a flag named
`feature.<module>`. Flags stored in DB and fetched at boot.

**Release cadence.** Continuous deploy to staging on every `develop`
merge; production release weekly (Tue 10:00 IST) unless feature-flagged.

---

## 11. Definition of done

A ticket is DONE only when all of the following are true:

1. Code merged to `develop` behind a feature flag.
2. Unit + integration tests passing, coverage ≥ target.
3. New API endpoints have OpenAPI schema + Swagger-visible docs.
4. Every new enum / table has a migration in the numbered sequence.
5. Audit/ledger rows are emitted for every state-changing operation.
6. Every new secret is in the `.env.example` with a description and is
   Joi-validated at boot.
7. Logs are Pino-structured with correlation IDs.
8. Rate limits are configured on every new write endpoint.
9. Blueprint is updated in the same PR.
10. Manual smoke test on staging with screenshots attached to the PR.

---

## 12. Risk register

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Role refactor breaks existing JWTs | High | Dual-read compatibility in `JwtStrategy` for 30 days |
| R2 | Pay Later default rate > model | Med | Start with flagged pilot in 1 cluster |
| R3 | AI planner hallucinates inventory IDs | High | Grounding validator + 0% hallucination test suite |
| R4 | SOS broadcast fails silently | Critical | Outbox with retry + external synthetic probe on SOS path |
| R5 | Multi-party ledger split drifts | High | CHECK constraint + daily reconciliation report |
| R6 | WhatsApp Business API template rejected | Med | Maintain SMS fallback in `NotificationOutbox` |
| R7 | Meilisearch re-index under load | Med | Index swap pattern, never rebuild in place |
| R8 | Investor distribution delayed | High | Alert on missed monthly cron, manual override endpoint |
| R9 | DPDP audit fails | High | Consent capture + RTE drill quarterly |
| R10 | Razorpay Route onboarding slow | Med | Start integration in Phase 1, block Phase 2 payouts only |

---

## 13. Glossary

- **Add-on** — optional pre-booking service attached to a stay.
- **Capability** — derived permission set used in guards (not a role).
- **Cluster** — geographic grouping of properties managed by an L3 admin.
- **Concierge** — in-app chat surface for guests during a stay.
- **Distribution** — monthly payout to an investor based on share %.
- **Experience** — second bookable entity type beside stays.
- **Family (token)** — set of refresh tokens that rotate together.
- **Hold** — temporary reservation before payment.
- **Investor** — capital provider, distinct from Owner.
- **Itinerary** — AI-generated, groundable multi-day plan.
- **LedgerEvent** — append-only row representing any money move.
- **Minor units** — the integer we store money in (rupees in this code).
- **Owner** — operator of a property, distinct from Investor.
- **Pay Later** — confirmed booking paid in instalments.
- **Price snapshot** — HMAC-signed price frozen at quote time.
- **Route (Razorpay)** — multi-party split settlement product.
- **Service provider** — external or internal party delivering an add-on.
- **SIP (Trip Savings)** — monthly auto-debit into a travel wallet.
- **SOS incident** — open row representing an active safety event.
- **Stay story** — editorial content block attached to a listing.
- **Tier (Member)** — Explorer/Wanderer/Sojourner/Patron/Ambassador.
- **Waitlist** — queue of users awaiting a refunded event ticket.

---

*This blueprint is a living document. Any change to scope, ordering, or
the data model must be reflected here in the same PR as the code
change.*
