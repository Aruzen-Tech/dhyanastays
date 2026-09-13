-- Payout hardening: bind each line to its funding capture, make orphaned
-- transfer claims recoverable, and make reversals idempotent. Idempotent.

-- A DEPOSIT_50 booking creates one payout line per capture. A Route transfer
-- can only be split from the payment it belongs to, so the line must record
-- which capture funds it rather than guessing "the latest one".
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "paymentId"   TEXT;

-- Set when the transfer claim is taken. A claim with no transferId that is
-- older than the sweep window was orphaned by a crash between the Route call
-- succeeding and the id being persisted.
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "claimedAt"   TIMESTAMP(3);

-- Last gateway refund id already reversed, so a redelivered refund webhook
-- cannot claw the money back twice.
ALTER TABLE "PayoutLine" ADD COLUMN IF NOT EXISTS "reversalRef" TEXT;

CREATE INDEX IF NOT EXISTS "PayoutLine_claimedAt_idx"
  ON "PayoutLine" ("claimedAt");
