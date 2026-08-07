/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Itinerary` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Hold_listingId_expiresAt_idx";

-- DropIndex
DROP INDEX "Listing_dietaryOptions_idx";

-- DropIndex
DROP INDEX "Listing_experienceTags_idx";

-- DropIndex
DROP INDEX "Listing_latitude_longitude_idx";

-- DropIndex
DROP INDEX "Listing_propertyType_idx";

-- AlterTable
ALTER TABLE "AddOn" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BookingAddOn" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Itinerary" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Referral" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ServiceProvider" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StaffApplication" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Hold_listingId_idx" ON "Hold"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_idempotencyKey_key" ON "Itinerary"("idempotencyKey");
