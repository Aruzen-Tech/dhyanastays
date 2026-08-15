-- Experience media/detail fields for the frontend Experience Details page:
-- gallery (additional photos), video (single video URL), included (what's included list).
-- Additive only, defaulted/nullable so existing rows remain valid with no backfill.
-- Idempotent per repo convention (safe to re-run).

ALTER TABLE "Experience"
  ADD COLUMN IF NOT EXISTS "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "video" TEXT,
  ADD COLUMN IF NOT EXISTS "included" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
