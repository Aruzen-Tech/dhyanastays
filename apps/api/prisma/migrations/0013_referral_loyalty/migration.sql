-- Migration: 0013_referral_loyalty
-- Adds referral code to User, Referral table, and CreditLedger table

-- User.referralCode
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- ReferralStatus enum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SIGNED_UP', 'FIRST_BOOKING', 'CREDITED');

-- Referral table
CREATE TABLE "Referral" (
  "id"             TEXT NOT NULL,
  "referrerId"     TEXT NOT NULL,
  "referredUserId" TEXT,
  "referralCode"   TEXT NOT NULL,
  "status"         "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "referrerCredit" INTEGER NOT NULL DEFAULT 0,
  "referredCredit" INTEGER NOT NULL DEFAULT 0,
  "creditedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Referral_referralCode_key" ON "Referral"("referralCode");
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_referredUserId_fkey"
    FOREIGN KEY ("referredUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreditLedger table
CREATE TABLE "CreditLedger" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "amount"      INTEGER NOT NULL,
  "reason"      TEXT NOT NULL,
  "referenceId" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt");

ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
