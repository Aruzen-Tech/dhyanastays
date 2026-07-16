-- 0028_sos_chat
-- Phase 1 SOS: per-incident chat thread between guest and responding admin.
-- Polling-based; SSE/WebSocket upgrade is a Phase 2 optimization.

CREATE TABLE IF NOT EXISTS "SosMessage" (
  "id"         TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "senderId"   TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SosMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SosMessage_incidentId_createdAt_idx"
  ON "SosMessage"("incidentId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "SosMessage"
    ADD CONSTRAINT "SosMessage_incidentId_fkey"
    FOREIGN KEY ("incidentId") REFERENCES "SosIncident"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
