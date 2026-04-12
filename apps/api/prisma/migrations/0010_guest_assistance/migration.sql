-- Guest Assistance Hub: directions, manual, issues, check-in/out

-- Listing JSON fields for directions & manual
ALTER TABLE "Listing" ADD COLUMN "propertyDirections" JSONB;
ALTER TABLE "Listing" ADD COLUMN "propertyManual" JSONB;

-- Booking JSON fields for check-in/out
ALTER TABLE "Booking" ADD COLUMN "checkInData" JSONB;
ALTER TABLE "Booking" ADD COLUMN "checkOutData" JSONB;

-- Issue enums
CREATE TYPE "IssueCategory" AS ENUM ('MAINTENANCE', 'CLEANLINESS', 'NOISE', 'SAFETY', 'OTHER');
CREATE TYPE "IssueUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- GuestIssue table
CREATE TABLE "GuestIssue" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "IssueUrgency" NOT NULL DEFAULT 'MEDIUM',
    "photoUrl" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "hostNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestIssue_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "GuestIssue_bookingId_idx" ON "GuestIssue"("bookingId");
CREATE INDEX "GuestIssue_listingId_status_idx" ON "GuestIssue"("listingId", "status");
CREATE INDEX "GuestIssue_guestId_idx" ON "GuestIssue"("guestId");
CREATE INDEX "GuestIssue_status_createdAt_idx" ON "GuestIssue"("status", "createdAt");

-- Foreign keys
ALTER TABLE "GuestIssue" ADD CONSTRAINT "GuestIssue_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuestIssue" ADD CONSTRAINT "GuestIssue_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuestIssue" ADD CONSTRAINT "GuestIssue_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
