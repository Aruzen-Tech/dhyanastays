-- Stay Spotlight: admin-curated featured listings for the homepage carousel.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "SpotlightStay" (
  "id"          TEXT NOT NULL,
  "listingId"   TEXT NOT NULL,
  "badge"       TEXT,
  "tagline"     TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpotlightStay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SpotlightStay_listingId_key" ON "SpotlightStay"("listingId");
CREATE INDEX IF NOT EXISTS "SpotlightStay_isActive_sortOrder_idx" ON "SpotlightStay"("isActive", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SpotlightStay_listingId_fkey'
  ) THEN
    ALTER TABLE "SpotlightStay"
      ADD CONSTRAINT "SpotlightStay_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SpotlightStay_createdById_fkey'
  ) THEN
    ALTER TABLE "SpotlightStay"
      ADD CONSTRAINT "SpotlightStay_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
