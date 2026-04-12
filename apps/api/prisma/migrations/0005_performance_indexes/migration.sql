-- Performance indexes for production query patterns

-- Booking lookups by listing (availability checks, host dashboard)
CREATE INDEX IF NOT EXISTS "Booking_listingId_status_idx" ON "Booking" ("listingId", "status");

-- Guest viewing their bookings
CREATE INDEX IF NOT EXISTS "Booking_guestId_status_idx" ON "Booking" ("guestId", "status");

-- Admin dashboard: bookings by status and date
CREATE INDEX IF NOT EXISTS "Booking_status_createdAt_idx" ON "Booking" ("status", "createdAt");

-- Date range queries for booking overlap detection
CREATE INDEX IF NOT EXISTS "Booking_listingId_startsAt_endsAt_idx" ON "Booking" ("listingId", "startsAt", "endsAt");

-- Payment lookups by booking
CREATE INDEX IF NOT EXISTS "Payment_bookingId_idx" ON "Payment" ("bookingId");

-- Payment reports by status
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment" ("status", "createdAt");

-- Rate rule lookups when quoting
CREATE INDEX IF NOT EXISTS "RateRule_listingId_idx" ON "RateRule" ("listingId");

-- Seasonal rate lookups during pricing
CREATE INDEX IF NOT EXISTS "SeasonalRate_listingId_startsAt_endsAt_idx" ON "SeasonalRate" ("listingId", "startsAt", "endsAt");

-- Availability block checks
CREATE INDEX IF NOT EXISTS "AvailabilityBlock_listingId_startsAt_endsAt_idx" ON "AvailabilityBlock" ("listingId", "startsAt", "endsAt");

-- Host payout dashboard
CREATE INDEX IF NOT EXISTS "PayoutLine_hostId_status_idx" ON "PayoutLine" ("hostId", "status");

-- Listing discovery: approved listings by date
CREATE INDEX IF NOT EXISTS "Listing_status_createdAt_idx" ON "Listing" ("status", "createdAt");

-- Listing lookups by host
CREATE INDEX IF NOT EXISTS "Listing_hostId_idx" ON "Listing" ("hostId");

-- Hold lookups by listing for overlap checks
CREATE INDEX IF NOT EXISTS "Hold_listingId_expiresAt_idx" ON "Hold" ("listingId", "expiresAt");

-- Refund lookups by booking
CREATE INDEX IF NOT EXISTS "Refund_bookingId_idx" ON "Refund" ("bookingId");

-- Ledger queries by booking
CREATE INDEX IF NOT EXISTS "LedgerEvent_bookingId_idx" ON "LedgerEvent" ("bookingId");
