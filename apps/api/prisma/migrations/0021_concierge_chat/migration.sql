-- 0021_concierge_chat
-- Phase 3 §5.10 Post-booking Concierge Chat.
-- Promotes `Conversation` into a durable, SLA-tracked channel between guest
-- and host for confirmed bookings, with ops (admin L1+) able to step in.
--
-- Changes:
--   1. Two new enums (ConversationKind, ConversationStatus)
--   2. Conversation gets status/SLA fields — existing rows become STANDARD / OPEN
--   3. Message gains `isSystem` for thread-lifecycle announcements
--   4. HostQuickReply — host-side canned replies (e.g. "WiFi password")
--   5. Partial unique index ensures exactly one CONCIERGE thread per booking

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "ConversationKind" AS ENUM ('STANDARD','CONCIERGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConversationStatus" AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Conversation: new fields + indexes
ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "kind"               "ConversationKind"    NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "status"             "ConversationStatus"  NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "lastGuestMessageAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastHostMessageAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaDueAt"           TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaBreachedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt"           TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Conversation_kind_status_idx"
  ON "Conversation"("kind","status");
CREATE INDEX IF NOT EXISTS "Conversation_status_slaDueAt_idx"
  ON "Conversation"("status","slaDueAt");
CREATE INDEX IF NOT EXISTS "Conversation_bookingId_kind_idx"
  ON "Conversation"("bookingId","kind");

-- Partial unique: one CONCIERGE thread per booking, never more.
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_bookingId_concierge_uq"
  ON "Conversation"("bookingId")
  WHERE "kind" = 'CONCIERGE';

-- 3. Message.isSystem — flags lifecycle announcements like "Ops joined"
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- 4. HostQuickReply — per-host canned replies for the host chat client
CREATE TABLE IF NOT EXISTS "HostQuickReply" (
  "id"        TEXT         NOT NULL,
  "hostId"    TEXT         NOT NULL,
  "label"     TEXT         NOT NULL,
  "body"      TEXT         NOT NULL,
  "sortOrder" INTEGER      NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HostQuickReply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HostQuickReply_hostId_sortOrder_idx"
  ON "HostQuickReply"("hostId","sortOrder");

DO $$ BEGIN
  ALTER TABLE "HostQuickReply"
    ADD CONSTRAINT "HostQuickReply_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "Host"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
