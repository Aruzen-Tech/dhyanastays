-- CRM reusable outreach templates (Phase 3: Outreach). Idempotent.

CREATE TABLE IF NOT EXISTS "CrmMessageTemplate" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "subject"     TEXT,
  "body"        TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmMessageTemplate_pkey" PRIMARY KEY ("id")
);
