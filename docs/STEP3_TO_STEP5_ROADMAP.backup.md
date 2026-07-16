# Dhyana Stays — Remaining Spec Delivery Roadmap (Steps 3–5)

Created: 2026-04-21
Status: Step 1 (§5.10 Concierge Chat) done, Step 2 (§5.14 Investor Dashboard) done.
Remaining work covers 5 spec sections packaged into Steps 3, 4, 5 below.

Architectural standards (apply to every step):

- **All amounts in paise.** Helper `formatINR(paise)` used on web.
- **Notifications** go through `OutboxService.enqueue(...)`; transactional kinds bypass opt-outs.
- **Audit** every admin mutation via `AuditService.log(actorUserId, action, resourceType, resourceId, metadata, tx?)`.
- **RBAC:** `@Roles(UserRole.ADMIN)` + `@AdminLevel(...)` for admin; `@Kinds(UserKind.X)` for kind-scoped surfaces; `@UseGuards(JwtAuthGuard, RolesGuard)` on every controller.
- **Migrations** are idempotent: `CREATE TABLE IF NOT EXISTS`, `DO $ BEGIN ... EXCEPTION WHEN duplicate_object` for enums.
- **DTO validation** with class-validator; date strings as ISO; IDs as `cuid`.
- **Cron jobs** registered in `jobs.scheduler.ts` + BullMQ queue in `jobs.constants.ts` + processor in `apps/api/src/jobs/*.processor.ts`.
- **Typecheck both apps** after each step.

---

## STEP 3 — §5.11 Advanced Admin Hierarchy + §5.18 Advanced Search & Discovery

Bundle because both are "expand existing surfaces" rather than net-new domains.

### 3A. Advanced Admin Hierarchy (§5.11)

Existing: `StaffRole`, `AdminLevel` enum (L1..L5), `CapabilitiesService`, `RolesGuard` — all live.
Gap: no admin UI for managing staff, assigning levels, scoping capability overrides.

**Backend:**
- `apps/api/src/admin/staff/` module
  - `staff.service.ts`: list staff, upsert staff role (kind=STAFF + level), disable
  - `staff.controller.ts`: `GET/POST/PATCH /admin/staff`, `GET /admin/staff/:id`
  - `dto/upsert-staff.dto.ts`
- Migration `0023_staff_mgmt` (only if additional indexes needed — StaffRole already exists)
- Audit: `admin.staff.created`, `admin.staff.updated`, `admin.staff.disabled`

**Frontend:**
- `apps/web/app/admin/staff/page.tsx` — list staff, add/edit role, assign level
- Navbar: add "Staff" link in admin dropdown (L4+)
- `apps/web/lib/types.ts`: `StaffRecord` type
- `apps/web/lib/api.ts`: `adminStaffApi` namespace

### 3B. Advanced Search & Discovery (§5.18)

Existing: `/` grid/map/split view, basic location filter.
Gap: experience-based filtering (wellness interests/dietary/retreat type), property type categories, sort options.

**Schema additions:**
- `Listing.experienceTags String[]` — yoga, meditation, ayurveda, sound-healing, detox, spa, silent-retreat
- `Listing.propertyType String?` — villa, cottage, ashram, homestay, resort
- `Listing.dietaryOptions String[]` — vegetarian, vegan, gluten-free, ayurvedic, jain, sattvic
- Migration `0024_listing_discovery_facets`

**Backend:**
- Extend `ListingService.search()` with `experienceTags[]`, `propertyType`, `dietaryOptions[]`, `sort` (price-asc, price-desc, rating-desc, newest)
- No new endpoints — extend `/listings` query shape

**Frontend:**
- `apps/web/app/page.tsx` — filter sidebar: checkboxes for experience tags, radio for propertyType, checkboxes for dietary, sort dropdown
- Preserve existing grid/map/split UX
- `apps/web/app/host/listings/[id]/edit/page.tsx` — new section to set experienceTags/propertyType/dietaryOptions

---

## STEP 4 — §5.15 Experience & Event Module + §5.8 Group Planning

### 4A. Experience & Event Module (§5.15)

Curated wellness events (standalone or tied to a listing): yoga workshops, sound-bath sessions, cooking classes, guided hikes. Guests book seats; host or admin runs them.

**Schema:**
```
enum ExperienceKind { YOGA, MEDITATION, SOUND_HEALING, COOKING, HIKE, CEREMONY, WORKSHOP, OTHER }
enum ExperienceStatus { DRAFT, PUBLISHED, CANCELLED, COMPLETED }
enum ExperienceBookingStatus { CONFIRMED, CANCELLED }

model Experience {
  id, hostId?, listingId?, kind, status
  title, description, coverUrl?
  startsAt DateTime, durationMinutes Int
  capacity Int, priceMinor Int, currency (INR)
  city, state, location lat/lng?
  createdAt, updatedAt
  @@index([status, startsAt])
  @@index([listingId])
}

model ExperienceBooking {
  id, experienceId, guestId, seats Int, amountMinor
  status ExperienceBookingStatus, confirmedAt, cancelledAt?
  @@unique([experienceId, guestId])  // dedup
  @@index([guestId, status])
}
```

Migration `0025_experiences`.

**Backend module `experience/`:**
- Service: search/list, create/update/publish (host), admin approve, book/cancel (guest)
- Public: `GET /experiences?kind=&city=&from=&to=`, `GET /experiences/:id`
- Host: `POST /host/experiences`, `PATCH /host/experiences/:id`, `POST /host/experiences/:id/publish`
- Admin: `GET/PATCH /admin/experiences` (moderation)
- Guest: `POST /experiences/:id/book`, `POST /experiences/bookings/:id/cancel`
- Outbox kinds: `experience.booking.confirmed`, `experience.published`, `experience.cancelled`
- Cron: auto-mark COMPLETED when startsAt + durationMinutes passed (daily)

**Frontend:**
- Public: `/experiences` (grid), `/experiences/[id]` (detail + book)
- Host: `/host/experiences` (CRUD), `/host/experiences/new`, `/host/experiences/[id]/edit`
- Admin: `/admin/experiences` (moderation)
- Guest: `/guest/experiences` (my bookings)
- Navbar: "Experiences" public link

### 4B. Group Planning (§5.8)

Bookings with multiple guests splitting cost.

**Schema:**
```
enum TripGroupRole { ORGANIZER, MEMBER }
enum TripGroupStatus { DRAFTING, COLLECTING, COMPLETE, CANCELLED }
enum ExpenseSplitStatus { PENDING, PAID, WAIVED }

model TripGroup {
  id, bookingId, organizerId, name?
  status, totalMinor, collectedMinor (derived)
  createdAt, updatedAt
  @@unique([bookingId])
}

model TripGroupMember {
  id, groupId, userId?, email, fullName
  role, shareMinor, invitedAt, joinedAt?
  @@unique([groupId, email])
}

model ExpenseSplit {
  id, groupId, memberId, amountMinor, status
  paidAt?, razorpayPaymentId?
  @@index([groupId, status])
}
```

Migration `0026_group_planning`.

**Backend module `group-planning/`:**
- Guest: create group (from booking), invite members (email), set shares, accept invite, pay share
- Endpoints: `POST /trip-groups` (from bookingId), `POST /trip-groups/:id/members`, `POST /trip-groups/:id/members/:memberId/shares`, `POST /trip-groups/invites/:token/accept`, `POST /trip-groups/splits/:id/pay`
- Payment: reuse Razorpay order flow, credit against group
- Outbox kinds: `trip_group.invite.sent`, `trip_group.share.assigned`, `trip_group.share.paid`, `trip_group.complete`

**Frontend:**
- `/bookings/[id]/group` — organize split
- `/trip-groups/invite/[token]` — member accepts
- `/trip-groups/[id]` — member view (see shares, pay)

---

## STEP 5 — §5.9 AI Itinerary Planner

Generate personalized retreat schedules for confirmed bookings using Anthropic Claude API.

**Schema:**
```
enum ItineraryStatus { DRAFT, GENERATED, FINALIZED }

model Itinerary {
  id, bookingId, userId
  status, preferences Json, schedule Json?
  generationCount Int @default(0)
  generatedAt?, finalizedAt?
  createdAt, updatedAt
  @@unique([bookingId])
}
```

Migration `0027_itinerary`.

**Backend module `itinerary/`:**
- Service: generate(bookingId) — reads guest preferences + listing + preparation guide, calls Anthropic API, stores JSON
- Rate limit: max 3 regenerations per booking
- Endpoints: `GET /bookings/:id/itinerary`, `POST /bookings/:id/itinerary/generate`, `POST /bookings/:id/itinerary/finalize`
- Env: `ANTHROPIC_API_KEY`
- Anthropic model: `claude-haiku-4-5-20251001` (cheap + fast; structured output via tool use or JSON schema)
- Outbox: `itinerary.generated`

**Frontend:**
- `apps/web/app/bookings/[id]/itinerary/page.tsx` — preferences form, Generate button, day-by-day schedule view, Finalize button
- Add link from `/bookings/[id]` for confirmed bookings

---

## Execution Order

1. Step 3A + 3B (admin hierarchy UI + listing discovery facets) — smallest; shared by others
2. Step 4A (experiences)
3. Step 4B (group planning)
4. Step 5 (AI itinerary)

After each step: typecheck both apps + git commit.

## Verification Checklist (per step)

- [ ] Migration file created and SQL valid
- [ ] `prisma generate` succeeds
- [ ] `tsc --noEmit` passes on apps/api
- [ ] `tsc --noEmit` passes on apps/web
- [ ] RBAC verified on all new endpoints
- [ ] Audit logging on admin mutations
- [ ] Outbox notifications wired for user-facing events
- [ ] Navbar updated where relevant
