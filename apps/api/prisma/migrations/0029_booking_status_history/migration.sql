-- 0029_booking_status_history
-- Step 1 of the booking-engine production-correctness pass.
--
-- Adds Booking.statusHistory — append-only Json array of state transitions.
-- Written by BookingStateMachine; never mutated directly. Backfilled with [].
-- Schema-only. No code change in this migration; subsequent steps wire it up.

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "statusHistory" JSONB NOT NULL DEFAULT '[]'::jsonb;
