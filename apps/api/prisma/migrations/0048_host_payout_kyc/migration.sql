-- Host payout account + KYC capture, and payout hold plumbing (RBI PA/PG
-- readiness). Idempotent.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PayoutMethod" AS ENUM ('BANK_ACCOUNT', 'UPI');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutAccountStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Host: administrative payout hold ─────────────────────────────────────────
ALTER TABLE "Host" ADD COLUMN IF NOT EXISTS "payoutsBlockedReason" TEXT;

-- ── PayoutLine: why a line is ON_HOLD ────────────────────────────────────────
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "holdReason" TEXT;

-- ── HostPayoutAccount ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HostPayoutAccount" (
  "id"                  TEXT NOT NULL,
  "hostId"              TEXT NOT NULL,
  "method"              "PayoutMethod" NOT NULL,
  "legalName"           TEXT NOT NULL,
  "bankName"            TEXT,
  "ifsc"                TEXT,
  "accountLast4"        TEXT,
  "accountEnc"          TEXT,
  "upiVpa"              TEXT,
  "panLast4"            TEXT,
  "panEnc"              TEXT,
  "fingerprint"         TEXT,
  "status"              "PayoutAccountStatus" NOT NULL DEFAULT 'SUBMITTED',
  "rejectionReason"     TEXT,
  "verifiedAt"          TIMESTAMP(3),
  "verifiedById"        TEXT,
  "linkedAccountId"     TEXT,
  "linkedAccountStatus" TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostPayoutAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HostPayoutAccount_hostId_key"
  ON "HostPayoutAccount" ("hostId");
CREATE INDEX IF NOT EXISTS "HostPayoutAccount_status_idx"
  ON "HostPayoutAccount" ("status");
CREATE INDEX IF NOT EXISTS "HostPayoutAccount_fingerprint_idx"
  ON "HostPayoutAccount" ("fingerprint");

DO $$ BEGIN
  ALTER TABLE "HostPayoutAccount"
    ADD CONSTRAINT "HostPayoutAccount_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
