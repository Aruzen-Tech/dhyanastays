-- Listing moderation: one record per trip through the approval queue.
--
-- The listing row alone cannot tell a reviewer when the listing actually
-- entered the queue (createdAt is the creation date, which mis-sorts
-- re-submissions) or what changed since it was last approved (the previous
-- values are gone the moment the update is written). Idempotent.

DO $$ BEGIN
  CREATE TYPE "ListingReviewType" AS ENUM ('NEW', 'REAPPROVAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ListingReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ListingReviewRequest" (
  "id"            TEXT NOT NULL,
  "listingId"     TEXT NOT NULL,
  "type"          "ListingReviewType" NOT NULL,
  "submittedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedById" TEXT NOT NULL,
  "diff"          JSONB,
  "photoCount"    INTEGER NOT NULL DEFAULT 0,
  "videoCount"    INTEGER NOT NULL DEFAULT 0,
  "decision"      "ListingReviewDecision",
  "decisionNote"  TEXT,
  "decidedById"   TEXT,
  "decidedAt"     TIMESTAMP(3),
  CONSTRAINT "ListingReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ListingReviewRequest_listingId_submittedAt_idx"
  ON "ListingReviewRequest" ("listingId", "submittedAt");
CREATE INDEX IF NOT EXISTS "ListingReviewRequest_decision_submittedAt_idx"
  ON "ListingReviewRequest" ("decision", "submittedAt");

DO $$ BEGIN
  ALTER TABLE "ListingReviewRequest"
    ADD CONSTRAINT "ListingReviewRequest_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill: every listing already waiting in the queue gets an open request so
-- it does not vanish from the enriched view. updatedAt is the closest signal we
-- have to "when it was submitted" for rows that predate this table.
INSERT INTO "ListingReviewRequest" ("id", "listingId", "type", "submittedAt", "submittedById", "photoCount", "videoCount")
SELECT
  'lrr_backfill_' || l."id",
  l."id",
  CASE WHEN l."needsReapproval" THEN 'REAPPROVAL'::"ListingReviewType" ELSE 'NEW'::"ListingReviewType" END,
  COALESCE(l."updatedAt", l."createdAt"),
  l."createdById",
  (SELECT COUNT(*) FROM "ListingMedia" m WHERE m."listingId" = l."id" AND m."mediaType" LIKE 'image%'),
  (SELECT COUNT(*) FROM "ListingMedia" m WHERE m."listingId" = l."id" AND m."mediaType" LIKE 'video%')
FROM "Listing" l
WHERE l."status" = 'PENDING_APPROVAL'
  AND NOT EXISTS (
    SELECT 1 FROM "ListingReviewRequest" r WHERE r."listingId" = l."id" AND r."decision" IS NULL
  );
