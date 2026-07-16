-- 0032_feature_flags_host_settings
-- Platform control panel: admin feature-flag overrides + per-host settings.

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "key"       TEXT NOT NULL,
  "enabled"   BOOLEAN NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "HostSetting" (
  "hostId"             TEXT NOT NULL,
  "instantBook"        BOOLEAN NOT NULL DEFAULT false,
  "allowGuestMessages" BOOLEAN NOT NULL DEFAULT true,
  "allowConciergeChat" BOOLEAN NOT NULL DEFAULT true,
  "emailOnNewBooking"  BOOLEAN NOT NULL DEFAULT true,
  "smsOnNewBooking"    BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HostSetting_pkey" PRIMARY KEY ("hostId")
);

DO $$ BEGIN
  ALTER TABLE "HostSetting"
    ADD CONSTRAINT "HostSetting_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
