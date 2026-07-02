-- 01_booking_gist_index.sql
-- Post-migrate companion to 0030_booking_gist_index.
--
-- Runs OUTSIDE the migration transaction via:
--   pnpm exec prisma db execute --file prisma/post-migrate/01_booking_gist_index.sql --schema prisma/schema.prisma
-- (or `pnpm run post-migrate` if wired in package.json)
--
-- Critical invariants:
--   1. CONCURRENTLY — never blocks writes during build. Required on a live DB.
--   2. IF NOT EXISTS — safe to re-run after partial failure or re-deploy.
--   3. Partial predicate matches trg_prevent_booking_overlap's WHERE *exactly*.
--      If the trigger ever adds/removes a status from its IN(...) list, this
--      index's WHERE must be updated to match in the same PR — otherwise the
--      planner won't pick the index and the perf fix silently no-ops.
--   4. tsrange boundary '[)' matches what the trigger uses (allows back-to-back
--      bookings where one's checkout is the next's check-in).
--
-- Verification post-deploy:
--   EXPLAIN (ANALYZE, BUFFERS)
--     SELECT 1 FROM "Booking"
--      WHERE "listingId" = '<sample>'
--        AND status IN ('CONFIRMED_DEPOSIT','CONFIRMED_PAID','BALANCE_DUE','PAYMENT_PENDING')
--        AND tsrange("startsAt","endsAt",'[)') && tsrange('2026-12-01','2026-12-05','[)');
--   Expect: Index Scan using idx_booking_active_range. NOT Seq Scan.
--
-- Production migration safety check (run on staging copy of prod data):
--   - In one psql session: BEGIN; INSERT INTO "Booking" (...);
--   - In another: run this SQL.
--   - Confirm via pg_locks that no ACCESS EXCLUSIVE is held on "Booking"
--     during the build. SHARE UPDATE EXCLUSIVE is normal and non-blocking
--     for writes.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_booking_active_range"
  ON "Booking" USING gist (
    "listingId",
    tsrange("startsAt", "endsAt", '[)')
  )
  WHERE status IN (
    'CONFIRMED_DEPOSIT',
    'CONFIRMED_PAID',
    'BALANCE_DUE',
    'PAYMENT_PENDING'
  );
