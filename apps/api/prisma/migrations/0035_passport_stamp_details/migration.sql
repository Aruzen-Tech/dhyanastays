-- Stay Passport: make PassportStamp self-contained and two-phase.
-- Minted at verified check-in (checkedInAt), sealed at check-out (completedAt).
-- Idempotent per repo convention.

ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "propertyName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "stayStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "stayEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "nights" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "PassportStamp" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Drop the temporary defaults so future inserts must supply real values
-- (matches the Prisma model, which has no defaults for these).
ALTER TABLE "PassportStamp" ALTER COLUMN "propertyName" DROP DEFAULT;
ALTER TABLE "PassportStamp" ALTER COLUMN "city" DROP DEFAULT;
ALTER TABLE "PassportStamp" ALTER COLUMN "stayStart" DROP DEFAULT;
ALTER TABLE "PassportStamp" ALTER COLUMN "stayEnd" DROP DEFAULT;
ALTER TABLE "PassportStamp" ALTER COLUMN "nights" DROP DEFAULT;
