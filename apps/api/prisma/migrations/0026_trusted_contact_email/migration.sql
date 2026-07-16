-- 0026_trusted_contact_email
-- Phase 1 SOS: trusted contacts can now have email + phone (either or both).
-- Phone becomes nullable so an email-only contact is valid. Application-layer
-- DTO validation enforces that at least one of phone/email is present.

ALTER TABLE "TrustedContact" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "TrustedContact" ALTER COLUMN "phone" DROP NOT NULL;
