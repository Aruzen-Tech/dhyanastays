-- 0030_booking_gist_index
-- Part 1 of the GiST partial-index roll-out.
--
-- Prisma's migration runner wraps each migration file in BEGIN/COMMIT,
-- but CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- (PostgreSQL hard rule, SQLSTATE 25001). We can't disable the wrapping
-- from inside the file in Prisma 6.x.
--
-- Split: this migration installs the btree_gist extension (txn-safe).
-- The CONCURRENTLY index is in `prisma/post-migrate/01_booking_gist_index.sql`
-- and must be applied via `prisma db execute --file ...` AFTER `migrate deploy`.
-- The post-migrate script is idempotent (IF NOT EXISTS) so it's safe to re-run.
--
-- See `package.json` "post-migrate" script and `docs/runbook.md`
-- (the production deploy procedure now requires running both).

CREATE EXTENSION IF NOT EXISTS btree_gist;
