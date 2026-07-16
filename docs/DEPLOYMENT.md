# Dhyana Stays — Live Deployment Guide (Testing / Staging)

Goal: get the platform **live on the internet for testing** at ₹0/month, with a
clear upgrade path to real production. Companion files:
[`render.yaml`](../render.yaml) (one-click API + DB + Redis blueprint),
[`apps/api/Dockerfile`](../apps/api/Dockerfile), [`.dockerignore`](../.dockerignore),
[`SETUP.md`](./SETUP.md) (local setup).

---

## 1. Architecture for the test deployment

```
Browser
   │
   ▼
Vercel  ──  Next.js web (apps/web)           ← free Hobby tier
   │        /api/* rewrite proxies to ↓        (no CORS issues — same-origin)
   ▼
Render  ──  NestJS API (apps/api, Docker)    ← free tier (sleeps when idle)
   ├──      PostgreSQL 16                     ← free 30-day instance
   └──      Key Value (Redis) for BullMQ      ← free 25 MB
```

The API runs with **`NODE_ENV=staging`** — deliberately *not* `production`.
Production mode hard-requires real payment/email/SMS/storage providers and
refuses stub modes (see §8); staging is the supported way to run live with
test-mode providers.

---

## 2. Third-party services — REQUIRED for the test launch

| # | Service | What for | Plan / cost | What you do |
|---|---|---|---|---|
| 1 | **GitHub** | deploy source (already at `Aruzen-Tech/dhyanastays`) | free | nothing — already set up |
| 2 | **Render** — https://render.com | API + PostgreSQL + Redis | free | sign up with GitHub, deploy the blueprint (§4) |
| 3 | **Vercel** — https://vercel.com | Next.js frontend | free Hobby | sign up with GitHub, import `apps/web` (§6) |
| 4 | **Razorpay** — https://razorpay.com | payments in **test mode** (`rzp_test_` keys, test cards/UPI — no real money) | free | sign up (KYC not needed for test mode), copy test keys + create webhook (§7) |

> Strictly, #4 is optional — with no keys the API uses its built-in payment
> stub. But Razorpay test mode exercises the real checkout + webhook path and
> is what "testing the platform" should cover.

## 3. Third-party services — OPTIONAL now, REQUIRED for real production

Production boot validation (`env.validation.ts`) enforces every row marked ●.

| Service | What for | Needed in staging? | Required in production? |
|---|---|---|---|
| **Razorpay live keys + webhook secret** | real payments | test keys fine | ● |
| **Resend** (or SendGrid / any SMTP) | booking-confirmation emails | stub logs to console | ● one of them |
| **MSG91** (India) or **Twilio** | SMS notifications | stub | ● one of them |
| **Cloudflare R2** (or AWS S3) | listing photo storage | stub URLs | ● one of them |
| **Anthropic API key** | AI itinerary planner (§5.9) | stub plan generated | ● |
| **Managed Redis** (Render KV / Upstash) | BullMQ jobs | free KV covers it | ● non-localhost |
| **SOS ops phone + email** | §5.12 first-responder contacts | not enforced | ● E.164 phone + mailbox |
| **Auth0** | enterprise SSO (dual-mode auth) | built-in JWT auth works | optional either way |
| **Meilisearch Cloud** | fancier full-text search | Postgres fallback works | optional |
| **Domain + DNS** (e.g. dhyanastays.in) | real URLs | `*.vercel.app` / `*.onrender.com` fine | recommended |
| **Sentry / UptimeRobot** | error + uptime monitoring | optional | strongly recommended |

---

## 4. Deploy the API + DB + Redis (Render, ~10 minutes)

1. Sign up at https://render.com with your GitHub account and grant it access
   to `Aruzen-Tech/dhyanastays`.
2. Dashboard → **New → Blueprint** → pick the repo. Render reads
   [`render.yaml`](../render.yaml) and shows the three resources.
3. Fill the prompted values:
   - `WEB_URL` / `ALLOWED_ORIGINS` — leave placeholder for now; set after §6.
   - `RAZORPAY_KEY_ID` / `KEY_SECRET` — your `rzp_test_…` keys (or empty for stub).
   - `RAZORPAY_WEBHOOK_SECRET` — set after §7 (any placeholder for now).
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — first-admin credentials for the seed.
4. **Apply.** First build takes ~5–10 min. Your API URL will be
   `https://dhyana-api.onrender.com` (exact name shown in the dashboard).

## 5. Migrate + seed the live database (from your machine)

Render's free tier has no pre-deploy hook, so run migrations locally against
the cloud DB once (repeat only when new migrations land):

```bash
# Render dashboard → dhyana-postgres → "External Database URL" → copy it
cd apps/api

# Windows PowerShell:
$env:DATABASE_URL = "<external-database-url>"
npx prisma migrate deploy
npx prisma db execute --file prisma/post-migrate/01_booking_gist_index.sql --schema prisma/schema.prisma
$env:ADMIN_EMAIL = "you@example.com"; $env:ADMIN_PASSWORD = "<strong-password>"
npx ts-node src/prisma/seed.ts

# macOS/Linux: DATABASE_URL="<url>" npx prisma migrate deploy   (etc.)
```

Verify: `https://dhyana-api.onrender.com/api/listings` returns JSON.

## 6. Deploy the web app (Vercel, ~5 minutes)

1. Sign up at https://vercel.com with GitHub → **Add New → Project** → import
   the repo.
2. Settings when prompted:
   - **Root Directory:** `apps/web`
   - **Framework:** Next.js (auto-detected) — build command stays default
   - **Environment variable:** `NEXT_PUBLIC_API_URL` = `https://dhyana-api.onrender.com`
3. Deploy → you get `https://<project>.vercel.app`.
4. Back in **Render** → `dhyana-api` → Environment: set
   `WEB_URL` and `ALLOWED_ORIGINS` to that exact Vercel URL → save (auto-redeploys).

> Alternative: I can deploy the web app for you directly if you authorize the
> **Vercel connector** in your claude.ai connector settings.

## 7. Razorpay test-mode webhook

Razorpay Dashboard (test mode) → **Settings → Webhooks → Add**:

- URL: `https://dhyana-api.onrender.com/api/payments/webhook`
- Active events: `payment.captured`, `payment.failed`, `refund.processed`
- Set a **secret** → copy it into Render env `RAZORPAY_WEBHOOK_SECRET`.

Test cards/UPI: https://razorpay.com/docs/payments/payments/test-card-details/

## 8. Smoke-test checklist (once both are live)

- [ ] Open the Vercel URL → homepage renders with listings (after seeding/creating one)
- [ ] Register a guest account → login works (JWT auth, no Auth0 needed)
- [ ] Register a host → create a listing → approve it via the seeded admin
- [ ] Hold dates → book → pay with a Razorpay test card → booking `CONFIRMED_PAID`
- [ ] Admin panel `/admin` reachable with the seeded admin login
- [ ] Cancel the booking → refund row created per policy tier
- [ ] Render logs show BullMQ queues registered (hold-expiry etc.)

Known free-tier quirks: the API sleeps after ~15 min idle (first request takes
~30–60 s — that's Render, not a bug); the free Postgres instance expires after
30 days (export or upgrade before then).

## 9. Upgrading to real production later

1. Provision every ● row in §3 (live Razorpay + KYC, Resend, MSG91/Twilio, R2,
   Anthropic key, SOS contacts).
2. Set all of them in Render env, plus 32+ char secrets (already generated),
   `SOS_OPS_PHONE`/`SOS_OPS_EMAIL`, and flip `NODE_ENV=production` — boot
   validation will refuse to start until everything is genuinely configured
   (that's by design).
3. Move web + API to paid plans (no sleep), add a custom domain on both,
   re-point `NEXT_PUBLIC_API_URL`/`ALLOWED_ORIGINS`, and switch the Razorpay
   webhook to the live-mode URL/secret.
4. Wire monitoring (Sentry + UptimeRobot) and DB backups — see `docs/TODO.md` P3.
