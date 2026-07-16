-- §5.14 Investor Dashboard
-- Adds Investment, Distribution, CapitalCall, InvestorDocument tables.

-- Enums ----------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "DistributionStatus" AS ENUM ('CALCULATED', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CapitalCallStatus" AS ENUM ('OPEN', 'FUNDED', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvestorDocumentKind" AS ENUM ('AGREEMENT', 'KYC', 'TAX_FORM', 'STATEMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Investment -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Investment" (
  "id"             TEXT NOT NULL,
  "investorUserId" TEXT NOT NULL,
  "listingId"      TEXT NOT NULL,
  "sharePct"       DECIMAL(5, 4) NOT NULL,
  "effectiveAt"    TIMESTAMP(3) NOT NULL,
  "endedAt"        TIMESTAMP(3),
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Investment_investorUserId_idx" ON "Investment"("investorUserId");
CREATE INDEX IF NOT EXISTS "Investment_listingId_idx" ON "Investment"("listingId");
CREATE INDEX IF NOT EXISTS "Investment_investorUserId_endedAt_idx" ON "Investment"("investorUserId", "endedAt");

ALTER TABLE "Investment"
  ADD CONSTRAINT "Investment_investorUserId_fkey"
  FOREIGN KEY ("investorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Investment"
  ADD CONSTRAINT "Investment_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Distribution ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Distribution" (
  "id"             TEXT NOT NULL,
  "investorUserId" TEXT NOT NULL,
  "period"         TEXT NOT NULL,
  "amountMinor"    INTEGER NOT NULL,
  "currency"       TEXT NOT NULL DEFAULT 'INR',
  "status"         "DistributionStatus" NOT NULL DEFAULT 'CALCULATED',
  "breakdown"      JSONB,
  "ledgerEventId"  TEXT,
  "computedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt"         TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Distribution_investorUserId_period_key"
  ON "Distribution"("investorUserId", "period");
CREATE INDEX IF NOT EXISTS "Distribution_period_idx" ON "Distribution"("period");
CREATE INDEX IF NOT EXISTS "Distribution_status_computedAt_idx" ON "Distribution"("status", "computedAt");

ALTER TABLE "Distribution"
  ADD CONSTRAINT "Distribution_investorUserId_fkey"
  FOREIGN KEY ("investorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CapitalCall ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "CapitalCall" (
  "id"          TEXT NOT NULL,
  "listingId"   TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "reason"      TEXT NOT NULL,
  "dueAt"       TIMESTAMP(3) NOT NULL,
  "status"      "CapitalCallStatus" NOT NULL DEFAULT 'OPEN',
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CapitalCall_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CapitalCall_listingId_status_idx" ON "CapitalCall"("listingId", "status");
CREATE INDEX IF NOT EXISTS "CapitalCall_status_dueAt_idx" ON "CapitalCall"("status", "dueAt");

ALTER TABLE "CapitalCall"
  ADD CONSTRAINT "CapitalCall_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- InvestorDocument -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS "InvestorDocument" (
  "id"             TEXT NOT NULL,
  "investorUserId" TEXT NOT NULL,
  "kind"           "InvestorDocumentKind" NOT NULL,
  "title"          TEXT NOT NULL,
  "url"            TEXT NOT NULL,
  "uploadedById"   TEXT NOT NULL,
  "uploadedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvestorDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvestorDocument_investorUserId_kind_idx"
  ON "InvestorDocument"("investorUserId", "kind");
CREATE INDEX IF NOT EXISTS "InvestorDocument_investorUserId_uploadedAt_idx"
  ON "InvestorDocument"("investorUserId", "uploadedAt" DESC);

ALTER TABLE "InvestorDocument"
  ADD CONSTRAINT "InvestorDocument_investorUserId_fkey"
  FOREIGN KEY ("investorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvestorDocument"
  ADD CONSTRAINT "InvestorDocument_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
