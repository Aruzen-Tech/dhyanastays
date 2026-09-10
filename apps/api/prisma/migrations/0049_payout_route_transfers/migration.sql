-- Route settlement linkage on PayoutLine (payment-aggregator escrow). Idempotent.
--
-- `transferId` is UNIQUE so a retried transfer job can never create a second
-- transfer for the same payout line (i.e. never double-pay a host).

ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "transferId"      TEXT;
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "transferStatus"  TEXT;
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "transferFailure" TEXT;
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "settledAt"       TIMESTAMP(3);
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "reversedAmount"  INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "PayoutLine_transferId_key"
  ON "PayoutLine" ("transferId");
CREATE INDEX IF NOT EXISTS "PayoutLine_transferStatus_idx"
  ON "PayoutLine" ("transferStatus");
