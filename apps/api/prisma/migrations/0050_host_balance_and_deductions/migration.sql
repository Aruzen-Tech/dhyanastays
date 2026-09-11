-- Host balance ledger (debt netting) + per-payout deduction breakdown. Idempotent.

DO $$ BEGIN
  CREATE TYPE "HostBalanceEntryType" AS ENUM ('DEBT', 'RECOVERY', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "HostBalanceEntry" (
  "id"           TEXT NOT NULL,
  "hostId"       TEXT NOT NULL,
  "type"         "HostBalanceEntryType" NOT NULL,
  "amount"       INTEGER NOT NULL,
  "reason"       TEXT NOT NULL,
  "bookingId"    TEXT,
  "payoutLineId" TEXT,
  "createdById"  TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostBalanceEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HostBalanceEntry_hostId_createdAt_idx"
  ON "HostBalanceEntry" ("hostId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "HostBalanceEntry"
    ADD CONSTRAINT "HostBalanceEntry_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Deduction breakdown on each payout line (paise).
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "tdsAmount"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "tcsAmount"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "nettedAmount"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "transferAmount" INTEGER;
