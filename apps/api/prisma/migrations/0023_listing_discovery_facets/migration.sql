-- Listing discovery facets (§5.18)

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "experienceTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "propertyType" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dietaryOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "Listing_propertyType_idx" ON "Listing"("propertyType");
CREATE INDEX IF NOT EXISTS "Listing_experienceTags_idx" ON "Listing" USING GIN ("experienceTags");
CREATE INDEX IF NOT EXISTS "Listing_dietaryOptions_idx" ON "Listing" USING GIN ("dietaryOptions");
