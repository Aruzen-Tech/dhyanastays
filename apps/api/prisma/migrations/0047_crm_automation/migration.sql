-- CRM automation rules (Phase 4). Idempotent.

DO $$ BEGIN
  CREATE TYPE "CrmAutomationTrigger" AS ENUM ('STAGE_CHANGED', 'TAG_ADDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CrmAutomationAction" AS ENUM ('CREATE_TASK', 'SEND_OUTREACH', 'ADD_TAG', 'ASSIGN_OWNER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "CrmAutomationRule" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "trigger"     "CrmAutomationTrigger" NOT NULL,
  "stageId"     TEXT,
  "tagId"       TEXT,
  "action"      "CrmAutomationAction" NOT NULL,
  "config"      JSONB NOT NULL DEFAULT '{}',
  "timesFired"  INTEGER NOT NULL DEFAULT 0,
  "lastFiredAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmAutomationRule_trigger_enabled_idx"
  ON "CrmAutomationRule" ("trigger", "enabled");
