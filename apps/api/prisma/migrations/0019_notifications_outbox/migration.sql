-- 0019_notifications_outbox
-- Notification outbox + per-user channel preferences (Phase 2 §5.17).
-- The outbox decouples business logic from delivery: every user-facing
-- message is written as a PENDING row first, then dispatched by a worker
-- with retry/backoff. This unblocks multi-channel fan-out (SMS + WhatsApp
-- + push) without sprinkling try/catch across the codebase.

-- 1. OutboxStatus enum
DO $$ BEGIN
  CREATE TYPE "OutboxStatus" AS ENUM ('PENDING','SENT','FAILED','SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. NotificationChannel enum (kept as enum so new channels show up in
--    reports without a string-taxonomy drift).
DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL','SMS','WHATSAPP','PUSH','IN_APP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. NotificationPreference: one per user. `channels` holds the per-kind
--    opt-in map (e.g. {"booking.confirmed":{"sms":true,"email":true}}),
--    and `quietHours` stores {start:"22:00", end:"07:00", tz:"Asia/Kolkata"}.
CREATE TABLE "NotificationPreference" (
  "userId"     TEXT PRIMARY KEY,
  "channels"   JSONB        NOT NULL DEFAULT '{}',
  "quietHours" JSONB,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. NotificationOutbox: one row per (user, channel, kind) dispatch.
--    The worker queries (status='PENDING' AND attempts < N) ordered by
--    createdAt. `nextAttemptAt` supports backoff without a separate delay
--    queue — the worker skips rows whose time hasn't come.
CREATE TABLE "NotificationOutbox" (
  "id"            TEXT                  NOT NULL,
  "userId"        TEXT                  NOT NULL,
  "kind"          TEXT                  NOT NULL,
  "channel"       "NotificationChannel" NOT NULL,
  "payload"       JSONB                 NOT NULL,
  "status"        "OutboxStatus"        NOT NULL DEFAULT 'PENDING',
  "attempts"      INTEGER               NOT NULL DEFAULT 0,
  "lastError"     TEXT,
  "nextAttemptAt" TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"        TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationOutbox_attempts_check" CHECK ("attempts" >= 0)
);

CREATE INDEX "NotificationOutbox_status_nextAttemptAt_idx"
  ON "NotificationOutbox"("status","nextAttemptAt");
CREATE INDEX "NotificationOutbox_userId_createdAt_idx"
  ON "NotificationOutbox"("userId","createdAt" DESC);
CREATE INDEX "NotificationOutbox_kind_createdAt_idx"
  ON "NotificationOutbox"("kind","createdAt" DESC);

ALTER TABLE "NotificationOutbox"
  ADD CONSTRAINT "NotificationOutbox_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
