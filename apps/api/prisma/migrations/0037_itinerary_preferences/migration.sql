-- Persist optional AI Trip Planner preferences on generated itineraries.
-- Idempotent per repository convention.

ALTER TABLE "Itinerary"
  ADD COLUMN IF NOT EXISTS "travelStyle" TEXT,
  ADD COLUMN IF NOT EXISTS "pace" TEXT,
  ADD COLUMN IF NOT EXISTS "dietaryRequirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "accessibilityNeeds" TEXT,
  ADD COLUMN IF NOT EXISTS "accommodationPreference" TEXT,
  ADD COLUMN IF NOT EXISTS "transportPreference" TEXT,
  ADD COLUMN IF NOT EXISTS "activityIntensity" TEXT,
  ADD COLUMN IF NOT EXISTS "specialRequests" TEXT;
