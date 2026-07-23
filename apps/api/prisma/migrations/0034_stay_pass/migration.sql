-- Stay Pass module — themed tickets, signed-QR check-in, Stay Passport.
-- Idempotent (IF NOT EXISTS + guarded enum/FK) per repo convention, so it is a
-- safe no-op on any DB that already has parts of it.

-- ── Booking sub-state: CHECKED_IN (between CONFIRMED_PAID and COMPLETED) ──────
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';

-- ── Ticket render status ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('PENDING','RENDERED','FAILED','VOIDED','COMMEMORATIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Listing → theme reference ────────────────────────────────────────────────
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "stayThemeId" TEXT;

-- ── StayTheme ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StayTheme" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tokens" JSONB NOT NULL,
    "assets" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StayTheme_pkey" PRIMARY KEY ("id")
);

-- ── TicketEdition ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TicketEdition" (
    "id" TEXT NOT NULL,
    "themeOverlay" JSONB NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "scope" JSONB,
    "maxIssue" INTEGER,
    "issuedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketEdition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TicketEdition_windowStart_windowEnd_idx" ON "TicketEdition"("windowStart", "windowEnd");

-- ── Ticket ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "themeVersion" INTEGER NOT NULL,
    "editionId" TEXT,
    "editionSerial" INTEGER,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "assets" JSONB NOT NULL DEFAULT '{}',
    "qrJti" TEXT NOT NULL,
    "qrRevoked" BOOLEAN NOT NULL DEFAULT false,
    "wallet" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_bookingId_key" ON "Ticket"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_qrJti_key" ON "Ticket"("qrJti");
CREATE INDEX IF NOT EXISTS "Ticket_themeId_idx" ON "Ticket"("themeId");

-- ── CheckinScan (append-only) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CheckinScan" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "ticketId" TEXT,
    "scannedBy" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckinScan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CheckinScan_bookingId_idx" ON "CheckinScan"("bookingId");

-- ── PassportStamp ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PassportStamp" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "editionId" TEXT,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassportStamp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PassportStamp_bookingId_key" ON "PassportStamp"("bookingId");
CREATE INDEX IF NOT EXISTS "PassportStamp_guestId_mintedAt_idx" ON "PassportStamp"("guestId", "mintedAt");

-- ── CollectionSet / CollectionAward ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CollectionSet" (
    "id" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "reward" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionSet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "CollectionAward" (
    "guestId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionAward_pkey" PRIMARY KEY ("guestId","setId")
);

-- ── Foreign keys (guarded) ───────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "Listing" ADD CONSTRAINT "Listing_stayThemeId_fkey"
    FOREIGN KEY ("stayThemeId") REFERENCES "StayTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
