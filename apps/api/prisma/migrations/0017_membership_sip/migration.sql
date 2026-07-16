-- Migration 0017_membership_sip
-- Phase 2 §5.13: Rewards & Membership tiers + Trip Savings SIP.
-- SIP contributions flow through CreditLedger so the same balance the guest spends
-- is the balance they save into — single source of truth.

-- ── Enums ─────────────────────────────────────────────────────────────────
CREATE TYPE "MemberTier" AS ENUM ('EXPLORER', 'WANDERER', 'SOJOURNER', 'PATRON', 'AMBASSADOR');
CREATE TYPE "SipStatus"  AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- ── Membership ────────────────────────────────────────────────────────────
CREATE TABLE "Membership" (
    "userId"     TEXT         NOT NULL,
    "tier"       "MemberTier" NOT NULL DEFAULT 'EXPLORER',
    "points"     INTEGER      NOT NULL DEFAULT 0,
    "tierSince"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextTierAt" INTEGER      NOT NULL DEFAULT 500,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "Membership_tier_idx" ON "Membership"("tier");

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TripSip ───────────────────────────────────────────────────────────────
CREATE TABLE "TripSip" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "monthlyMinor" INTEGER      NOT NULL,
    "anchorDay"    INTEGER      NOT NULL DEFAULT 1,
    "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt"     TIMESTAMP(3),
    "status"       "SipStatus"  NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "TripSip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripSip_userId_status_idx"     ON "TripSip"("userId", "status");
CREATE INDEX "TripSip_status_anchorDay_idx"  ON "TripSip"("status", "anchorDay");

ALTER TABLE "TripSip"
  ADD CONSTRAINT "TripSip_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- anchorDay must be a real day-of-month; clamp to 1..28 so February works.
ALTER TABLE "TripSip"
  ADD CONSTRAINT "TripSip_anchorDay_check"
  CHECK ("anchorDay" >= 1 AND "anchorDay" <= 28);

ALTER TABLE "TripSip"
  ADD CONSTRAINT "TripSip_monthlyMinor_check"
  CHECK ("monthlyMinor" > 0);

-- ── SipContribution ───────────────────────────────────────────────────────
-- 1:1 with a CreditLedger row — that row is the source of truth for the balance.
CREATE TABLE "SipContribution" (
    "id"            TEXT         NOT NULL,
    "sipId"         TEXT         NOT NULL,
    "amountMinor"   INTEGER      NOT NULL,
    "depositedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ledgerEventId" TEXT         NOT NULL,
    "paymentRef"    TEXT,
    CONSTRAINT "SipContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SipContribution_ledgerEventId_key" ON "SipContribution"("ledgerEventId");
CREATE INDEX "SipContribution_sipId_depositedAt_idx" ON "SipContribution"("sipId", "depositedAt");

ALTER TABLE "SipContribution"
  ADD CONSTRAINT "SipContribution_sipId_fkey"
  FOREIGN KEY ("sipId") REFERENCES "TripSip"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SipContribution"
  ADD CONSTRAINT "SipContribution_ledgerEventId_fkey"
  FOREIGN KEY ("ledgerEventId") REFERENCES "CreditLedger"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Perk ──────────────────────────────────────────────────────────────────
CREATE TABLE "Perk" (
    "id"          TEXT         NOT NULL,
    "tier"        "MemberTier" NOT NULL,
    "title"       TEXT         NOT NULL,
    "description" TEXT         NOT NULL,
    "active"      BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Perk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Perk_tier_active_idx" ON "Perk"("tier", "active");

-- ── Backfill Membership for every existing user ───────────────────────────
INSERT INTO "Membership" ("userId", "tier", "points", "tierSince", "nextTierAt", "updatedAt")
SELECT "id", 'EXPLORER', 0, CURRENT_TIMESTAMP, 500, CURRENT_TIMESTAMP FROM "User";

-- ── Seed default perks ────────────────────────────────────────────────────
INSERT INTO "Perk" ("id", "tier", "title", "description", "active", "createdAt", "updatedAt") VALUES
  ('seed_perk_explorer_welcome',  'EXPLORER',  'Welcome credit',           '₹100 credit on first booking',                   true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed_perk_wanderer_late',     'WANDERER',  'Late check-out',           'Complimentary 2-hour late check-out',            true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed_perk_sojourner_upgrade', 'SOJOURNER', 'Room upgrade',             'Free upgrade to next room category if available', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed_perk_patron_concierge',  'PATRON',    'Dedicated concierge',      'Personal concierge for trip planning',           true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed_perk_ambassador_invite', 'AMBASSADOR', 'Founders'' retreat invite', 'Annual invite to the founders'' retreat',     true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
