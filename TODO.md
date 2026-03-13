# Dhyana Stays — Local Development TODO

## Phase 1: Backend Fixes
- [x] Auth + RBAC
- [x] Listing workflow + admin approvals
- [x] Pricing quote + holds + booking engine
- [x] Payment service (Razorpay stub)
- [x] Payout + ledger + weekly batch
- [x] Background jobs (BullMQ)
- [x] Add stub-confirm endpoint (POST /payments/stub-confirm/:paymentId)
- [x] Fix getMyBookings to include listing data
- [x] Fix getPublicListings / getPublicListingById to include rateRules
- [x] Fix getHostListings to include rateRules
- [x] Add admin getAllBookings endpoint

## Phase 2: Frontend Fixes
- [x] Home page (discovery + search)
- [x] Auth pages (login, register)
- [x] Dashboard (Guest/Host/Admin)
- [x] Listing detail + booking flow
- [x] Admin listings/hosts approval
- [x] Admin payouts
- [x] Host new listing
- [x] Fix payment flow (auto stub-confirm after init)
- [x] Add /bookings/[id] booking detail page
- [x] Add /host/listings/[id]/edit host edit page
- [x] Add /admin/bookings admin bookings view
- [x] Verify Navbar has all links

## Phase 3: Env & Config
- [x] Verify apps/web/.env.local has NEXT_PUBLIC_API_URL
- [x] Verify apps/api/.env has all required local vars

## Phase 4: End-to-End Test
- [ ] Remove demo seeded listings and fallback demo data
- [ ] Register guest + host
- [ ] Admin approves host
- [ ] Host creates listing
- [ ] Admin approves listing
- [ ] Verify listing appears in public discovery only after admin listing approval
- [ ] Guest books with FULL payment (stub confirm)
- [ ] Guest books with DEPOSIT_50 (stub confirm)
- [ ] Admin runs weekly payout batch
- [ ] Host views payout statements
