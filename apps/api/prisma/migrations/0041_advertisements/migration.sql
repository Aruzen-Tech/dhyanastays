-- Advertisement Centre: admin-authored Explore-page popups. Idempotent.

CREATE TABLE IF NOT EXISTS "Advertisement" (
  "id"              TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "body"            TEXT,
  "imageUrl"        TEXT,
  "ctaLabel"        TEXT,
  "ctaHref"         TEXT,
  "placement"       TEXT NOT NULL DEFAULT 'explore_billboard',
  "frequency"       TEXT NOT NULL DEFAULT 'session',
  "accentColor"     TEXT,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "startsAt"        TIMESTAMP(3),
  "endsAt"          TIMESTAMP(3),
  "priority"        INTEGER NOT NULL DEFAULT 0,
  "impressionCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount"      INTEGER NOT NULL DEFAULT 0,
  "createdById"     TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Advertisement_placement_isActive_priority_idx"
  ON "Advertisement"("placement", "isActive", "priority");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Advertisement_createdById_fkey'
  ) THEN
    ALTER TABLE "Advertisement"
      ADD CONSTRAINT "Advertisement_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
