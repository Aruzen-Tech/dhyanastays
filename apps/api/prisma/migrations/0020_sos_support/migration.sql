-- 0020_sos_support
-- SOS & support system (Phase 3 §5.12). One-tap panic button that pages
-- on-duty ops and fans out to the guest's trusted contacts via the
-- notification outbox (§5.17). The SosBroadcast table records every
-- attempted channel/contact pair so we can audit delivery after an
-- incident. Rate limiting on the POST endpoint is enforced at the
-- application layer (see SosController).

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "SosTier" AS ENUM ('MEDICAL','SECURITY','TRANSPORT','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SosStatus" AS ENUM ('OPEN','ACKNOWLEDGED','IN_PROGRESS','RESOLVED','FALSE_ALARM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Trusted contacts — populated by the guest during onboarding. At most
--    one `primary` contact per user, enforced by partial unique index.
CREATE TABLE IF NOT EXISTS "TrustedContact" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "phone"       TEXT NOT NULL,
  "relation"    TEXT NOT NULL,
  "primary"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TrustedContact_userId_idx" ON "TrustedContact"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TrustedContact_userId_primary_key"
  ON "TrustedContact"("userId") WHERE "primary" = true;
ALTER TABLE "TrustedContact"
  ADD CONSTRAINT "TrustedContact_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. SosIncident — one row per panic tap. Status transitions:
--    OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED | FALSE_ALARM.
CREATE TABLE IF NOT EXISTS "SosIncident" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "bookingId"   TEXT,
  "tier"        "SosTier" NOT NULL,
  "lat"         DOUBLE PRECISION NOT NULL,
  "lng"         DOUBLE PRECISION NOT NULL,
  "message"     TEXT,
  "status"      "SosStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ackedAt"     TIMESTAMP(3),
  "ackedBy"     TEXT,
  "resolvedAt"  TIMESTAMP(3),
  "resolvedBy"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SosIncident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SosIncident_userId_idx" ON "SosIncident"("userId");
CREATE INDEX IF NOT EXISTS "SosIncident_status_openedAt_idx"
  ON "SosIncident"("status","openedAt" DESC);
CREATE INDEX IF NOT EXISTS "SosIncident_bookingId_idx" ON "SosIncident"("bookingId");
ALTER TABLE "SosIncident"
  ADD CONSTRAINT "SosIncident_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SosIncident"
  ADD CONSTRAINT "SosIncident_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. SosBroadcast — audit trail for every fan-out attempt.
CREATE TABLE IF NOT EXISTS "SosBroadcast" (
  "id"          TEXT NOT NULL,
  "incidentId"  TEXT NOT NULL,
  "channel"     TEXT NOT NULL,
  "target"      TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'QUEUED',
  "lastError"   TEXT,
  "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SosBroadcast_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SosBroadcast_incidentId_idx" ON "SosBroadcast"("incidentId");
ALTER TABLE "SosBroadcast"
  ADD CONSTRAINT "SosBroadcast_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "SosIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
