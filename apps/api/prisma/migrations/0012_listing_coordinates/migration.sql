-- Add latitude/longitude columns to Listing for map-based filtering
ALTER TABLE "Listing" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Index for bounding-box geo queries
CREATE INDEX "Listing_latitude_longitude_idx" ON "Listing"("latitude", "longitude");
