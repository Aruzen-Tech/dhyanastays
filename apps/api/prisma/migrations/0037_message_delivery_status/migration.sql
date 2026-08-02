-- Message delivery tracking: SENT → DELIVERED → READ. Idempotent.

-- Enum type (guarded so re-runs don't error).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageStatus') THEN
    CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
  END IF;
END
$$;

ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "status" "MessageStatus" NOT NULL DEFAULT 'SENT';
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- Backfill existing read messages so history shows the right ticks.
UPDATE "Message"
   SET "status" = 'READ',
       "readAt" = COALESCE("readAt", "createdAt"),
       "deliveredAt" = COALESCE("deliveredAt", "createdAt")
 WHERE "isRead" = true AND "status" = 'SENT';
