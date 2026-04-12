# Dhyana Stays — Complete Application Architecture

> A full-stack vacation rental platform for wellness retreats in India.
> **Tech Stack:** NestJS (API) · Next.js 15 (Web) · PostgreSQL · Redis · Razorpay · BullMQ
> **Monorepo:** pnpm workspaces — `apps/api`, `apps/web`, `packages/shared`

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Authentication System](#2-authentication-system)
3. [Database Schema & Models](#3-database-schema--models)
4. [Guest Booking Flow](#4-guest-booking-flow)
5. [Payment System (Razorpay)](#5-payment-system-razorpay)
6. [Pricing Engine](#6-pricing-engine)
7. [Cancellation & Refund Policy](#7-cancellation--refund-policy)
8. [Payout System](#8-payout-system)
9. [Background Jobs (BullMQ)](#9-background-jobs-bullmq)
10. [Messaging System](#10-messaging-system)
11. [Notification Service](#11-notification-service)
12. [Host Management](#12-host-management)
13. [Admin Platform](#13-admin-platform)
14. [Guest Experience](#14-guest-experience)
15. [API Endpoints Reference](#15-api-endpoints-reference)
16. [Frontend Pages Reference](#16-frontend-pages-reference)
17. [Guards, Decorators & Middleware](#17-guards-decorators--middleware)
18. [Storage & Media](#18-storage--media)
19. [Infrastructure & DevOps](#19-infrastructure--devops)
20. [Environment Configuration](#20-environment-configuration)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                    Next.js 15 — App Router                      │
│              apps/web — Port 3000 (dev)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │  /api/* proxied via next.config.js
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER (NestJS)                          │
│              apps/api — Port 3001 (dev)                          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │   Auth   │ │ Booking  │ │ Payment  │ │  Host Analytics   │  │
│  │  Module  │ │  Module  │ │  Module  │ │     Module        │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Listing  │ │ Pricing  │ │  Payout  │ │    Messaging      │  │
│  │  Module  │ │  Module  │ │  Module  │ │     Module        │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  Guest   │ │  Admin   │ │   Hold   │ │    Notification   │  │
│  │  Module  │ │  Module  │ │  Module  │ │     Module        │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────────┐│
│  │ Storage  │ │   Jobs   │ │  Common (Guards, Audit, Ledger)  ││
│  │  Module  │ │  Module  │ │                                  ││
│  └──────────┘ └──────────┘ └──────────────────────────────────┘│
└──────────┬──────────────────────┬───────────────────────────────┘
           │                      │
           ▼                      ▼
┌────────────────┐    ┌────────────────┐    ┌──────────────┐
│  PostgreSQL    │    │     Redis      │    │  Meilisearch │
│  (via Prisma)  │    │   (BullMQ)     │    │  (Search)    │
│  Port 5432     │    │  Port 6379     │    │  Port 7700   │
└────────────────┘    └────────────────┘    └──────────────┘
```

**Request Lifecycle:**
1. Browser makes request to Next.js dev server (port 3000)
2. `/api/*` routes are proxied to NestJS (port 3001) via `next.config.js`
3. `JwtAuthGuard` validates the JWT token (unless `@Public()`)
4. `RolesGuard` checks `@Roles()` decorator against `user.role`
5. Controller delegates to Service → Prisma → PostgreSQL
6. Response flows back through the same chain

---

## 2. Authentication System

Dhyana Stays supports **dual-mode authentication** — configurable at deploy time.

### Mode 1: Custom JWT (Default for Development)

Active when `AUTH0_DOMAIN` is not set.

```
┌──────────┐  POST /auth/register   ┌──────────┐
│  Client  │ ────────────────────▶   │   Auth   │  ─▶ Create User (bcrypt hash)
│          │  POST /auth/login       │  Service  │  ─▶ Issue access + refresh tokens
│          │ ◀────────────────────   │          │
│          │  { accessToken,         └──────────┘
│          │    refreshToken }
│          │
│          │  POST /auth/refresh     ┌──────────┐
│          │ ────────────────────▶   │   Auth   │  ─▶ Verify refresh token
│          │ ◀────────────────────   │  Service  │  ─▶ Rotate: new access + refresh
│          │  { accessToken,         └──────────┘
│          │    refreshToken }
└──────────┘
```

- **Access Token:** HS256, payload `{ sub, email, role }`, expires in 15 minutes
- **Refresh Token:** HS256, payload `{ sub, type: 'refresh' }`, expires in 7 days
- **Token Rotation:** Each refresh invalidates the old refresh token and issues a new pair
- **Password Storage:** bcrypt with auto salt rounds
- **Rate Limiting:** 5 failed login attempts per 15 minutes → temporary lockout

### Mode 2: Auth0 (Production)

Active when `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are set.

- Validates RS256 tokens via JWKS endpoint (`/.well-known/jwks.json`)
- Custom claims: `https://dhyanastays.in/role`, `https://dhyanastays.in/email`
- On first Auth0 login, `syncUser()` creates a local User record
- Audience validation ensures tokens are issued for this API

### Token Storage (Frontend)

```typescript
// apps/web/lib/api.ts
tokenStore.setTokens(accessToken, refreshToken)  // localStorage
tokenStore.getAccessToken()                       // read
tokenStore.clearTokens()                          // logout

// Auto-refresh: 401 response → POST /auth/refresh → retry original request
```

### Role Model

| Role | Capabilities |
|------|-------------|
| `GUEST` | Browse listings, book stays, manage profile, wishlist, reviews, messaging |
| `HOST` | Create/edit listings, view bookings, analytics, payouts, messaging |
| `ADMIN` | Approve listings/hosts, manage users, payouts, refunds, platform settings |

---

## 3. Database Schema & Models

All models are defined in `apps/api/prisma/schema.prisma` using Prisma ORM with PostgreSQL.

### Entity Relationship Diagram

```
User ─────────────┬─── Host ──────── Listing ──────── RateRule
  │                │      │              │                 │
  │ (auth)         │      │              ├── ListingMedia  │
  │                │      │              ├── ListingTag ── Tag
  │ GuestPreference│      │              ├── SeasonalRate
  │ Wishlist       │      │              ├── AvailabilityBlock
  │ Review         │      │              │
  │ GuestNotification     │              Hold
  │ CreditLedger   │      │              │
  │                │      │              ▼
  │                │      │           Booking ───── Payment
  │                │      │              │            │
  │                │      │              ├── Refund   │
  │                │      │              │            │
  │                │      │         PayoutLine ─── PayoutBatch
  │                │      │
  │  Conversation ─┤      ├── HostNotification
  │  Message       │      ├── AdminNotification
  │                │
  └── AuditLog     └── LedgerEvent
                        IdempotencyKey
                        SystemConfig
```

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Platform user | id, email, fullName, role (GUEST/HOST/ADMIN), passwordHash?, auth0Sub? |
| **Host** | Host profile | userId, verificationStatus (PENDING/APPROVED/REJECTED), payoutAccountRef? |
| **Listing** | Property | title, description, city, state, country, status, timezone, preparationGuide? |
| **RateRule** | Pricing config | listingId, baseNightlyRate, cleaningFee, minNights, maxGuests |
| **SeasonalRate** | Date-range overrides | listingId, startDate, endDate, nightlyRate |
| **AvailabilityBlock** | Blocked dates | listingId, startDate, endDate, reason |
| **Hold** | 15-min booking lock | listingId, guestId, startsAt, endsAt, priceSnapshot, expiresAt, idempotencyKey |
| **Booking** | Confirmed reservation | listingId, guestId, holdId, status, plan (FULL/DEPOSIT_50), priceSnapshot, balanceDueAt? |
| **Payment** | Payment record | bookingId, gateway, gatewayOrderId, gatewayPaymentId, amount, status, type |
| **Refund** | Cancellation refund | bookingId, amount, reason, gatewayRefundId? |
| **PayoutLine** | Host payout item | hostId, bookingId, amount, status, eligibleAt |
| **PayoutBatch** | Weekly batch | hostId, totalAmount, status, lines[] |
| **LedgerEvent** | Financial audit | type, amount, bookingId, metadata |
| **AuditLog** | Action history | actorId, action, resourceType, resourceId, metadata |
| **GuestPreference** | Wellness prefs | userId, dietaryNeeds[], wellnessInterests[], accessibility?, experienceLevel? |
| **Conversation** | Messaging thread | userOneId, userTwoId, type (GUEST_HOST/HOST_ADMIN), listingId?, bookingId? |
| **Message** | Chat message | conversationId, senderId, senderRole, body, isRead |
| **Wishlist** | Saved listings | userId, listingId (unique pair) |
| **Review** | Booking review | bookingId (unique), guestId, rating, comment |
| **IdempotencyKey** | Duplicate prevention | key, userId, path, responseHash, cachedResponse |

### Key Enums

```prisma
enum BookingStatus {
  HOLD              // 15-min reservation lock
  PAYMENT_PENDING   // Booking created, awaiting payment
  CONFIRMED_DEPOSIT // Deposit (50%) paid
  BALANCE_DUE       // Balance due date arrived (48h before check-in)
  CONFIRMED_PAID    // Fully paid
  CANCELLED         // Cancelled (no refund)
  REFUNDED          // Cancelled with refund
  COMPLETED         // Post-checkout
}

enum PayoutStatus {
  NOT_ELIGIBLE  // Created, waiting 24h post-checkin
  ELIGIBLE      // Ready for weekly batch
  SCHEDULED     // Included in PayoutBatch
  PAID          // Bank transfer confirmed
  ON_HOLD       // Manually held
  REVERSED      // Clawed back
}
```

---

## 4. Guest Booking Flow

The complete booking journey from discovery to confirmation:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DISCOVER                                                      │
│    Guest browses /listings (public)                              │
│    Filters by location, dates, guests                            │
│    Views listing detail at /listings/:id                         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. QUOTE                                                         │
│    POST /api/pricing/quote                                       │
│    Body: { listingId, checkIn, checkOut, guests }                │
│                                                                  │
│    Returns PriceQuote:                                           │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ nightlyBreakdown: [{ date, rate }]                       │  │
│    │ subtotal: 450000  (₹4,500)                               │  │
│    │ cleaningFee: 50000 (₹500)                                │  │
│    │ platformFee: 50000 (₹500) — 10% of (subtotal+cleaning)  │  │
│    │ total: 550000 (₹5,500)                                   │  │
│    │ depositAmount: 275000 (₹2,750) — 50%                     │  │
│    │ balanceAmount: 275000 (₹2,750)                           │  │
│    └─────────────────────────────────────────────────────────┘  │
│    All amounts in paise (₹1 = 100 paise)                        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. HOLD (15-minute lock)                                         │
│    POST /api/holds                                               │
│    Body: { listingId, checkIn, checkOut, guests, idempotencyKey }│
│                                                                  │
│    • Verifies no overlapping confirmed bookings or active holds  │
│    • Creates Hold with HMAC-signed priceSnapshot                 │
│    • expiresAt = now + 15 minutes                                │
│    • Background job expires stale holds every minute             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. BOOKING                                                       │
│    POST /api/bookings                                            │
│    Body: { holdId, plan: "FULL"|"DEPOSIT_50", guestDetails }     │
│                                                                  │
│    • Validates hold exists, not expired, belongs to guest        │
│    • Creates Booking (status: PAYMENT_PENDING)                   │
│    • For DEPOSIT_50: sets balanceDueAt = checkIn - 48 hours      │
│    • Idempotent on holdId (returns existing booking if replay)   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. PAYMENT                                                       │
│    POST /api/payments/init                                       │
│    Body: { bookingId, type: "FULL"|"DEPOSIT", idempotencyKey }   │
│                                                                  │
│    • Verifies priceSnapshot HMAC (prevents tampering)            │
│    • Creates Razorpay order (or stub order in dev)               │
│    • Creates Payment record (status: INITIATED)                  │
│    • Returns { paymentId, gatewayOrderId, amount, key }          │
│                                                                  │
│    Frontend opens Razorpay checkout modal                        │
│    Guest completes payment                                       │
│                                                                  │
│    Razorpay sends webhook → POST /api/payments/webhook           │
│    • Verifies HMAC-SHA256 signature                              │
│    • payment.captured → confirm booking                          │
│    • payment.failed → mark failed                                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. CONFIRMATION                                                  │
│    Booking transitions:                                          │
│    • FULL plan    → CONFIRMED_PAID                               │
│    • DEPOSIT plan → CONFIRMED_DEPOSIT                            │
│                                                                  │
│    Side effects:                                                 │
│    • PayoutLine created (NOT_ELIGIBLE, eligible 24h post-checkin)│
│    • LedgerEvent recorded (PAYMENT_CAPTURED)                     │
│    • AuditLog entry created                                      │
│    • Email + SMS sent to guest                                   │
│    • Guest redirected to /bookings/:id                           │
└─────────────────────────────────────────────────────────────────┘
```

### Booking State Machine

```
                    ┌─────────────────┐
                    │ PAYMENT_PENDING │ ◀── createBooking()
                    └────────┬────────┘
                             │
              payment captured (webhook)
                             │
               ┌─────────────┴──────────────┐
               ▼                             ▼
  ┌──────────────────────┐     ┌──────────────────┐
  │  CONFIRMED_DEPOSIT   │     │  CONFIRMED_PAID  │
  │  (50% deposit paid)  │     │  (full amount)   │
  └──────────┬───────────┘     └────────┬─────────┘
             │                          │
    balanceDueAt reached                │
    (48h before check-in)               │
             ▼                          │
  ┌──────────────────────┐              │
  │    BALANCE_DUE       │              │
  └──────┬──────┬────────┘              │
         │      │                       │
  balance │      │ 24h grace            │
  paid   │      │ exceeded              │
         ▼      ▼                       │
  CONFIRMED  CANCELLED                  │
  _PAID      (auto)                     │
         │                              │
         └──────────┬───────────────────┘
                    │
            post-checkout (admin)
                    ▼
           ┌────────────────┐
           │   COMPLETED    │
           └────────────────┘

  Any confirmable state ──cancel──▶ CANCELLED / REFUNDED
```

---

## 5. Payment System (Razorpay)

### Integration Architecture

```
┌──────────┐     init payment      ┌──────────────┐   create order   ┌──────────┐
│  Client  │ ──────────────────▶   │  PaymentSvc  │ ────────────▶    │ Razorpay │
│          │ ◀──────────────────   │              │ ◀────────────    │   API    │
│          │  { orderId, key }     └──────────────┘  { order_id }   │          │
│          │                                                         │          │
│          │  Open Razorpay modal                                    │          │
│          │ ─────────────────────────────────────────────────────▶  │          │
│          │                                                         │          │
│          │                       ┌──────────────┐   webhook        │          │
│          │                       │  PaymentSvc  │ ◀────────────   │          │
│          │                       │  (webhook)   │  payment.captured│          │
│          │                       └──────┬───────┘                  └──────────┘
│          │                              │
│          │                    ┌─────────▼─────────┐
│          │                    │ • Update Payment   │
│          │                    │ • Confirm Booking  │
│          │                    │ • Create PayoutLine│
│          │                    │ • Record Ledger    │
│          │                    │ • Send Notification│
│          │                    └───────────────────┘
└──────────┘
```

### Payment Types

| Type | When | Amount |
|------|------|--------|
| `FULL` | Guest chooses full payment | `priceSnapshot.total` |
| `DEPOSIT` | Guest chooses 50% deposit | `priceSnapshot.depositAmount` |
| `BALANCE` | Balance due reminder | `priceSnapshot.balanceAmount` |

### Stub Mode (Development)

When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are empty:
- Order IDs prefixed with `stub_order_`
- No real Razorpay calls made
- Manual confirmation via `POST /api/payments/stub-confirm/:paymentId`
- Webhook signature verification skipped

### Security Measures

- **Price Snapshot HMAC:** Signed when hold is created, verified at payment init — prevents client-side amount tampering
- **Webhook Signature:** HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET` — ensures webhook authenticity
- **Idempotency:** `IdempotencyKey` model + interceptor prevents duplicate charges

---

## 6. Pricing Engine

**Service:** `apps/api/src/pricing/pricing.service.ts`

### Quote Calculation

```
Input: { listingId, checkIn, checkOut, guests }

For each night in [checkIn, checkOut):
  1. Check SeasonalRate for that date → use if found
  2. Otherwise → use RateRule.baseNightlyRate

subtotal     = sum(nightly rates)
cleaningFee  = RateRule.cleaningFee
platformFee  = round((subtotal + cleaningFee) * 0.10)   // 10%
total        = subtotal + cleaningFee + platformFee
deposit      = round(total * 0.50)                       // 50%
balance      = total - deposit

All values in paise (₹1 = 100 paise)
```

### Example Quote

```json
{
  "nightlyBreakdown": [
    { "date": "2026-04-01", "rate": 150000 },
    { "date": "2026-04-02", "rate": 150000 },
    { "date": "2026-04-03", "rate": 200000 }
  ],
  "subtotal": 500000,
  "cleaningFee": 50000,
  "platformFee": 55000,
  "total": 605000,
  "depositAmount": 302500,
  "balanceAmount": 302500,
  "nights": 3,
  "guests": 2
}
```

---

## 7. Cancellation & Refund Policy

Refund percentage is based on how far the cancellation is from check-in:

| Time Before Check-in | Refund % | Rationale |
|----------------------|----------|-----------|
| >= 48 hours | **100%** | Full refund — ample time to rebook |
| 10 – 48 hours | **50%** | Partial refund — short notice |
| < 10 hours | **0%** | No refund — last minute |

### Cancellation Flow

```
Guest/Admin calls POST /api/bookings/:id/cancel
  │
  ├── Validate booking is in cancellable status
  │   (PAYMENT_PENDING, CONFIRMED_DEPOSIT, CONFIRMED_PAID, BALANCE_DUE)
  │
  ├── Calculate refund amount based on policy
  │
  └── Transaction:
      ├── Update booking status → REFUNDED (if refund > 0) or CANCELLED
      ├── Create Refund record (if refund > 0)
      ├── Record LedgerEvent (REFUND_ISSUED)
      ├── Write AuditLog
      └── Send cancellation email/SMS (non-blocking)
```

### Auto-Cancel (Unpaid Balance)

A background job checks every 15 minutes:
- Bookings in `BALANCE_DUE` status
- Where `balanceDueAt` is more than 24 hours ago (grace period)
- Auto-cancels with reason: "Balance not paid within grace period"

---

## 8. Payout System

### Revenue Split

```
Guest pays:    ₹5,500 (total)
                 │
                 ├── Subtotal:    ₹4,500 (room nights)
                 ├── Cleaning:    ₹500
                 └── Platform Fee: ₹500 (10% of subtotal + cleaning)

Host receives: ₹4,500 (90% of ₹5,000)
Platform keeps: ₹1,000 (platform fee + 10% of subtotal)
```

*Note: The platform fee is 10% of (subtotal + cleaningFee). Host gets the remaining 90%.*

### Payout Timeline

```
Day 0: Booking confirmed, payment captured
       → PayoutLine created (status: NOT_ELIGIBLE)
       → eligibleAt = checkIn + 24 hours

Check-in day + 24h: Background job runs hourly
       → PayoutLine transitions to ELIGIBLE

Next Monday 09:00 IST: Weekly batch job
       → Groups ELIGIBLE lines by host
       → Creates PayoutBatch (status: SCHEDULED)
       → Lines transition to SCHEDULED
       → LedgerEvent: PAYOUT_SCHEDULED

Admin confirms bank transfer:
       → POST /admin/payouts/batches/:id/mark-paid
       → Batch + lines transition to PAID
       → LedgerEvent: PAYOUT_SENT
```

### Host Payout Statement

Hosts can view their payout history at `/host/payouts`, showing:
- Individual payout lines per booking
- Batch groupings with total amounts
- Status tracking (eligible → scheduled → paid)

---

## 9. Background Jobs (BullMQ)

All jobs run via BullMQ with Redis as the queue backend.

| Job | Queue | Schedule | Purpose |
|-----|-------|----------|---------|
| **Hold Expiry** | `hold-expiry` | Every 1 minute | Expire holds past `expiresAt`, release inventory |
| **Balance Due** | `balance-due` | Every 15 minutes | Transition `CONFIRMED_DEPOSIT` → `BALANCE_DUE` when 48h before check-in; send reminder emails; auto-cancel if 24h grace exceeded |
| **Payout Eligibility** | `payout-eligibility` | Every 1 hour | Mark `PayoutLine` as `ELIGIBLE` when 24h after check-in has passed |
| **Weekly Payout** | `weekly-payout` | Monday 03:30 UTC (09:00 IST) | Batch all `ELIGIBLE` payout lines by host, create `PayoutBatch` records |

### Dead Letter Queue

Failed jobs are routed to a Dead Letter Queue (`DlqService`) with metadata for manual investigation.

**Key Files:**
- `apps/api/src/jobs/jobs.scheduler.ts` — Schedules all repeatable jobs
- `apps/api/src/jobs/hold-expiry.processor.ts`
- `apps/api/src/jobs/balance-due.processor.ts`
- `apps/api/src/jobs/payout-eligibility.processor.ts`
- `apps/api/src/jobs/weekly-payout.processor.ts`
- `apps/api/src/common/queues/dlq.service.ts`

---

## 10. Messaging System

### Conversation Types

| Type | Participants | Initiated From |
|------|-------------|----------------|
| `GUEST_HOST` | Guest ↔ Host | Listing detail page, booking detail page |
| `HOST_ADMIN` | Host ↔ Admin | Host messages page |

### Architecture

```
┌──────────┐                    ┌──────────────────────┐
│  Guest   │ ──── messages ──▶  │                      │
│          │ ◀── messages ────  │   Shared             │
└──────────┘                    │   MessagingService   │
                                │                      │
┌──────────┐                    │   • startConversation │
│   Host   │ ──── messages ──▶  │   • sendMessage      │
│          │ ◀── messages ────  │   • getConversations  │
└──────────┘                    │   • markRead          │
                                │   • getUnreadCount    │
┌──────────┐                    │                      │
│  Admin   │ ──── messages ──▶  │                      │
│          │ ◀── messages ────  │                      │
└──────────┘                    └──────────────────────┘
```

### Deduplication

Conversations use a unique constraint `@@unique([userOneId, userTwoId, listingId])`. Participants are consistently ordered by role priority (GUEST < HOST < ADMIN) so that starting a conversation from either side finds the same record.

### Frontend Implementation

- **Polling:** 15-second interval on conversation thread pages
- **Unread Badge:** Navbar shows unread count for each role
- **Shared Components:** `ConversationList` and `MessageThread` are reused across all 3 role pages
- **API Client:** Factory function `createMessagingApi(prefix)` generates typed clients for `/guest/conversations`, `/host/conversations`, `/admin/conversations`

---

## 11. Notification Service

**Service:** `apps/api/src/notification/notification.service.ts`

### Channels

| Channel | Providers | Dev Mode |
|---------|-----------|----------|
| **Email** | Resend, SendGrid, SMTP | `EMAIL_PROVIDER=stub` → logs to console |
| **SMS** | MSG91, Twilio | `SMS_PROVIDER=stub` → logs to console |

### Templates

| Template | Trigger | Content |
|----------|---------|---------|
| `sendBookingConfirmed` | Payment captured | Booking details, dates, amount, plan |
| `sendBalanceDueReminder` | Balance due transition | Balance amount, due date |
| `sendBookingCancelled` | Cancellation | Refund amount (if any) |
| `sendHostListingApproved` | Admin approves listing | Listing now live |
| `sendHostListingRejected` | Admin rejects listing | Rejection reason |
| `sendAdminNotification` | System events | Event-specific content |
| `sendHostNotification` | Booking/payout events | Event-specific content |

### In-App Notifications

Three separate notification models for role-specific alerts:
- `GuestNotification` — booking status changes, balance due reminders
- `HostNotification` — new bookings, listing approvals, payout ready
- `AdminNotification` — system alerts, pending approvals

Each has a `GuestNotificationBell` / equivalent component in the Navbar.

---

## 12. Host Management

### Host Onboarding Flow

```
1. User registers with role HOST
   └── Host record created (verificationStatus: PENDING)

2. Admin reviews at /admin/hosts
   └── Approve → APPROVED (can create listings)
   └── Reject → REJECTED (with reason)

3. Host creates listing at /host/listings/new
   └── Listing status: DRAFT → PENDING_APPROVAL

4. Admin reviews at /admin/listings
   └── Approve → APPROVED (visible to guests)
   └── Reject → REJECTED (with reason)
   └── Request Changes → CHANGES_REQUESTED
```

### Host Dashboard Features

| Feature | Route | Description |
|---------|-------|-------------|
| **Listings** | `/dashboard` (HOST) | All listings with status badges, Edit/View buttons |
| **Bookings** | `/host/bookings` | Incoming reservations for all properties |
| **Calendar** | `/host/calendar` | Visual availability & booking view |
| **Analytics** | `/host/analytics` | Revenue trends, booking counts, performance |
| **Performance** | `/host/performance` | Ratings, occupancy rate, response time |
| **Payouts** | `/host/payouts` | Payout history and statements |
| **Messages** | `/host/messages` | Guest and admin conversations |

### Listing Management

Hosts can configure per listing:
- **Basic Info:** Title, description, city, state, country
- **Rate Rules:** Base nightly rate, cleaning fee, min nights, max guests
- **Seasonal Rates:** Override pricing for specific date ranges
- **Availability Blocks:** Block dates for maintenance or personal use
- **Media:** Upload images via presigned URLs
- **Preparation Guide:** Packing list, daily schedule, dietary info, arrival instructions

---

## 13. Admin Platform

### Admin Dashboard (`/admin`)

Displays platform-wide statistics:
- Total revenue, bookings, users, hosts
- Recent bookings and pending approvals
- Quick links to all management pages

### Admin Capabilities

| Page | Route | Actions |
|------|-------|---------|
| **Listings** | `/admin/listings` | Approve, reject, request changes for pending listings |
| **Listing Detail** | `/admin/listings/:id` | Full property review with approval controls |
| **Hosts** | `/admin/hosts` | Approve/reject host applications, deactivate hosts |
| **Host Performance** | `/admin/hosts/performance` | Compare host metrics |
| **Bookings** | `/admin/bookings` | View all bookings, mark as completed |
| **Users** | `/admin/users` | Search, deactivate, bulk actions |
| **Payouts** | `/admin/payouts` | Run weekly batch, mark batches paid, view lines |
| **Refunds** | `/admin/refunds` | Issue manual refunds, view history |
| **Messages** | `/admin/messages` | Host↔Admin conversations |
| **Audit** | `/admin/audit` | Full action audit trail with filters |
| **Analytics** | `/admin/analytics` | Revenue by day/week/month |
| **Forecast** | `/admin/forecast` | Revenue projections |
| **Activity** | `/admin/activity` | Admin action history |
| **Calendar** | `/admin/calendar` | All bookings by date |
| **Rate Limits** | `/admin/rate-limits` | IP throttle statistics |
| **Settings** | `/admin/settings` | Key-value system config |

### Bulk Operations

- `bulkApproveListings(ids[])` — Mass-approve pending listings
- `bulkDeactivateUsers(ids[])` — Mass-deactivate user accounts
- `bulkCompleteBookings(ids[])` — Mass-complete past bookings

---

## 14. Guest Experience

### Guest Journey

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ Discover │ ──▶ │  Quote   │ ──▶ │   Book   │ ──▶ │  Prepare  │
│ /listings│     │  & Hold  │     │ & Pay    │     │  (guide)  │
└─────────┘     └──────────┘     └──────────┘     └───────────┘
                                       │
                                       ▼
                               ┌───────────┐     ┌───────────┐
                               │  Stay &   │ ──▶ │  Review   │
                               │  Message  │     │           │
                               └───────────┘     └───────────┘
```

### Guest Features

| Feature | Route | Description |
|---------|-------|-------------|
| **Dashboard** | `/dashboard` | Booking stats, upcoming stays, quick links |
| **Booking Detail** | `/bookings/:id` | Status, payment info, host contact |
| **Preparation Guide** | `/bookings/:id/preparation` | Packing list, schedule, dietary info (confirmed bookings only) |
| **Profile** | `/guest/profile` | Name, email, photo |
| **Preferences** | `/guest/preferences` | Dietary needs, wellness interests, accessibility, experience level, emergency contact |
| **Wishlist** | `/guest/wishlist` | Saved favorite listings |
| **Reviews** | `/guest/reviews` | Reviews written for past stays |
| **Messages** | `/guest/messages` | Host conversations |
| **Notifications** | Bell icon | Booking updates, balance reminders |

### Guest Preferences (Wellness-Focused)

The preferences form captures wellness-specific information:
- **Dietary Needs:** Vegetarian, Vegan, Gluten-free, Ayurvedic, etc.
- **Wellness Interests:** Yoga, Meditation, Ayurveda, Detox, Sound Healing, etc.
- **Experience Level:** Beginner, Intermediate, Advanced
- **Room Preference:** Ground floor, Quiet corner, Garden view
- **Arrival Preference:** Early morning, Afternoon, Evening
- **Accessibility Requirements:** Free text
- **Emergency Contact:** Name, phone, relation

---

## 15. API Endpoints Reference

### Public (No Auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/refresh` | Refresh tokens |
| GET | `/listings` | Browse approved listings |
| GET | `/listings/:id` | Listing detail |
| POST | `/pricing/quote` | Get price quote |
| POST | `/payments/webhook` | Razorpay webhook |

### Guest (GUEST role)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/holds` | Create 15-min booking hold |
| POST | `/bookings` | Create booking from hold |
| GET | `/bookings/mine` | My bookings |
| GET | `/bookings/:id` | Booking detail |
| POST | `/bookings/:id/cancel` | Cancel booking |
| GET | `/bookings/:id/preparation` | Retreat preparation guide |
| POST | `/payments/init` | Initialize payment |
| POST | `/payments/pay-balance` | Pay remaining balance |
| GET | `/guest/profile` | Get profile |
| PATCH | `/guest/profile` | Update profile |
| GET | `/guest/preferences` | Get wellness preferences |
| PUT | `/guest/preferences` | Save preferences |
| GET | `/guest/wishlist` | Get wishlist |
| POST | `/guest/wishlist/:listingId` | Add to wishlist |
| DELETE | `/guest/wishlist/:listingId` | Remove from wishlist |
| GET | `/guest/reviews` | My reviews |
| POST | `/guest/reviews` | Write review |
| GET | `/guest/conversations` | Message threads |
| POST | `/guest/conversations` | Start conversation |
| GET | `/guest/conversations/:id` | Thread messages |
| POST | `/guest/conversations/:id/messages` | Send message |
| POST | `/guest/conversations/:id/read` | Mark read |
| GET | `/guest/conversations/unread-count` | Unread badge count |
| GET | `/guest/notifications` | My notifications |
| POST | `/guest/notifications/:id/read` | Mark notification read |
| GET | `/guest/stats` | Dashboard statistics |

### Host (HOST role)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/host/listings` | Create new listing |
| GET | `/host/listings` | My listings |
| PATCH | `/host/listings/:id` | Update listing |
| POST | `/host/listings/:id/media` | Add media |
| POST | `/host/listings/:id/seasonal-rates` | Add seasonal rate |
| POST | `/host/listings/:id/availability-blocks` | Block dates |
| GET | `/host/listings/:id/preparation` | Get preparation guide |
| PATCH | `/host/listings/:id/preparation` | Update preparation guide |
| GET | `/host/bookings` | Bookings for my listings |
| GET | `/host/analytics/stats` | Revenue statistics |
| GET | `/host/analytics/revenue` | Revenue chart data |
| GET | `/host/analytics/bookings` | Booking analytics |
| GET | `/host/analytics/performance` | Performance metrics |
| GET | `/host/analytics/calendar` | Calendar data |
| GET | `/host/analytics/notifications` | Host notifications |
| GET | `/host/payouts/statements` | Payout history |
| GET | `/host/conversations` | Message threads |
| POST | `/host/conversations` | Start conversation |
| GET | `/host/conversations/:id` | Thread messages |
| POST | `/host/conversations/:id/messages` | Send message |
| POST | `/host/conversations/:id/read` | Mark read |
| GET | `/host/conversations/unread-count` | Unread badge count |

### Admin (ADMIN role)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/users` | User management list |
| POST | `/admin/users/:id/deactivate` | Deactivate user |
| POST | `/admin/users/:id/activate` | Reactivate user |
| GET | `/admin/audit` | Audit trail |
| GET | `/admin/analytics/revenue` | Revenue analytics |
| GET | `/admin/analytics/forecast` | Revenue forecast |
| GET | `/admin/analytics/activity` | Admin activity log |
| POST | `/admin/listings/:id/review` | Approve/reject listing |
| GET | `/admin/listings/:id` | Listing detail |
| POST | `/admin/hosts/:id/approve` | Approve host |
| POST | `/admin/hosts/:id/reject` | Reject host |
| GET | `/admin/hosts/performance` | Host performance metrics |
| GET | `/admin/bookings` | All bookings (paginated) |
| POST | `/admin/bookings/:id/complete` | Mark booking completed |
| GET | `/admin/payouts/eligible` | Eligible payout lines |
| GET | `/admin/payouts/batches` | Payout batches |
| POST | `/admin/payouts/run-batch` | Trigger weekly batch |
| POST | `/admin/payouts/batches/:id/mark-paid` | Confirm bank transfer |
| GET | `/admin/refunds` | Refund history |
| POST | `/admin/refunds` | Issue manual refund |
| GET | `/admin/calendar` | Bookings calendar view |
| GET | `/admin/settings` | System config |
| PATCH | `/admin/settings` | Update config |
| GET | `/admin/rate-limits` | Throttle stats |
| POST | `/admin/bulk/approve-listings` | Bulk approve |
| POST | `/admin/bulk/deactivate-users` | Bulk deactivate |
| POST | `/admin/bulk/complete-bookings` | Bulk complete |
| GET | `/admin/search` | Global search |
| GET | `/admin/conversations` | Message threads |
| POST | `/admin/conversations` | Start conversation |
| GET | `/admin/conversations/:id` | Thread messages |
| POST | `/admin/conversations/:id/messages` | Send message |
| POST | `/admin/conversations/:id/read` | Mark read |
| GET | `/admin/conversations/unread-count` | Unread badge count |
| GET | `/admin/notifications` | Admin notifications |
| POST | `/admin/notifications/:id/read` | Mark notification read |
| POST | `/admin/notifications/read-all` | Mark all read |

### Storage

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/storage/presigned-upload` | Get presigned upload URL |
| POST | `/storage/stub-upload` | Dev-only file upload |

---

## 16. Frontend Pages Reference

### Public Pages (No Auth)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Homepage — featured listings, search |
| `/auth/login` | `app/auth/login/page.tsx` | Sign in form |
| `/auth/register` | `app/auth/register/page.tsx` | Registration (GUEST or HOST) |
| `/auth/callback` | `app/auth/callback/page.tsx` | Auth0 OAuth callback |
| `/listings/:id` | `app/listings/[id]/page.tsx` | Listing detail with booking panel |

### Guest Pages

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `app/dashboard/page.tsx` | Stats, upcoming bookings, quick links |
| `/bookings/:id` | `app/bookings/[id]/page.tsx` | Booking detail, payment, cancellation |
| `/bookings/:id/preparation` | `app/bookings/[id]/preparation/page.tsx` | Retreat preparation guide |
| `/guest/profile` | `app/guest/profile/page.tsx` | Edit name, email, photo |
| `/guest/preferences` | `app/guest/preferences/page.tsx` | Wellness preferences form |
| `/guest/wishlist` | `app/guest/wishlist/page.tsx` | Saved listings grid |
| `/guest/reviews` | `app/guest/reviews/page.tsx` | Reviews written |
| `/guest/messages` | `app/guest/messages/page.tsx` | Conversation list |
| `/guest/messages/:id` | `app/guest/messages/[id]/page.tsx` | Message thread |

### Host Pages

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `app/dashboard/page.tsx` | Listings grid with status, quick links |
| `/host/listings/new` | `app/host/listings/new/page.tsx` | Create listing form |
| `/host/listings/:id/edit` | `app/host/listings/[id]/edit/page.tsx` | Edit listing (rates, media, availability) |
| `/host/bookings` | `app/host/bookings/page.tsx` | Incoming bookings |
| `/host/calendar` | `app/host/calendar/page.tsx` | Visual calendar |
| `/host/analytics` | `app/host/analytics/page.tsx` | Revenue charts |
| `/host/performance` | `app/host/performance/page.tsx` | Metrics dashboard |
| `/host/payouts` | `app/host/payouts/page.tsx` | Payout history |
| `/host/messages` | `app/host/messages/page.tsx` | Conversations (tabs: Guests / Admin) |
| `/host/messages/:id` | `app/host/messages/[id]/page.tsx` | Message thread |

### Admin Pages

| Route | File | Description |
|-------|------|-------------|
| `/admin` | `app/admin/page.tsx` | Platform dashboard |
| `/admin/listings` | `app/admin/listings/page.tsx` | Approval queue |
| `/admin/listings/:id` | `app/admin/listings/[id]/page.tsx` | Listing review |
| `/admin/hosts` | `app/admin/hosts/page.tsx` | Host management |
| `/admin/hosts/performance` | `app/admin/hosts/performance/page.tsx` | Host metrics |
| `/admin/bookings` | `app/admin/bookings/page.tsx` | All bookings |
| `/admin/users` | `app/admin/users/page.tsx` | User management |
| `/admin/payouts` | `app/admin/payouts/page.tsx` | Payout batches |
| `/admin/refunds` | `app/admin/refunds/page.tsx` | Refund management |
| `/admin/messages` | `app/admin/messages/page.tsx` | Admin messaging |
| `/admin/messages/:id` | `app/admin/messages/[id]/page.tsx` | Message thread |
| `/admin/audit` | `app/admin/audit/page.tsx` | Audit trail |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | Revenue analytics |
| `/admin/forecast` | `app/admin/forecast/page.tsx` | Revenue forecast |
| `/admin/activity` | `app/admin/activity/page.tsx` | Admin activity |
| `/admin/calendar` | `app/admin/calendar/page.tsx` | Booking calendar |
| `/admin/rate-limits` | `app/admin/rate-limits/page.tsx` | Throttle stats |
| `/admin/settings` | `app/admin/settings/page.tsx` | System config |

---

## 17. Guards, Decorators & Middleware

### Guards (Applied Globally)

| Guard | Scope | Purpose |
|-------|-------|---------|
| `JwtAuthGuard` | Global | Validates JWT on every request; respects `@Public()` decorator |
| `RolesGuard` | Global | Checks `@Roles()` decorator against `user.role`; allows if no roles specified |
| `LoginThrottleGuard` | `/auth/login` only | 5 failed attempts per 15 minutes → lockout |

### Decorators

| Decorator | Target | Purpose |
|-----------|--------|---------|
| `@Public()` | Method/Controller | Bypass JWT authentication |
| `@Roles(UserRole.HOST, ...)` | Method/Controller | Require specific role(s) |
| `@CurrentUser()` | Parameter | Extract `{ sub, email, role }` from JWT payload |

### Interceptors

| Interceptor | Scope | Purpose |
|-------------|-------|---------|
| `ThrottleTrackerInterceptor` | Global | Track request rates per IP for admin monitoring |
| `IdempotencyInterceptor` | Per-route | Cache responses for duplicate requests with same idempotency key |

---

## 18. Storage & Media

**Service:** `apps/api/src/storage/storage.service.ts`

### Upload Flow

```
1. Frontend requests presigned URL:
   POST /api/storage/presigned-upload
   Body: { fileName, contentType, folder }

2. API generates presigned PUT URL (SigV4):
   Returns: { uploadUrl, publicUrl, key }

3. Frontend uploads directly to S3/R2:
   PUT {uploadUrl} with file body

4. Frontend saves publicUrl to listing media:
   POST /api/host/listings/:id/media
   Body: { url: publicUrl, type: "IMAGE" }
```

### Providers

| Provider | Config | Use Case |
|----------|--------|----------|
| `stub` | Default (dev) | Returns localhost URLs, no actual upload |
| `s3` | AWS S3 | Production with `S3_ENDPOINT`, `S3_BUCKET`, etc. |
| `r2` | Cloudflare R2 | S3-compatible, with optional `CDN_URL` |

---

## 19. Infrastructure & DevOps

### Development Stack

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    port: 5432

  redis:
    image: redis:6.2.0
    port: 6379

  meilisearch:
    image: getmeili/meilisearch:v1.12
    port: 7700
```

### Production Stack

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck: pg_isready

  redis:
    image: redis:7-alpine
    persistence: RDB snapshots

  meilisearch:
    image: getmeili/meilisearch:v1.12
    healthcheck enabled

  api:
    build: apps/api/Dockerfile
    depends_on: [postgres, redis]

  web:
    build: apps/web/Dockerfile (standalone)
    depends_on: [api]
```

### CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

```
Trigger: push to main/develop, or any PR

Jobs:
  api:
    → Install deps (pnpm)
    → Generate Prisma client
    → Run tests
    → Build

  web:
    → Install deps (pnpm)
    → Build

  docker (main branch only, after api+web pass):
    → Build apps/api/Dockerfile → dhyana-api:ci
    → Build apps/web/Dockerfile → dhyana-web:ci
```

### Development Commands

```bash
# Start infrastructure
pnpm infra:up                         # Docker: postgres, redis, meilisearch

# Start services
pnpm --filter @dhyana/api start:dev   # API on :3001 (watch mode)
pnpm --filter @dhyana/web dev         # Web on :3000 (hot reload)

# Database
pnpm --filter @dhyana/api prisma:generate   # Regenerate Prisma client
pnpm --filter @dhyana/api prisma:migrate    # Apply migrations
pnpm --filter @dhyana/api prisma:studio     # Visual DB browser
```

---

## 20. Environment Configuration

### API Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3001` | API server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | HS256 signing secret (min 16 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token secret |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `REDIS_HOST` | No | `localhost` | Redis host for BullMQ |
| `REDIS_PORT` | No | `6379` | Redis port |
| `RAZORPAY_KEY_ID` | No | — | Razorpay API key (empty = stub mode) |
| `RAZORPAY_KEY_SECRET` | No | — | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | No | — | Webhook signature secret |
| `EMAIL_PROVIDER` | No | `stub` | `stub` / `resend` / `sendgrid` / `smtp` |
| `SMS_PROVIDER` | No | `stub` | `stub` / `msg91` / `twilio` |
| `STORAGE_PROVIDER` | No | `stub` | `stub` / `s3` / `r2` |
| `AUTH0_DOMAIN` | No | — | Auth0 domain (empty = custom JWT mode) |
| `AUTH0_AUDIENCE` | No | — | Auth0 API audience |
| `PRICE_SNAPSHOT_SECRET` | Yes | — | HMAC signing key (min 32 chars) |
| `MEILI_URL` | No | — | Meilisearch URL |
| `MEILI_MASTER_KEY` | No | — | Meilisearch API key |
| `THROTTLE_TTL` | No | `60000` | Rate limit window (ms) |
| `THROTTLE_LIMIT` | No | `100` | Max requests per window |

### Web Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend API base URL |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | No | — | Auth0 domain (absent = custom JWT) |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | No | — | Auth0 SPA client ID |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | No | — | Auth0 API audience |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Prisma Models** | 22 |
| **API Modules** | 19 |
| **API Services** | 20+ |
| **API Endpoints** | 90+ |
| **Frontend Pages** | 41 |
| **Background Jobs** | 4 |
| **Database Migrations** | 8 |
| **Notification Templates** | 7 |

---

*Generated for Dhyana Stays — Wellness Retreat Booking Platform*
