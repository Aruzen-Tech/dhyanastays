-- Influencer Dashboard backend — domain foundation (docx-driven)
-- Additive only: new enums, new tables, new indexes, new foreign keys.
-- Touches no existing table other than a read-only FK reference to "User".
-- Idempotent per repo convention (safe to re-run).

-- ─── UserRole enum extension ───────────────────────────────────────────────
-- PG 12+ allows ADD VALUE inside a transaction; IF NOT EXISTS makes it idempotent.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'INFLUENCER';

-- ─── Influencer enums ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "InfluencerVerificationStatus" AS ENUM ('APPLIED','UNDER_REVIEW','APPROVED','ACTIVE','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerCampaignStatus" AS ENUM ('DRAFT','AVAILABLE','ACTIVE','COMPLETED','ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerCampaignApplicationStatus" AS ENUM ('INVITED','APPLIED','APPROVED','REJECTED','ASSIGNED','COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerContentType" AS ENUM ('INSTAGRAM_POST','REEL','YOUTUBE_VIDEO','STORY','BLOG','PHOTOGRAPHS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerContentStatus" AS ENUM ('DRAFT','SUBMITTED','REVIEW','APPROVED','PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerTrackingLinkType" AS ENUM ('GENERAL','PROPERTY','EXPERIENCE','DESTINATION','CAMPAIGN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerCommissionRuleType" AS ENUM ('PERCENTAGE','FIXED_AMOUNT','CAMPAIGN_BASED','PERFORMANCE_TIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerCommissionStatus" AS ENUM ('PENDING','APPROVED','PAID','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InfluencerPayoutStatus" AS ENUM ('PENDING','APPROVED','PROCESSING','PAID','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerProfile ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerProfile" (
  "id"                      TEXT NOT NULL,
  "userId"                  TEXT NOT NULL,
  "creatorName"             TEXT,
  "bio"                     TEXT,
  "socialLinks"             JSONB NOT NULL DEFAULT '{}',
  "location"                TEXT,
  "contentCategories"       TEXT[] DEFAULT ARRAY[]::TEXT[],
  "languages"               TEXT[] DEFAULT ARRAY[]::TEXT[],
  "audienceLocation"        JSONB,
  "audienceSize"            INTEGER,
  "verificationStatus"      "InfluencerVerificationStatus" NOT NULL DEFAULT 'APPLIED',
  "adminComments"           TEXT,
  "payoutAccountRef"        TEXT,
  "payoutEnabled"           BOOLEAN NOT NULL DEFAULT false,
  "minPayoutThresholdMinor" INTEGER NOT NULL DEFAULT 100000,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerProfile_userId_key" ON "InfluencerProfile"("userId");

DO $$ BEGIN
  ALTER TABLE "InfluencerProfile" ADD CONSTRAINT "InfluencerProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerCampaign ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerCampaign" (
  "id"                   TEXT NOT NULL,
  "title"                TEXT NOT NULL,
  "brief"                TEXT NOT NULL,
  "destination"          TEXT,
  "targetListingId"      TEXT,
  "targetExperienceId"   TEXT,
  "promotionalOffer"     JSONB,
  "requiredContentTypes" "InfluencerContentType"[] DEFAULT ARRAY[]::"InfluencerContentType"[],
  "deadline"             TIMESTAMP(3),
  "status"               "InfluencerCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById"          TEXT NOT NULL,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerCampaign_pkey" PRIMARY KEY ("id")
);
-- targetListingId/targetExperienceId are plain columns, no FK — kept out of scope on purpose.

CREATE INDEX IF NOT EXISTS "InfluencerCampaign_status_idx" ON "InfluencerCampaign"("status");

-- ─── InfluencerCampaignApplication ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerCampaignApplication" (
  "id"           TEXT NOT NULL,
  "campaignId"   TEXT NOT NULL,
  "influencerId" TEXT NOT NULL,
  "status"       "InfluencerCampaignApplicationStatus" NOT NULL DEFAULT 'APPLIED',
  "appliedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"   TIMESTAMP(3),
  "reviewedBy"   TEXT,
  "reviewNotes"  TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerCampaignApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerCampaignApplication_campaignId_influencerId_key"
  ON "InfluencerCampaignApplication"("campaignId","influencerId");
CREATE INDEX IF NOT EXISTS "InfluencerCampaignApplication_influencerId_status_idx"
  ON "InfluencerCampaignApplication"("influencerId","status");

DO $$ BEGIN
  ALTER TABLE "InfluencerCampaignApplication" ADD CONSTRAINT "InfluencerCampaignApplication_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerCampaignApplication" ADD CONSTRAINT "InfluencerCampaignApplication_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerContent ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerContent" (
  "id"            TEXT NOT NULL,
  "influencerId"  TEXT NOT NULL,
  "campaignId"    TEXT,
  "type"          "InfluencerContentType" NOT NULL,
  "url"           TEXT NOT NULL,
  "caption"       TEXT,
  "status"        "InfluencerContentStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt"   TIMESTAMP(3),
  "reviewedAt"    TIMESTAMP(3),
  "reviewedBy"    TEXT,
  "revisionNotes" TEXT,
  "publishedAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerContent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InfluencerContent_influencerId_status_idx" ON "InfluencerContent"("influencerId","status");

DO $$ BEGIN
  ALTER TABLE "InfluencerContent" ADD CONSTRAINT "InfluencerContent_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerContent" ADD CONSTRAINT "InfluencerContent_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerPromoCode ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerPromoCode" (
  "id"           TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "influencerId" TEXT NOT NULL,
  "campaignId"   TEXT,
  "discountBps"  INTEGER,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "validFrom"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerPromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerPromoCode_code_key" ON "InfluencerPromoCode"("code");
CREATE INDEX IF NOT EXISTS "InfluencerPromoCode_influencerId_idx" ON "InfluencerPromoCode"("influencerId");

DO $$ BEGIN
  ALTER TABLE "InfluencerPromoCode" ADD CONSTRAINT "InfluencerPromoCode_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerPromoCode" ADD CONSTRAINT "InfluencerPromoCode_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerTrackingLink ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerTrackingLink" (
  "id"                 TEXT NOT NULL,
  "slug"               TEXT NOT NULL,
  "influencerId"       TEXT NOT NULL,
  "type"               "InfluencerTrackingLinkType" NOT NULL,
  "targetListingId"    TEXT,
  "targetExperienceId" TEXT,
  "destination"        TEXT,
  "campaignId"         TEXT,
  "qrCodeUrl"          TEXT,
  "clickCount"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InfluencerTrackingLink_pkey" PRIMARY KEY ("id")
);
-- targetListingId/targetExperienceId are plain columns, no FK — kept out of scope on purpose.

CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerTrackingLink_slug_key" ON "InfluencerTrackingLink"("slug");
CREATE INDEX IF NOT EXISTS "InfluencerTrackingLink_influencerId_idx" ON "InfluencerTrackingLink"("influencerId");

DO $$ BEGIN
  ALTER TABLE "InfluencerTrackingLink" ADD CONSTRAINT "InfluencerTrackingLink_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerTrackingLink" ADD CONSTRAINT "InfluencerTrackingLink_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerLinkClick ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerLinkClick" (
  "id"             TEXT NOT NULL,
  "trackingLinkId" TEXT NOT NULL,
  "occurredAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash"         TEXT,
  "userAgent"      TEXT,
  CONSTRAINT "InfluencerLinkClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InfluencerLinkClick_trackingLinkId_occurredAt_idx"
  ON "InfluencerLinkClick"("trackingLinkId","occurredAt");

DO $$ BEGIN
  ALTER TABLE "InfluencerLinkClick" ADD CONSTRAINT "InfluencerLinkClick_trackingLinkId_fkey"
    FOREIGN KEY ("trackingLinkId") REFERENCES "InfluencerTrackingLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerBookingAttribution ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerBookingAttribution" (
  "id"                TEXT NOT NULL,
  "bookingId"         TEXT NOT NULL,
  "listingId"         TEXT,
  "influencerId"      TEXT NOT NULL,
  "promoCodeId"       TEXT,
  "trackingLinkId"    TEXT,
  "bookingValueMinor" INTEGER NOT NULL,
  "travelStartsAt"    TIMESTAMP(3) NOT NULL,
  "travelEndsAt"      TIMESTAMP(3) NOT NULL,
  "attributedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InfluencerBookingAttribution_pkey" PRIMARY KEY ("id")
);
-- bookingId/listingId are plain columns, no FK — kept out of scope on purpose.

CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerBookingAttribution_bookingId_key" ON "InfluencerBookingAttribution"("bookingId");
CREATE INDEX IF NOT EXISTS "InfluencerBookingAttribution_influencerId_attributedAt_idx"
  ON "InfluencerBookingAttribution"("influencerId","attributedAt");

DO $$ BEGIN
  ALTER TABLE "InfluencerBookingAttribution" ADD CONSTRAINT "InfluencerBookingAttribution_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerBookingAttribution" ADD CONSTRAINT "InfluencerBookingAttribution_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "InfluencerPromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerBookingAttribution" ADD CONSTRAINT "InfluencerBookingAttribution_trackingLinkId_fkey"
    FOREIGN KEY ("trackingLinkId") REFERENCES "InfluencerTrackingLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerCommissionRule ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerCommissionRule" (
  "id"               TEXT NOT NULL,
  "type"             "InfluencerCommissionRuleType" NOT NULL,
  "percentageBps"    INTEGER,
  "fixedAmountMinor" INTEGER,
  "tierConfig"       JSONB,
  "campaignId"       TEXT,
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "createdById"      TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerCommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InfluencerCommissionRule_isActive_idx" ON "InfluencerCommissionRule"("isActive");

DO $$ BEGIN
  ALTER TABLE "InfluencerCommissionRule" ADD CONSTRAINT "InfluencerCommissionRule_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerCommission ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerCommission" (
  "id"                   TEXT NOT NULL,
  "influencerId"         TEXT NOT NULL,
  "bookingAttributionId" TEXT NOT NULL,
  "ruleId"               TEXT NOT NULL,
  "amountMinor"          INTEGER NOT NULL,
  "status"               "InfluencerCommissionStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt"           TIMESTAMP(3),
  "paidAt"               TIMESTAMP(3),
  "cancelledReason"      TEXT,
  "payoutId"             TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerCommission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InfluencerCommission_bookingAttributionId_key" ON "InfluencerCommission"("bookingAttributionId");
CREATE INDEX IF NOT EXISTS "InfluencerCommission_influencerId_status_idx" ON "InfluencerCommission"("influencerId","status");

DO $$ BEGIN
  ALTER TABLE "InfluencerCommission" ADD CONSTRAINT "InfluencerCommission_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerCommission" ADD CONSTRAINT "InfluencerCommission_bookingAttributionId_fkey"
    FOREIGN KEY ("bookingAttributionId") REFERENCES "InfluencerBookingAttribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InfluencerCommission" ADD CONSTRAINT "InfluencerCommission_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "InfluencerCommissionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerPayout ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "InfluencerPayout" (
  "id"               TEXT NOT NULL,
  "influencerId"     TEXT NOT NULL,
  "amountMinor"      INTEGER NOT NULL,
  "status"           "InfluencerPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt"       TIMESTAMP(3),
  "processedAt"      TIMESTAMP(3),
  "paidAt"           TIMESTAMP(3),
  "failureReason"    TEXT,
  "payoutAccountRef" TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InfluencerPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InfluencerPayout_influencerId_status_idx" ON "InfluencerPayout"("influencerId","status");

DO $$ BEGIN
  ALTER TABLE "InfluencerPayout" ADD CONSTRAINT "InfluencerPayout_influencerId_fkey"
    FOREIGN KEY ("influencerId") REFERENCES "InfluencerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── InfluencerCommission.payoutId FK ────────────────────────────────────────
-- Deferred to the end since it forward-references InfluencerPayout, created above.
DO $$ BEGIN
  ALTER TABLE "InfluencerCommission" ADD CONSTRAINT "InfluencerCommission_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "InfluencerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
