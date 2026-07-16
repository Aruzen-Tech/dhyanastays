-- 0027_itinerary_chat_and_usage
-- Phase 1 AI Itinerary: chat refinement (ItineraryMessage), per-user monthly
-- usage tracking (ItineraryUsage) for cost cap, plus theme hint + token counts
-- on Itinerary itself.

-- Itinerary additions
ALTER TABLE "Itinerary" ADD COLUMN IF NOT EXISTS "themeHint" TEXT;
ALTER TABLE "Itinerary" ADD COLUMN IF NOT EXISTS "tokensInput" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Itinerary" ADD COLUMN IF NOT EXISTS "tokensOutput" INTEGER NOT NULL DEFAULT 0;

-- ItineraryMessage
CREATE TABLE IF NOT EXISTS "ItineraryMessage" (
  "id"           TEXT NOT NULL,
  "itineraryId"  TEXT NOT NULL,
  "role"         TEXT NOT NULL,
  "content"      TEXT NOT NULL,
  "appliedPatch" JSONB,
  "tokensInput"  INTEGER NOT NULL DEFAULT 0,
  "tokensOutput" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ItineraryMessage_itineraryId_createdAt_idx"
  ON "ItineraryMessage"("itineraryId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "ItineraryMessage"
    ADD CONSTRAINT "ItineraryMessage_itineraryId_fkey"
    FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ItineraryUsage
CREATE TABLE IF NOT EXISTS "ItineraryUsage" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "monthBucket"   TEXT NOT NULL,
  "generations"   INTEGER NOT NULL DEFAULT 0,
  "chatMessages"  INTEGER NOT NULL DEFAULT 0,
  "tokensInput"   INTEGER NOT NULL DEFAULT 0,
  "tokensOutput"  INTEGER NOT NULL DEFAULT 0,
  "costPaise"     INTEGER NOT NULL DEFAULT 0,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ItineraryUsage_userId_monthBucket_key"
  ON "ItineraryUsage"("userId", "monthBucket");
CREATE INDEX IF NOT EXISTS "ItineraryUsage_monthBucket_idx"
  ON "ItineraryUsage"("monthBucket");
DO $$ BEGIN
  ALTER TABLE "ItineraryUsage"
    ADD CONSTRAINT "ItineraryUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
