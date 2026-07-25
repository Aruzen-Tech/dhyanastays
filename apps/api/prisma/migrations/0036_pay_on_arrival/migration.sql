-- Pay-on-arrival: host opt-in flag + a new payment plan value.
-- Idempotent per repo convention (safe to re-run).

-- Host opt-in: guests may reserve now and pay the full amount at the property.
ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "payOnArrivalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- New PaymentPlan enum value. PG 12+ allows ADD VALUE inside a transaction;
-- IF NOT EXISTS makes it idempotent.
ALTER TYPE "PaymentPlan" ADD VALUE IF NOT EXISTS 'PAY_ON_ARRIVAL';
