#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Container start-up hook. Render's free tier has no `preDeployCommand`, so we
# bring the database schema in sync here — before the API serves a single
# request. Everything below is idempotent and safe to run on every boot
# (including free-tier cold starts).
#
#   1. prisma migrate deploy — applies any un-applied migrations. FATAL on
#      failure: the app must never serve against a schema it doesn't match.
#      (Uses DIRECT_URL, per schema.prisma's `directUrl`.)
#   2. post-migrate GiST index — a perf companion to the booking-overlap
#      trigger (CREATE INDEX CONCURRENTLY IF NOT EXISTS). Perf only, not
#      correctness, so it's NON-FATAL.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "[entrypoint] prisma migrate deploy…"
npx --no-install prisma migrate deploy

echo "[entrypoint] applying post-migrate index (non-fatal)…"
npx --no-install prisma db execute \
  --file prisma/post-migrate/01_booking_gist_index.sql \
  --schema prisma/schema.prisma \
  || echo "[entrypoint] post-migrate index skipped (non-fatal)"

echo "[entrypoint] starting API…"
exec node dist/main.js
