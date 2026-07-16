-- 0018_pay_later
-- Pay Later instalments (Phase 2 §5.6).
-- Extends the booking engine with 3/6/12-month instalment plans. First
-- instalment is the booking deposit; subsequent instalments are charged on
-- their dueAt. Plan status is tracked independently from booking status so
-- the existing BALANCE_DUE flow for DEPOSIT_50 bookings is unaffected.

-- 1. Extend PaymentPlan enum with PAY_LATER
ALTER TYPE "PaymentPlan" ADD VALUE IF NOT EXISTS 'PAY_LATER';

-- 1b. Booking.payLaterMonths — chosen at booking time, used to drive the
-- schedule generated on first-instalment capture.
ALTER TABLE "Booking" ADD COLUMN "payLaterMonths" INTEGER;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_payLaterMonths_check"
  CHECK ("payLaterMonths" IS NULL OR "payLaterMonths" IN (3, 6, 12));

-- 1c. Payment.payLaterSeq — links a Payment row to a specific instalment.
ALTER TABLE "Payment" ADD COLUMN "payLaterSeq" INTEGER;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payLaterSeq_check"
  CHECK ("payLaterSeq" IS NULL OR "payLaterSeq" >= 1);

-- 2. PayLaterStatus enum
DO $$ BEGIN
  CREATE TYPE "PayLaterStatus" AS ENUM ('SCHEDULED','OVERDUE','DEFAULTED','COMPLETED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. PayLaterPlan: one per booking
CREATE TABLE "PayLaterPlan" (
  "id"         TEXT             NOT NULL,
  "bookingId"  TEXT             NOT NULL,
  "months"     INTEGER          NOT NULL,
  "totalMinor" INTEGER          NOT NULL,
  "status"     "PayLaterStatus" NOT NULL DEFAULT 'SCHEDULED',
  "currency"   TEXT             NOT NULL DEFAULT 'INR',
  "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "PayLaterPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayLaterPlan_months_check" CHECK ("months" IN (3, 6, 12)),
  CONSTRAINT "PayLaterPlan_totalMinor_check" CHECK ("totalMinor" > 0)
);

CREATE UNIQUE INDEX "PayLaterPlan_bookingId_key" ON "PayLaterPlan"("bookingId");
CREATE INDEX "PayLaterPlan_status_createdAt_idx" ON "PayLaterPlan"("status","createdAt");

ALTER TABLE "PayLaterPlan"
  ADD CONSTRAINT "PayLaterPlan_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. PayLaterInstalment: N per plan
CREATE TABLE "PayLaterInstalment" (
  "id"             TEXT         NOT NULL,
  "planId"         TEXT         NOT NULL,
  "seq"            INTEGER      NOT NULL,
  "amountMinor"    INTEGER      NOT NULL,
  "dueAt"          TIMESTAMP(3) NOT NULL,
  "paidAt"         TIMESTAMP(3),
  "paymentId"      TEXT,
  "remindersSent"  INTEGER      NOT NULL DEFAULT 0,
  "lastReminderAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayLaterInstalment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayLaterInstalment_seq_check" CHECK ("seq" >= 1),
  CONSTRAINT "PayLaterInstalment_amountMinor_check" CHECK ("amountMinor" > 0)
);

CREATE UNIQUE INDEX "PayLaterInstalment_planId_seq_key" ON "PayLaterInstalment"("planId","seq");
CREATE UNIQUE INDEX "PayLaterInstalment_paymentId_key" ON "PayLaterInstalment"("paymentId");
CREATE INDEX "PayLaterInstalment_dueAt_paidAt_idx" ON "PayLaterInstalment"("dueAt","paidAt");

ALTER TABLE "PayLaterInstalment"
  ADD CONSTRAINT "PayLaterInstalment_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "PayLaterPlan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayLaterInstalment"
  ADD CONSTRAINT "PayLaterInstalment_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
