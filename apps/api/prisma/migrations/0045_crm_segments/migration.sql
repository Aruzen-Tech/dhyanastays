-- CRM saved segments (Phase 3: Engagement). Idempotent.

CREATE TABLE IF NOT EXISTS "CrmSegment" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "type"        TEXT,
  "q"           TEXT,
  "tagId"       TEXT,
  "ownerId"     TEXT,
  "sort"        TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmSegment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CrmSegment_createdById_idx" ON "CrmSegment"("createdById");
