-- 0031_booking_correctness_pass
-- Step 7b + 7c of the booking-engine production-correctness pass.
--
-- 7b: ProcessedRazorpayEvent — dedup table for at-least-once webhooks.
-- 7c: Booking.cancellationPolicySnapshot — frozen tier data so in-flight
--     bookings keep their original cancellation terms even if the policy
--     code changes after they were created.

-- ── 7c: cancellation policy snapshot ────────────────────────────────────
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "cancellationPolicySnapshot" JSONB;

-- ── 7b: Razorpay webhook dedup table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProcessedRazorpayEvent" (
  "eventId"    TEXT NOT NULL,
  "eventType"  TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedRazorpayEvent_pkey" PRIMARY KEY ("eventId")
);

CREATE INDEX IF NOT EXISTS "ProcessedRazorpayEvent_receivedAt_idx"
  ON "ProcessedRazorpayEvent"("receivedAt");
