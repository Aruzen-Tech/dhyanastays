# Stay Pass Module — Implementation Approach for Dhyana Stays

**Status:** design / approach (not yet built) · **Date:** 2026-07-23
**Source spec:** *Stay Pass Module — Themed Booking Tickets, Wallet Passes & the
Stay Passport (v1.0)*
**Reviewed against:** the actual `apps/api` codebase (NestJS + Prisma + BullMQ).

This document maps the spec onto **what this platform actually has**, calls out
the real dependencies/gaps, and proposes an advanced, phased build that reuses
existing infrastructure instead of inventing parallel machinery.

---

## 1. Executive read

The Stay Pass module turns the booking confirmation into a themed, shareable,
wallet-installable, QR-verifiable artifact that ages into a collectible stamp.
Architecturally it is a set of **asynchronous consumers of booking lifecycle
events** that never touch the synchronous booking/money path.

That constraint is a perfect match for this codebase, which already runs every
side-effect of confirmation through a **transactional outbox + BullMQ workers**.
Nothing here requires touching the hardened booking engine — it hangs off the
same commit points the notification system already uses.

**Fit verdict:** ~70% of the required primitives already exist and are reused
verbatim; the remaining ~30% is net-new (rendering stack, wallet SDKs, QR
signer, three new tables, one new booking sub-state).

---

## 2. Spec → codebase mapping (what's real, what's a gap)

| Spec assumption | Reality in this repo | Approach |
|---|---|---|
| "Event-driven core (Pillar 5) with a broker + async consumers" | **No general broker.** There's a *notification* outbox (`OutboxService.enqueue`) that already fires `booking.confirmed` / `booking.cancelled`, plus **BullMQ** queues + a scheduler + a **DLQ module**, with retries/backoff/cleanup (hardened recently). | Trigger the module by **enqueuing a BullMQ `ticket.*` job at the same tx-commit** where the booking confirms. This *is* the "async consumer" pattern for this stack — idempotent, retried, DLQ'd. |
| `booking.confirmed` / `booking.completed` / `booking.cancelled` events | Outbox emits `booking.confirmed`, `booking.cancelled`; completion happens in `BookingService.completeBooking`. | Add enqueue calls at those exact points (confirm, settleBalance, cancel, complete). |
| Guarded state machine; add `CHECKED_IN` between CONFIRMED and COMPLETED | `BookingStateMachine` with `statusHistory`, guarded transitions. `BookingStatus` enum currently **has no CHECKED_IN**. | Add `CHECKED_IN` to the Prisma enum (migration) + transitions `CONFIRMED_PAID/CONFIRMED_DEPOSIT → CHECKED_IN → COMPLETED`. Reuse the existing transition guard + append-only history. |
| Signed QR (`HMAC_SHA256(k_qr, payload)`, "same rotation discipline as webhook secrets") | `PriceSnapshotSignerService` already does exactly this (`createHmac` + `timingSafeEqual`, env secret). | Clone it as `QrTokenSignerService` with a dedicated `QR_SIGNING_SECRET`; add `v` (schema version) for key rollover. |
| Content-addressed assets in S3 + CDN, immutable cache | `StorageService` does SigV4 presigned **PUT** (browser upload) + `CDN_URL` + delete. Stub locally; S3/R2 in prod. | Extend it with a **server-side `putObject(key, bytes, contentType)`** (the render worker produces bytes, not a browser upload). Reuse the SigV4 signer + `tickets/{booking_id}/{template_version}/{format}` keying. |
| Rewards route through the "P1 coupon engine" | **No coupon engine exists** (it's a P1 TODO in `PRODUCTION-CHECKLIST.md`). | **Sequencing dependency.** Stamps + passport display ship without it; the *reward grant* (collection-set → coupon) is wired when the coupon engine lands. Never invent a discount path (spec agrees). |
| `stay_theme_id` assigned "during listing approval / Curated Stay Inspection" | **Curated Stay Inspection (module 9) is 0% built.** But admin **listing approval exists** (`admin-listing.controller`). | Attach theme assignment to the existing admin approval flow now; move it into the inspection workflow when that ships. |
| Companion face uses the "Phase 2 guest hub" | Guest **Assistance Hub is built**. | The CHECKED_IN "companion" face links to the existing hub. |
| Access-code-on-pass ("Phase 3") | Not built. | Out of scope for v1; the wallet-update consumer leaves a hook (`access_code.released`). |
| Idempotent consumers, retries, DLQ, rate limits, RBAC, audit, correlation ids | **All present and reused** (`withSerializableRetry`, DLQ module, Throttler, guards, `AuditService`, correlation interceptor). | Reuse verbatim — no new cross-cutting infra. |
| Rendering: satori + resvg + pdf-lib + qrcode | **None installed.** | Add as deps, bundled with the render worker; fonts (brand serif/sans + Tamil/Devanagari) baked into the image, never fetched at render time. |
| Wallet: Apple PassKit + Google Wallet | None. | Google Wallet first (API-only, Android-dominant), Apple later (cert + registration endpoint). |

---

## 3. Module shape (NestJS)

A single feature module, `apps/api/src/stay-pass/`, following the repo's module
conventions (controllers thin, services own logic, processors own async work):

```
stay-pass/
  stay-pass.module.ts
  theme/
    theme.service.ts            # registry CRUD, resolve(theme_id → active version)
    admin-theme.controller.ts   # /admin/themes CRUD + preview (L2+)
  ticket/
    ticket.service.ts           # orchestrator: resolve theme, freeze render context
    ticket.controller.ts        # GET /bookings/:id/ticket, /ticket/share
    render/
      ticket-template.tsx       # ONE master template (satori → SVG)
      render.processor.ts       # BullMQ 'ticket-render' → PNG/PDF/OG → storage
    editions/
      edition.service.ts        # serial claiming (atomic UPDATE…RETURNING)
  qr/
    qr-token.signer.ts          # HMAC k_qr sign/verify (clone of price signer)
    checkin.controller.ts       # POST /checkin/scan, /checkin/confirm (host/admin)
    checkin.service.ts          # verify → guarded CHECKED_IN transition
  wallet/
    google-wallet.service.ts    # EventTicket class/object + save JWT
    apple-passkit.service.ts    # .pkpass (phase C.2)
    wallet.processor.ts         # BullMQ 'wallet-issue' + 'wallet-update'
  passport/
    passport.service.ts         # stamp mint, collection-set evaluation
    passport.controller.ts      # GET /me/passport
    stamp.processor.ts          # BullMQ 'stamp-mint' on booking.completed
```

New BullMQ queues (registered in `jobs.module.ts`, inheriting the hardened
`defaultJobOptions` — attempts/backoff/removeOnComplete): `ticket-render`,
`wallet-issue`, `wallet-update`, `stamp-mint`. Job key = deterministic
(`bookingId` / `bookingId:template_version`) so replays overwrite idempotently —
**note:** use a `-` separator, not `:` (BullMQ rejects colons — a bug we already
hit and fixed in the scheduler).

---

## 4. Data model (module-owned, additive)

New Prisma models + a migration **`0034_stay_pass`** (idempotent `CREATE TABLE IF
NOT EXISTS`, matching repo convention). Maps the spec's tables to Prisma:

- `StayTheme` (id, version, displayName, status, tokens Json, assets Json,
  `@@unique([id, version])`)
- `TicketEdition` (id, themeOverlay Json, windowStart/windowEnd, scope Json,
  maxIssue Int?, issuedCount Int @default(0))
- `Ticket` (id, `bookingId @unique`, themeId, themeVersion, editionId?,
  editionSerial?, templateVersion, status enum
  `PENDING|RENDERED|FAILED|VOIDED|COMMEMORATIVE`, assets Json, qrJti,
  qrRevoked Bool, wallet Json, timestamps)
- `CheckinScan` (append-only: id, bookingId, ticketId, scannedBy, result,
  scannedAt)
- `PassportStamp` (id, guestId, `bookingId @unique`, themeId, editionId?, mintedAt)
- `CollectionSet` (id, definition Json, reward Json) + `CollectionAward`
  (`@@id([guestId, setId])`)
- `Listing.stayThemeId String?` (nullable FK → StayTheme, added in the same migration)
- `BookingStatus` enum gains `CHECKED_IN` (enum alter).

**Ownership boundary (enforced, per spec):** this module **never writes
`Booking` directly** — the CHECKED_IN transition goes through
`BookingStateMachine`, and any reward goes through the coupon engine + ledger.
Its own tables (`CheckinScan`, `PassportStamp`) are append-only.

---

## 5. How it plugs into the booking engine (the trigger seam)

Three small, surgical hooks — none on the synchronous money path:

1. **On confirm** (`BookingService.confirmPayment` / `settleBalance`, inside the
   committed tx, right beside the existing `outbox.enqueue('booking.confirmed')`):
   also enqueue a `ticket-render` BullMQ job `{ bookingId, reason: 'confirmed' }`.
   The render worker resolves theme → freezes context → renders PNG/PDF/OG →
   `storage.putObject` → writes the `Ticket` manifest → the notifier attaches the
   hero + PDF to the confirmation email.
2. **On completion** (`completeBooking`): enqueue `stamp-mint` +
   `ticket-render {reason:'commemorative'}`.
3. **On cancel** (`cancelBooking`): enqueue a job that voids the ticket +
   revokes the QR `jti` + voids the wallet pass.

**SLA-safe confirmation (spec §3.4):** the confirmation email must **not** wait
for rendering. Reuse the existing async notifier — it already sends the
confirmation independently; the ticket assets attach when `ticket-render`
finishes, or a "Your Stay Pass is ready" follow-up fires. p95 render target < 10s.

---

## 6. Reuse map (what we get for free)

| Need | Existing asset reused |
|---|---|
| HMAC-signed QR token + rotation | `PriceSnapshotSignerService` pattern → `QrTokenSignerService` |
| Content-addressed asset storage + CDN | `StorageService` (SigV4) + `CDN_URL` (extend with server `putObject`) |
| Async, idempotent, retried, DLQ'd jobs | BullMQ + `jobs.module` defaults + `DlqModule` + `withSerializableRetry` |
| Edition serial claiming under contention | Same `SERIALIZABLE + UPDATE…WHERE issued_count < max RETURNING` discipline as the booking overlap/idempotency races (proven by the concurrency test suite) |
| Guarded state change + append-only history | `BookingStateMachine` + `statusHistory` |
| RBAC + ownership + rate limit + audit + correlation id | `RolesGuard`/`AdminLevelGuard`, `Throttler`, `AuditService`, `CorrelationIdInterceptor` |
| Secrets discipline (env-injected, boot-validated) | `env.validation.ts` Joi schema (add `QR_SIGNING_SECRET`, wallet certs/keys) |
| Confirmation email attachment path | `OutboxService` + notification adapters |

---

## 7. Prerequisites & sequencing gates

Before / alongside this module:

1. **Object storage (S3 or R2) must be real** — rendering produces bytes that
   need durable storage + CDN. Today staging runs storage in **stub mode**. Gate
   Phase A on provisioning R2 (or a local MinIO for dev). *(This is already a P0
   launch item in `TODO.md`.)*
2. **Coupon engine (P1)** — gates only the passport *reward grant* (§7.2), not
   stamps/collection display. Build stamps first; wire rewards when it lands.
3. **Fonts** — bundle brand serif + sans + Tamil/Devanagari into the render
   worker image (guest-name rendering).
4. **Curated Stay Inspection (module 9)** — not required; theme assignment
   attaches to existing admin approval and relocates later.
5. **Wallet credentials** — Google Wallet issuer account/service-account key
   (Phase C.1); Apple Pass Type ID cert + a registration web service (Phase C.2).

---

## 8. Phased build order (adapted from spec §12 to this repo)

Each phase ends green (lint + unit + integration in CI) with changelog entries
(both tiers), and touches nothing in the P0 blocker list.

- **Phase A — "The visible fancy ticket" (launch-worthy alone).** Theme registry
  + admin CRUD/preview · one master `TicketTemplate` (satori) · `ticket-render`
  worker → PNG/PDF/OG → storage manifest · confirmation email attaches hero+PDF
  with static fallback · `GET /bookings/:id/ticket` + share-safe variant.
  *Deps: real storage, render libs, fonts.*
- **Phase B — Functional ticket.** `QrTokenSignerService` · `POST /checkin/scan`
  + `/checkin/confirm` (host/admin, ownership-checked, rate-limited, audited) ·
  add `CHECKED_IN` state + transition · **re-anchor payout-eligibility to the
  verified check-in** (currently anchored to `startsAt + 24h`) · optional-graceful
  (no scan ⇒ existing auto-complete still applies).
- **Phase C — Wallet.** C.1 Google Wallet (EventTicket class/object + save JWT,
  embedded in email + booking page). C.2 Apple PassKit (.pkpass + registration
  endpoint) + `wallet-update` consumer (check-in window, cancel-void,
  complete→stamp).
- **Phase D — Lifecycle faces.** Upcoming (live web ticket on the booking page)
  → CHECKED_IN companion (links to the existing Assistance Hub) → COMPLETED
  commemorative transform (QR removed, memory line, review CTA).
- **Phase E — Stay Passport.** `stamp-mint` on completion · passport spread at
  `GET /me/passport` · collection sets (data-defined) · reward grant **gated on
  the coupon engine**.
- **Phase F — Editions.** Overlay schema · atomic serial claiming · first
  seasonal campaign; pairs with flash-sale mode.

Phases A–B are independently shippable and are the highest-leverage slice
(themed ticket + real check-in). C–F layer on with no schema breaks.

---

## 9. Testing strategy (mapped to the existing harness)

- **Render determinism** — golden-file jest snapshots: fixed render context in →
  byte-stable SVG out, per theme × format × template_version; snapshot-diff gate
  on template PRs (satori is deterministic).
- **QR token security** — unit tests in the `confirm-payment.spec` style:
  tampered signature, expired/`nbf` window, revoked `jti`, replay, cross-booking
  substitution — each rejected with a distinct audit reason.
- **Edition serial concurrency** — an integration test firing N parallel
  confirmations at `maxIssue = M`, asserting exactly M serials, no dupes/gaps —
  reuse the exact pattern of the existing double-booking race proof
  (`booking-engine.int-spec`, `INT_CONCURRENCY_ITERATIONS`).
- **Lifecycle faces** — state-driven tests for every transition incl. cancel
  mid-flow (pass → companion → stamp → voided).
- **Wallet** — Apple validator / Google test issuer; update-push against sandbox.
- **CI** — runs in the integration job added earlier (real Postgres); render
  worker tests run in the unit job.

---

## 10. Risks & decisions to make

1. **Render worker footprint.** satori + resvg are CPU/memory heavy for the
   Render free tier. Decision: run rendering in the same API process for dev, but
   plan a **separate worker service** (or a paid instance) for prod so renders
   never contend with request handling. It's already off the request path, so
   this is a scaling choice, not a correctness one.
2. **Apple PassKit ops** — cert lifecycle + a registration/update web service.
   Defer to Phase C.2; Google-only is a fine launch.
3. **Wallet update push infra** — APNs (Apple) + object PATCH (Google) via a
   `wallet-update` consumer; needs the wallet credentials and a push path.
4. **Payout-eligibility semantics change** — moving the anchor from assumed to
   verified check-in touches the payout clock; must stay backward-compatible for
   bookings that are never scanned (fallback = current behavior).
5. **Coupon-engine dependency** — do not let Phase E block the earlier,
   high-value phases; ship stamps without rewards and backfill.
6. **Storage cost/privacy** — share-safe variants must strip QR + booking ref +
   guest surname (spec privacy rule); enforce at the template context layer, and
   keep functional assets behind owner-auth (only `/ticket/share` is public).

---

## 11. Recommended first slice (2 sprints)

Ship **Phase A + Phase B** behind a **feature flag** (you already have the
`FeatureFlag` system + `@FeatureGate`): themed ticket rendered on confirmation,
attached to the email and shown on the booking page, plus signed-QR check-in with
the new CHECKED_IN state. That delivers the visible "fancy confirmation" *and*
real arrival telemetry, reuses every piece of existing infra, and depends on only
one external provisioning item (object storage). Wallet, passport, and editions
layer on afterward without migrations that break anything shipped.
