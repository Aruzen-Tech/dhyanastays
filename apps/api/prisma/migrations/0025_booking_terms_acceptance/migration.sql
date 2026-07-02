-- 0025_booking_terms_acceptance
-- Adds Booking.acceptedTermsAt to record when the guest accepted the cancellation
-- policy + terms of service at booking creation. Required server-side from now on.
-- Existing rows get NULL (legacy bookings predating server-enforcement).

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "acceptedTermsAt" TIMESTAMP(3);
