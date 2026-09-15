-- Host application profile. Registering as a host created an empty Host row,
-- so staff were approving people they knew nothing about. Idempotent.

DO $$ BEGIN
  CREATE TYPE "HostIdDocumentType" AS ENUM ('PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Why an application was turned down — shown back to the host so they can fix it.
ALTER TABLE "Host" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

CREATE TABLE IF NOT EXISTS "HostProfile" (
  "id"            TEXT NOT NULL,
  "hostId"        TEXT NOT NULL,
  "legalName"     TEXT NOT NULL,
  "businessName"  TEXT,
  "about"         TEXT,
  "website"       TEXT,
  "addressLine1"  TEXT NOT NULL,
  "addressLine2"  TEXT,
  "city"          TEXT NOT NULL,
  "state"         TEXT NOT NULL,
  "postalCode"    TEXT NOT NULL,
  "country"       TEXT NOT NULL DEFAULT 'India',
  "panLast4"      TEXT,
  "panEnc"        TEXT,
  "gstin"         TEXT,
  "idType"        "HostIdDocumentType",
  "idLast4"       TEXT,
  "idEnc"         TEXT,
  "idDocumentUrl" TEXT,
  "submittedAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HostProfile_hostId_key" ON "HostProfile" ("hostId");

DO $$ BEGIN
  ALTER TABLE "HostProfile"
    ADD CONSTRAINT "HostProfile_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
