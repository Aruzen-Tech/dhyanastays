-- Host-provided Instagram reel/post link — alternative cover video. Idempotent.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;
