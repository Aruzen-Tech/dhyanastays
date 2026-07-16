# Dhyana Stays — Clone & Setup Guide

Everything needed to get the platform running on a fresh machine, with exact
commands. Nothing here requires code changes — all versions are pinned by
`pnpm-lock.yaml` and the docker-compose file.

---

## 1. Prerequisites (install these first)

| Tool | Version | Purpose | Get it |
|---|---|---|---|
| **Git** | any recent | clone the repo | https://git-scm.com |
| **Node.js** | **22 LTS** (≥ 18.18 works; CI uses 22) | runs API + web | https://nodejs.org |
| **pnpm** | **10.2.0** (pinned via `packageManager`) | monorepo package manager | see command below |
| **PostgreSQL** | **16** | primary database | Docker **or** native install |
| **Redis** | **≥ 5.0** (compose uses 6.2) | BullMQ background jobs | Docker **or** Memurai on Windows |
| **Meilisearch** | **v1.12** *(optional)* | full-text listing search | Docker |
| **Docker Desktop** | latest *(optional but easiest)* | runs the three services above | https://docker.com |

Notes:
- **Docker is the easy path** — one command starts Postgres + Redis + Meilisearch.
- **Without Docker** (e.g. this dev machine): install PostgreSQL natively and
  [Memurai](https://www.memurai.com) (Redis-compatible Windows service).
- **Redis and Meilisearch are optional for basic development**: without Redis the
  API boots with background jobs disabled (hold expiry, outbox, SOS queue won't
  run); without Meilisearch, listing search falls back to Postgres automatically.

### Install pnpm (exact pinned version)

```bash
# Option A — via corepack (ships with Node):
corepack enable
corepack prepare pnpm@10.2.0 --activate

# Option B — via npm:
npm install -g pnpm@10.2.0

# Verify:
pnpm --version   # → 10.2.0
```

---

## 2. What `pnpm install` brings in (key runtime dependencies)

All exact versions are locked in `pnpm-lock.yaml` — you never install these
manually. Listed for reference:

| Package | Version | Used by |
|---|---|---|
| NestJS (`@nestjs/*`) | ^10.4 | API framework |
| Prisma + `@prisma/client` | ^6.19.2 | ORM / migrations |
| BullMQ + `@nestjs/bullmq` | ^5.70 / ^10.2 | background job queues |
| ioredis | ^5.9 | Redis client |
| Next.js | ^15.5.12 | web frontend |
| React | 19.0.0 | web frontend |
| Tailwind CSS | ^3.4 | styling (nature-luxury token theme) |
| Leaflet / react-leaflet | ^1.9 | listing maps |
| TypeScript | ^5.7 | both apps |
| Jest + ts-jest | ^29.7 | tests |

Workspace layout: `apps/api` (NestJS), `apps/web` (Next.js),
`packages/shared` (`@dhyana/shared` — shared types).

---

## 3. Clone & install

```bash
# 1. Clone
git clone <YOUR_REMOTE_URL> dhyana-stays
cd dhyana-stays

# If you're copying from the current machine instead of a remote:
#   git clone "d:/dhyana stays" dhyana-stays     (or add a remote and push first)

# 2. Install all workspace dependencies (uses pnpm-lock.yaml, exact versions)
pnpm install
```

---

## 4. Environment files

Copy the templates, then edit values:

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.local.example apps/web/.env.local
```

(Windows PowerShell: `Copy-Item apps/api/.env.example apps/api/.env` etc.)

**Minimum required edits in `apps/api/.env` for local dev:**

| Variable | Value for local dev |
|---|---|
| `DATABASE_URL` | `postgresql://dhyana:dhyana@localhost:5432/dhyana_stays` (matches Docker) — adjust user/password for a native Postgres |
| `JWT_ACCESS_SECRET` | any string ≥ 16 chars |
| `JWT_REFRESH_SECRET` | any string ≥ 16 chars |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credentials for the seeded first admin (add these two lines; the seed skips admin creation without them) |

Generate strong secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Everything else works on defaults in development: Razorpay runs in **stub mode**
with test placeholders, email/SMS/storage providers default to **stub**,
`PRICE_SNAPSHOT_SECRET` has a dev default, Auth0 is optional (empty = built-in
JWT auth). `apps/web/.env.local` needs nothing changed for local dev.

---

## 5. Start the infrastructure

### Option A — Docker (recommended)

```bash
pnpm infra:up        # starts postgres:16, redis:6.2, meilisearch:v1.12
```

### Option B — native services (no Docker)

1. **PostgreSQL 16**: install, then create the database and user to match your
   `DATABASE_URL`:
   ```sql
   CREATE USER dhyana WITH PASSWORD 'dhyana';
   CREATE DATABASE dhyana_stays OWNER dhyana;
   ```
2. **Redis** (Windows): install [Memurai](https://www.memurai.com), then from an
   **elevated** PowerShell:
   ```powershell
   Set-Service Memurai -StartupType Automatic
   Start-Service Memurai
   ```
3. **Meilisearch**: optional — skip it; search falls back to Postgres.

---

## 6. Database setup (migrations → GiST index → seed)

```bash
# 1. Generate the Prisma client
pnpm --filter @dhyana/api prisma:generate

# 2. Apply all migrations (0001 → 0032, idempotent)
pnpm --filter @dhyana/api prisma:deploy

# 3. Apply the post-migrate SQL (booking-overlap GiST index — required)
pnpm --filter @dhyana/api post-migrate

# 4. Seed baseline data (creates the first admin from ADMIN_EMAIL/ADMIN_PASSWORD)
pnpm --filter @dhyana/api seed
```

---

## 7. Run the platform

Two terminals:

```bash
# Terminal 1 — API on http://localhost:3001 (routes under /api)
pnpm --filter @dhyana/api start:dev

# Terminal 2 — Web on http://localhost:3000 (Turbopack dev server)
pnpm --filter @dhyana/web dev
```

Quick verification:

```bash
curl http://localhost:3001/api/listings   # JSON (may be [] before listings exist)
# then open http://localhost:3000 in a browser
```

If the API logs `Redis ... not available - background jobs disabled`, Redis
isn't reachable — the app still works, but holds won't auto-expire and queued
notifications won't dispatch. Start Redis/Memurai and restart the API.

---

## 8. Run the tests (optional but recommended after setup)

```bash
# Unit tests (~260 tests, no external services needed)
pnpm --filter @dhyana/api test

# Integration tests (need Postgres running + apps/api/.env)
pnpm --filter @dhyana/api test:int
```

Expected: unit suite green except one known pre-existing `listing.service.spec`
failure (tracked in `docs/TODO.md`); integration 34/34.

---

## 9. Production build (optional)

```bash
pnpm prod:prepare     # install + prisma generate + build everything
pnpm prod:migrate     # prisma migrate deploy
pnpm prod:seed        # seed
pnpm prod:start:api   # node dist/main.js
pnpm prod:start:web   # next start -p 3000
```

Production **requires** real values (validated at boot, stub modes are
rejected): 32+ char JWT/PRICE_SNAPSHOT secrets, real Razorpay keys + webhook
secret, and configured email/SMS/storage providers. See
`apps/api/.env.production.local.example` and `apps/web/.env.production.local.example`.

> **Windows note:** the web `next build` finishes compiling and prerendering,
> but the final `standalone` output copy needs symlink permission — enable
> Windows Developer Mode or run the build in an elevated shell. Linux/macOS/CI
> are unaffected.

---

## Quick-reference: full command sequence

```bash
corepack enable && corepack prepare pnpm@10.2.0 --activate
git clone <YOUR_REMOTE_URL> dhyana-stays && cd dhyana-stays
pnpm install
cp apps/api/.env.example apps/api/.env          # then edit (see §4)
cp apps/web/.env.local.example apps/web/.env.local
pnpm infra:up                                    # or set up native services (§5B)
pnpm --filter @dhyana/api prisma:generate
pnpm --filter @dhyana/api prisma:deploy
pnpm --filter @dhyana/api post-migrate
pnpm --filter @dhyana/api seed
pnpm --filter @dhyana/api start:dev              # terminal 1
pnpm --filter @dhyana/web dev                    # terminal 2
```
