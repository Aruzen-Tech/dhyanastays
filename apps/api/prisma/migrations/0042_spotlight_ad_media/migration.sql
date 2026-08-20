-- Media collections for spotlight features and advertisements. Idempotent.

CREATE TABLE IF NOT EXISTS "SpotlightMedia" (
  "id"          TEXT NOT NULL,
  "spotlightId" TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "mediaType"   TEXT NOT NULL,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpotlightMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SpotlightMedia_spotlightId_sortOrder_idx"
  ON "SpotlightMedia"("spotlightId", "sortOrder");

CREATE TABLE IF NOT EXISTS "AdvertisementMedia" (
  "id"              TEXT NOT NULL,
  "advertisementId" TEXT NOT NULL,
  "url"             TEXT NOT NULL,
  "mediaType"       TEXT NOT NULL,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvertisementMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdvertisementMedia_advertisementId_sortOrder_idx"
  ON "AdvertisementMedia"("advertisementId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SpotlightMedia_spotlightId_fkey') THEN
    ALTER TABLE "SpotlightMedia"
      ADD CONSTRAINT "SpotlightMedia_spotlightId_fkey"
      FOREIGN KEY ("spotlightId") REFERENCES "SpotlightStay"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdvertisementMedia_advertisementId_fkey') THEN
    ALTER TABLE "AdvertisementMedia"
      ADD CONSTRAINT "AdvertisementMedia_advertisementId_fkey"
      FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
