-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'HOST', 'ADMIN');

-- CreateEnum
CREATE TYPE "HostVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'PAYMENT_PENDING', 'CONFIRMED_DEPOSIT', 'BALANCE_DUE', 'CONFIRMED_PAID', 'CANCELLED', 'REFUNDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('FULL', 'DEPOSIT_50');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('NOT_ELIGIBLE', 'ELIGIBLE', 'SCHEDULED', 'PAID', 'ON_HOLD', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerEventType" AS ENUM ('PAYMENT_CAPTURED', 'REFUND_ISSUED', 'PAYOUT_SCHEDULED', 'PAYOUT_SENT', 'BALANCE_CARRY_FORWARD');

-- CreateTable
CREATE TABLE "User" (
    "id"            TEXT NOT NULL,
    "email"         TEXT NOT NULL,
    "passwordHash"  TEXT NOT NULL,
    "fullName"      TEXT NOT NULL,
    "role"          "UserRole" NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "refreshToken"  TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Host" (
    "id"                 TEXT NOT NULL,
    "userId"             TEXT NOT NULL,
    "verificationStatus" "HostVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "payoutAccountRef"   TEXT,
    "payoutEnabled"      BOOLEAN NOT NULL DEFAULT false,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id"              TEXT NOT NULL,
    "hostId"          TEXT NOT NULL,
    "createdById"     TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "city"            TEXT NOT NULL,
    "state"           TEXT NOT NULL,
    "country"         TEXT NOT NULL DEFAULT 'India',
    "timezone"        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status"          "ListingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "needsReapproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingMedia" (
    "id"        TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id"        TEXT NOT NULL,
    "category"  TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingTag" (
    "listingId" TEXT NOT NULL,
    "tagId"     TEXT NOT NULL,

    CONSTRAINT "ListingTag_pkey" PRIMARY KEY ("listingId","tagId")
);

-- CreateTable
CREATE TABLE "RateRule" (
    "id"              TEXT NOT NULL,
    "listingId"       TEXT NOT NULL,
    "baseNightlyRate" INTEGER NOT NULL,
    "cleaningFee"     INTEGER NOT NULL DEFAULT 0,
    "minNights"       INTEGER NOT NULL DEFAULT 1,
    "maxGuests"       INTEGER NOT NULL DEFAULT 2,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalRate" (
    "id"          TEXT NOT NULL,
    "listingId"   TEXT NOT NULL,
    "startsAt"    TIMESTAMP(3) NOT NULL,
    "endsAt"      TIMESTAMP(3) NOT NULL,
    "nightlyRate" INTEGER NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id"        TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "startsAt"  TIMESTAMP(3) NOT NULL,
    "endsAt"    TIMESTAMP(3) NOT NULL,
    "reason"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hold" (
    "id"             TEXT NOT NULL,
    "listingId"      TEXT NOT NULL,
    "guestId"        TEXT NOT NULL,
    "startsAt"       TIMESTAMP(3) NOT NULL,
    "endsAt"         TIMESTAMP(3) NOT NULL,
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "priceSnapshot"  JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id"            TEXT NOT NULL,
    "listingId"     TEXT NOT NULL,
    "guestId"       TEXT NOT NULL,
    "holdId"        TEXT NOT NULL,
    "status"        "BookingStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "plan"          "PaymentPlan" NOT NULL,
    "startsAt"      TIMESTAMP(3) NOT NULL,
    "endsAt"        TIMESTAMP(3) NOT NULL,
    "priceSnapshot" JSONB NOT NULL,
    "balanceDueAt"  TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id"               TEXT NOT NULL,
    "bookingId"        TEXT NOT NULL,
    "amount"           INTEGER NOT NULL,
    "type"             "PaymentPlan" NOT NULL,
    "status"           "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "gateway"          TEXT NOT NULL DEFAULT 'razorpay',
    "gatewayPaymentRef" TEXT,
    "gatewayOrderRef"  TEXT,
    "idempotencyKey"   TEXT NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id"               TEXT NOT NULL,
    "bookingId"        TEXT NOT NULL,
    "paymentId"        TEXT,
    "amount"           INTEGER NOT NULL,
    "reason"           TEXT NOT NULL,
    "gatewayRefundRef" TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLine" (
    "id"         TEXT NOT NULL,
    "hostId"     TEXT NOT NULL,
    "listingId"  TEXT NOT NULL,
    "bookingId"  TEXT NOT NULL,
    "amount"     INTEGER NOT NULL,
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "status"     "PayoutStatus" NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "batchId"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutBatch" (
    "id"          TEXT NOT NULL,
    "runDate"     TIMESTAMP(3) NOT NULL,
    "status"      "PayoutStatus" NOT NULL DEFAULT 'SCHEDULED',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id"           TEXT NOT NULL,
    "bookingId"    TEXT,
    "payoutLineId" TEXT,
    "type"         "LedgerEventType" NOT NULL,
    "amount"       INTEGER NOT NULL,
    "currency"     TEXT NOT NULL DEFAULT 'INR',
    "metadata"     JSONB NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id"           TEXT NOT NULL,
    "actorUserId"  TEXT,
    "action"       TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId"   TEXT NOT NULL,
    "metadata"     JSONB NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Host_userId_key" ON "Host"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_category_name_key" ON "Tag"("category", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Hold_idempotencyKey_key" ON "Hold"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_holdId_key" ON "Booking"("holdId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingMedia" ADD CONSTRAINT "ListingMedia_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTag" ADD CONSTRAINT "ListingTag_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTag" ADD CONSTRAINT "ListingTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRule" ADD CONSTRAINT "RateRule_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonalRate" ADD CONSTRAINT "SeasonalRate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "Hold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLine" ADD CONSTRAINT "PayoutLine_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLine" ADD CONSTRAINT "PayoutLine_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLine" ADD CONSTRAINT "PayoutLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
