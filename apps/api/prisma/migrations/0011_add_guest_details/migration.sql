-- AddMissing: guestDetails column was declared in Prisma schema but never migrated
ALTER TABLE "Booking" ADD COLUMN "guestDetails" JSONB;
