-- Migration 0016_addons
-- Pre-booking add-ons (Phase 2 §5.7): ServiceProvider, AddOn, BookingAddOn

-- ── Enums ─────────────────────────────────────────────────────────────────
CREATE TYPE "CancellationTier" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE');
CREATE TYPE "AddOnScope"       AS ENUM ('GLOBAL', 'CLUSTER', 'LISTING');
CREATE TYPE "AddOnStatus"      AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETIRED');
CREATE TYPE "AddOnState"       AS ENUM ('QUOTED', 'HELD', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- ── ServiceProvider ───────────────────────────────────────────────────────
CREATE TABLE "ServiceProvider" (
    "id"           TEXT        NOT NULL,
    "name"         TEXT        NOT NULL,
    "kind"         "ServiceType" NOT NULL,
    "ownerUserId"  TEXT        NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "payoutMethod" JSONB,
    "active"       BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceProvider_ownerUserId_idx" ON "ServiceProvider"("ownerUserId");
CREATE INDEX "ServiceProvider_kind_active_idx" ON "ServiceProvider"("kind", "active");

ALTER TABLE "ServiceProvider"
  ADD CONSTRAINT "ServiceProvider_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── AddOn ─────────────────────────────────────────────────────────────────
CREATE TABLE "AddOn" (
    "id"               TEXT              NOT NULL,
    "providerId"       TEXT              NOT NULL,
    "title"            TEXT              NOT NULL,
    "description"      TEXT              NOT NULL,
    "priceMinor"       INTEGER           NOT NULL,
    "commissionRate"   DOUBLE PRECISION  NOT NULL DEFAULT 0.15,
    "currency"         TEXT              NOT NULL DEFAULT 'INR',
    "cancellationTier" "CancellationTier" NOT NULL DEFAULT 'MODERATE',
    "minLeadHours"     INTEGER           NOT NULL DEFAULT 24,
    "maxPerBooking"    INTEGER           NOT NULL DEFAULT 1,
    "availability"     JSONB,
    "scope"            "AddOnScope"      NOT NULL DEFAULT 'GLOBAL',
    "clusterId"        TEXT,
    "listingId"        TEXT,
    "status"           "AddOnStatus"     NOT NULL DEFAULT 'PENDING',
    "reviewedBy"       TEXT,
    "reviewNotes"      TEXT,
    "reviewedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AddOn_providerId_idx"     ON "AddOn"("providerId");
CREATE INDEX "AddOn_status_scope_idx"   ON "AddOn"("status", "scope");
CREATE INDEX "AddOn_listingId_idx"      ON "AddOn"("listingId");

ALTER TABLE "AddOn"
  ADD CONSTRAINT "AddOn_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AddOn"
  ADD CONSTRAINT "AddOn_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── BookingAddOn ──────────────────────────────────────────────────────────
CREATE TABLE "BookingAddOn" (
    "id"            TEXT         NOT NULL,
    "bookingId"     TEXT         NOT NULL,
    "addOnId"       TEXT         NOT NULL,
    "providerId"    TEXT         NOT NULL,
    "quantity"      INTEGER      NOT NULL DEFAULT 1,
    "unitPrice"     INTEGER      NOT NULL,
    "totalPrice"    INTEGER      NOT NULL,
    "commission"    INTEGER      NOT NULL,
    "providerShare" INTEGER      NOT NULL,
    "state"         "AddOnState" NOT NULL DEFAULT 'QUOTED',
    "snapshotHmac"  TEXT         NOT NULL,
    "cancelledAt"   TIMESTAMP(3),
    "refundedAt"    TIMESTAMP(3),
    "refundAmount"  INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingAddOn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingAddOn_bookingId_idx"          ON "BookingAddOn"("bookingId");
CREATE INDEX "BookingAddOn_addOnId_state_idx"      ON "BookingAddOn"("addOnId", "state");
CREATE INDEX "BookingAddOn_providerId_state_idx"   ON "BookingAddOn"("providerId", "state");

ALTER TABLE "BookingAddOn"
  ADD CONSTRAINT "BookingAddOn_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingAddOn"
  ADD CONSTRAINT "BookingAddOn_addOnId_fkey"
  FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
