-- CRM foundation (Phase 1): contact overlay, tags, notes, activity timeline.
-- Overlay on User (the contact). Additive + idempotent (safe to re-run).

-- Activity type enum (guarded so re-runs don't error).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrmActivityType') THEN
    CREATE TYPE "CrmActivityType" AS ENUM (
      'NOTE', 'TAG_ADDED', 'TAG_REMOVED', 'STAGE_CHANGED', 'TASK_CREATED',
      'TASK_COMPLETED', 'OUTREACH_SENT', 'CALL_LOGGED', 'CONTACT_UPDATED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CrmContactProfile" (
  "userId"          TEXT NOT NULL,
  "ownerId"         TEXT,
  "source"          TEXT,
  "doNotContact"    BOOLEAN NOT NULL DEFAULT false,
  "leadScore"       INTEGER,
  "lastContactedAt" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmContactProfile_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "CrmContactProfile_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CrmContactProfile_ownerId_idx" ON "CrmContactProfile"("ownerId");

CREATE TABLE IF NOT EXISTS "CrmTag" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "color"     TEXT NOT NULL DEFAULT '#64748b',
  "category"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmTag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CrmTag_name_key" ON "CrmTag"("name");

CREATE TABLE IF NOT EXISTS "CrmContactTag" (
  "userId"    TEXT NOT NULL,
  "tagId"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmContactTag_pkey" PRIMARY KEY ("userId", "tagId"),
  CONSTRAINT "CrmContactTag_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CrmContactTag_tagId_fkey" FOREIGN KEY ("tagId")
    REFERENCES "CrmTag"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CrmContactTag_tagId_idx" ON "CrmContactTag"("tagId");

CREATE TABLE IF NOT EXISTS "CrmNote" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "pinned"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmNote_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CrmNote_userId_idx" ON "CrmNote"("userId");

CREATE TABLE IF NOT EXISTS "CrmActivity" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "type"       "CrmActivityType" NOT NULL,
  "summary"    TEXT NOT NULL,
  "metadata"   JSONB,
  "actorId"    TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmActivity_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CrmActivity_userId_occurredAt_idx" ON "CrmActivity"("userId", "occurredAt");
