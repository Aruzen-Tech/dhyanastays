-- Sync three tables that were added to schema.prisma without a migration:
--   SystemConfig, AdminNotification, HostNotification.
--
-- Local/dev/staging databases already have these (created ad-hoc via `db push`
-- or `migrate dev`), but a fresh `prisma migrate deploy` — CI and any new
-- production DB — never created them, so host/admin notifications and system
-- config silently failed there. Everything below is guarded (IF NOT EXISTS +
-- a DO-block for the FK) so this migration is a safe no-op where the tables
-- already exist and a create where they don't.

-- ── SystemConfig ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key");

-- ── AdminNotification ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminNotification_isRead_createdAt_idx" ON "AdminNotification"("isRead", "createdAt");

-- ── HostNotification ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HostNotification" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HostNotification_hostId_isRead_createdAt_idx" ON "HostNotification"("hostId", "isRead", "createdAt");

DO $$ BEGIN
  ALTER TABLE "HostNotification"
    ADD CONSTRAINT "HostNotification_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
