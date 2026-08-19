-- CRM Phase 2: tasks + lifecycle pipeline. Additive + idempotent (safe to re-run).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrmStageKind') THEN
    CREATE TYPE "CrmStageKind" AS ENUM ('GUEST', 'HOST', 'LEAD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrmTaskStatus') THEN
    CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrmTaskPriority') THEN
    CREATE TYPE "CrmTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CrmLifecycleStage" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "kind"      "CrmStageKind" NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "color"     TEXT NOT NULL DEFAULT '#64748b',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmLifecycleStage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CrmLifecycleStage_kind_name_key" ON "CrmLifecycleStage"("kind", "name");
CREATE INDEX IF NOT EXISTS "CrmLifecycleStage_kind_order_idx" ON "CrmLifecycleStage"("kind", "order");

CREATE TABLE IF NOT EXISTS "CrmTask" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "status"      "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority"    "CrmTaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueAt"       TIMESTAMP(3),
  "assigneeId"  TEXT,
  "createdById" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmTask_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CrmTask_userId_idx" ON "CrmTask"("userId");
CREATE INDEX IF NOT EXISTS "CrmTask_assigneeId_status_idx" ON "CrmTask"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "CrmTask_status_dueAt_idx" ON "CrmTask"("status", "dueAt");

-- Lifecycle stage on the contact profile.
ALTER TABLE "CrmContactProfile" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
CREATE INDEX IF NOT EXISTS "CrmContactProfile_stageId_idx" ON "CrmContactProfile"("stageId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CrmContactProfile_stageId_fkey') THEN
    ALTER TABLE "CrmContactProfile"
      ADD CONSTRAINT "CrmContactProfile_stageId_fkey"
      FOREIGN KEY ("stageId") REFERENCES "CrmLifecycleStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Default lifecycle stages (idempotent — admins can rename/reorder/add later).
INSERT INTO "CrmLifecycleStage" ("id", "name", "kind", "order", "color", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'New',             'GUEST', 1, '#0ea5e9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Active',          'GUEST', 2, '#16a34a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'VIP',             'GUEST', 3, '#a855f7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'At risk',         'GUEST', 4, '#f59e0b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Churned',         'GUEST', 5, '#ef4444', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Applied',         'HOST',  1, '#0ea5e9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Onboarding',      'HOST',  2, '#8b5cf6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Active',          'HOST',  3, '#16a34a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Underperforming', 'HOST',  4, '#f59e0b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Inactive',        'HOST',  5, '#ef4444', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'New lead',        'LEAD',  1, '#0ea5e9', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Contacted',       'LEAD',  2, '#8b5cf6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Qualified',       'LEAD',  3, '#16a34a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Won',             'LEAD',  4, '#a855f7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Lost',            'LEAD',  5, '#ef4444', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("kind", "name") DO NOTHING;
