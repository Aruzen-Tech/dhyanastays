-- Phase 3 §5.15 Experiences & events, §5.8 Group planning, §5.9 AI Itinerary

-- ─── Experience enums ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ExperienceStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExperienceBookingStatus" AS ENUM ('HELD','CONFIRMED','CANCELLED','REFUNDED','COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Experience table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Experience" (
  "id"           TEXT NOT NULL,
  "hostId"       TEXT NOT NULL,
  "createdById"  TEXT NOT NULL,
  "listingId"    TEXT,
  "title"        TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "city"         TEXT NOT NULL,
  "state"        TEXT NOT NULL,
  "country"      TEXT NOT NULL DEFAULT 'India',
  "latitude"     DOUBLE PRECISION,
  "longitude"    DOUBLE PRECISION,
  "startsAt"     TIMESTAMP(3) NOT NULL,
  "endsAt"       TIMESTAMP(3) NOT NULL,
  "capacity"     INTEGER NOT NULL,
  "priceMinor"   INTEGER NOT NULL,
  "currency"     TEXT NOT NULL DEFAULT 'INR',
  "status"       "ExperienceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "imageUrl"     TEXT,
  "reviewedBy"   TEXT,
  "reviewNotes"  TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Experience_status_startsAt_idx" ON "Experience"("status","startsAt");
CREATE INDEX IF NOT EXISTS "Experience_hostId_startsAt_idx" ON "Experience"("hostId","startsAt");
CREATE INDEX IF NOT EXISTS "Experience_city_state_startsAt_idx" ON "Experience"("city","state","startsAt");

DO $$ BEGIN
  ALTER TABLE "Experience" ADD CONSTRAINT "Experience_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Experience" ADD CONSTRAINT "Experience_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Experience" ADD CONSTRAINT "Experience_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ExperienceBooking table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExperienceBooking" (
  "id"             TEXT NOT NULL,
  "experienceId"   TEXT NOT NULL,
  "guestId"        TEXT NOT NULL,
  "seats"          INTEGER NOT NULL,
  "totalMinor"     INTEGER NOT NULL,
  "currency"       TEXT NOT NULL DEFAULT 'INR',
  "status"         "ExperienceBookingStatus" NOT NULL DEFAULT 'HELD',
  "paymentRef"     TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "cancelledAt"    TIMESTAMP(3),
  "refundedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExperienceBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExperienceBooking_idempotencyKey_key" ON "ExperienceBooking"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "ExperienceBooking_experienceId_status_idx" ON "ExperienceBooking"("experienceId","status");
CREATE INDEX IF NOT EXISTS "ExperienceBooking_guestId_createdAt_idx" ON "ExperienceBooking"("guestId","createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "ExperienceBooking" ADD CONSTRAINT "ExperienceBooking_experienceId_fkey"
    FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExperienceBooking" ADD CONSTRAINT "ExperienceBooking_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Group planning enums ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TripGroupRole" AS ENUM ('OWNER','MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TripGroupInviteStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseSplitMethod" AS ENUM ('EQUAL','CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TripGroup tables ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TripGroup" (
  "id"          TEXT NOT NULL,
  "ownerId"     TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "destination" TEXT,
  "startsAt"    TIMESTAMP(3),
  "endsAt"      TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TripGroup_ownerId_idx" ON "TripGroup"("ownerId");

DO $$ BEGIN
  ALTER TABLE "TripGroup" ADD CONSTRAINT "TripGroup_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TripGroupMember" (
  "id"         TEXT NOT NULL,
  "groupId"    TEXT NOT NULL,
  "userId"     TEXT,
  "email"      TEXT NOT NULL,
  "fullName"   TEXT NOT NULL,
  "role"       "TripGroupRole" NOT NULL DEFAULT 'MEMBER',
  "status"     "TripGroupInviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "TripGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TripGroupMember_groupId_email_key" ON "TripGroupMember"("groupId","email");
CREATE INDEX IF NOT EXISTS "TripGroupMember_userId_idx" ON "TripGroupMember"("userId");

DO $$ BEGIN
  ALTER TABLE "TripGroupMember" ADD CONSTRAINT "TripGroupMember_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "TripGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TripGroupMember" ADD CONSTRAINT "TripGroupMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ExpenseSplit tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExpenseSplit" (
  "id"          TEXT NOT NULL,
  "groupId"     TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "totalMinor"  INTEGER NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'INR',
  "method"      "ExpenseSplitMethod" NOT NULL DEFAULT 'EQUAL',
  "notes"       TEXT,
  "incurredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExpenseSplit_groupId_incurredAt_idx" ON "ExpenseSplit"("groupId","incurredAt" DESC);

DO $$ BEGIN
  ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "TripGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ExpenseSplitShare" (
  "id"          TEXT NOT NULL,
  "expenseId"   TEXT NOT NULL,
  "memberId"    TEXT NOT NULL,
  "userId"      TEXT,
  "amountMinor" INTEGER NOT NULL,
  "settledAt"   TIMESTAMP(3),
  CONSTRAINT "ExpenseSplitShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseSplitShare_expenseId_memberId_key" ON "ExpenseSplitShare"("expenseId","memberId");
CREATE INDEX IF NOT EXISTS "ExpenseSplitShare_userId_idx" ON "ExpenseSplitShare"("userId");

DO $$ BEGIN
  ALTER TABLE "ExpenseSplitShare" ADD CONSTRAINT "ExpenseSplitShare_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "ExpenseSplit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExpenseSplitShare" ADD CONSTRAINT "ExpenseSplitShare_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "TripGroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ExpenseSplitShare" ADD CONSTRAINT "ExpenseSplitShare_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Itinerary ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ItineraryStatus" AS ENUM ('DRAFT','GENERATED','FINALIZED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Itinerary" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "listingId"   TEXT,
  "destination" TEXT NOT NULL,
  "startsAt"    TIMESTAMP(3) NOT NULL,
  "endsAt"      TIMESTAMP(3) NOT NULL,
  "travelers"   INTEGER NOT NULL DEFAULT 2,
  "interests"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "budgetMinor" INTEGER,
  "status"      "ItineraryStatus" NOT NULL DEFAULT 'DRAFT',
  "summary"     TEXT,
  "days"        JSONB,
  "model"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Itinerary_userId_createdAt_idx" ON "Itinerary"("userId","createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
