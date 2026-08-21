-- Host-provided YouTube link for the listing's "Property video" area. Idempotent.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT;
