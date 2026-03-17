# Cloudflare Deployment Guide — Dhyana Stays

Deploy Dhyana Stays to production using Cloudflare for DNS, CDN, SSL, and R2 media storage.

---

## Architecture Overview

```
                     ┌─────────────────────────────────────┐
                     │          Cloudflare Edge             │
                     │  DNS + CDN + SSL + WAF + DDoS       │
                     ├─────────────┬───────────────────────┤
                     │             │                       │
          ┌──────────▼──────┐  ┌──▼───────────────┐  ┌───▼────────────┐
          │ dhyanastays.in  │  │ api.dhyanastays.in│  │ R2 Bucket      │
          │ (Next.js - Web) │  │ (NestJS - API)    │  │ media.dhyana.. │
          │                 │  │                    │  │ (listing imgs) │
          │ Cloudflare Pages│  │ VPS / Railway /   │  │                │
          │ or same VPS     │  │ Render / Fly.io   │  │ S3-compatible  │
          └─────────────────┘  └────────┬──────────┘  └────────────────┘
                                        │
                               ┌────────▼────────┐
                               │   PostgreSQL     │
                               │  (Neon / Supabase│
                               │   / VPS local)   │
                               └────────┬─────────┘
                                        │
                               ┌────────▼────────┐
                               │     Redis        │
                               │  (Upstash /      │
                               │   VPS local)     │
                               └──────────────────┘
```

**Important**: Cloudflare D1 is SQLite-based — it does **not** work with this project's PostgreSQL/Prisma stack. Use Neon, Supabase, or a VPS-local PostgreSQL for the database.

---

## Table of Contents

1. [Cloudflare Account Setup](#1-cloudflare-account-setup)
2. [Domain & DNS Configuration](#2-domain--dns-configuration)
3. [Cloudflare R2 — Media Storage](#3-cloudflare-r2--media-storage)
4. [Database — PostgreSQL (Neon recommended)](#4-database--postgresql)
5. [Redis — Background Jobs (Upstash recommended)](#5-redis--background-jobs)
6. [Deploy the API (NestJS)](#6-deploy-the-api-nestjs)
7. [Deploy the Frontend (Next.js)](#7-deploy-the-frontend-nextjs)
8. [Cloudflare SSL/TLS Settings](#8-cloudflare-ssltls-settings)
9. [Cloudflare Security — WAF & Rate Limiting](#9-cloudflare-security--waf--rate-limiting)
10. [Production Environment Variables](#10-production-environment-variables)
11. [Razorpay Webhook with Cloudflare](#11-razorpay-webhook-with-cloudflare)
12. [Go-Live Checklist](#12-go-live-checklist)

---

## 1. Cloudflare Account Setup

You should already have a Cloudflare account with your domain added. Verify:

1. Log in to https://dash.cloudflare.com
2. Select your domain (e.g. `dhyanastays.in`)
3. Confirm the nameservers are pointing to Cloudflare (check Overview page — status should show "Active")

If you haven't added your domain yet:
1. Dashboard → **Add a Site** → enter your domain
2. Select the **Free** plan (sufficient for this project)
3. Cloudflare will show you two nameservers (e.g. `ada.ns.cloudflare.com`, `bret.ns.cloudflare.com`)
4. Go to your domain registrar and update the nameservers to point to Cloudflare
5. Wait for propagation (usually 5–30 minutes, can take up to 24h)

---

## 2. Domain & DNS Configuration

You need three DNS records. Go to **DNS → Records** in Cloudflare dashboard.

### Option A: API and Web on the same VPS

If running both services on a single VPS (e.g. DigitalOcean, Hetzner, Linode):

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| A | `@` | `YOUR_VPS_IP` | Proxied (orange cloud) | Auto |
| A | `api` | `YOUR_VPS_IP` | Proxied (orange cloud) | Auto |
| CNAME | `media` | `YOUR_R2_PUBLIC_DOMAIN` | Proxied | Auto |

### Option B: Frontend on Cloudflare Pages, API on VPS

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| CNAME | `@` | `dhyana-stays.pages.dev` | Proxied | Auto |
| A | `api` | `YOUR_VPS_IP` | Proxied | Auto |
| CNAME | `media` | `YOUR_R2_PUBLIC_DOMAIN` | Proxied | Auto |

### Option C: API on Railway/Render

| Type | Name | Content | Proxy | TTL |
|------|------|---------|-------|-----|
| CNAME | `api` | `your-app.up.railway.app` | DNS only (grey cloud) | Auto |

> **Note**: Railway and Render require DNS-only mode (grey cloud, no Cloudflare proxy) to work with their own SSL. You can still use Cloudflare proxy for the frontend and media.

---

## 3. Cloudflare R2 — Media Storage

R2 is S3-compatible with **zero egress fees** — ideal for serving listing images.

### Step 1 — Create the R2 Bucket

1. Cloudflare Dashboard → **R2 Object Storage** (left sidebar)
2. Click **Create bucket**
3. Bucket name: `dhyana-stays-media`
4. Location hint: **Asia Pacific (APAC)** — closest to India
5. Click **Create bucket**

### Step 2 — Enable Public Access (Custom Domain)

1. Open your bucket → **Settings** tab
2. Under **Custom Domains**, click **Connect Domain**
3. Enter: `media.dhyanastays.in` (or your preferred subdomain)
4. Cloudflare will auto-create the DNS record
5. Wait for SSL certificate to provision (~2 minutes)

After this, files uploaded to R2 will be publicly accessible at:
```
https://media.dhyanastays.in/listings/uuid-here.jpg
```

### Step 3 — Create R2 API Token

1. **R2 Overview** → **Manage R2 API Tokens** (right side)
2. Click **Create API Token**
3. Token name: `dhyana-stays-api`
4. Permissions: **Object Read & Write**
5. Specify bucket: `dhyana-stays-media` (limit scope to just this bucket)
6. TTL: No expiry (or set a long TTL)
7. Click **Create API Token**

You'll see three values — **save all of them immediately** (shown only once):

| Value | Example | Maps to Env Var |
|-------|---------|-----------------|
| Token Value | (not used directly) | — |
| Access Key ID | `a1b2c3d4e5f6...` | `S3_ACCESS_KEY_ID` |
| Secret Access Key | `x9y8z7w6v5u4...` | `S3_SECRET_ACCESS_KEY` |

### Step 4 — Find Your Account ID

1. Cloudflare Dashboard → right sidebar → **Account ID**
2. Copy it (32-character hex string)

Your R2 S3-compatible endpoint is:
```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

### Step 5 — Set Environment Variables

In `apps/api/.env` (production):
```env
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=dhyana-stays-media
S3_REGION=auto
S3_ACCESS_KEY_ID=<your-r2-access-key-id>
S3_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
CDN_URL=https://media.dhyanastays.in
```

### Step 6 — Set CORS on R2 Bucket (required for browser uploads)

1. Open your R2 bucket → **Settings**
2. Under **CORS Policy**, click **Edit** or **Add**
3. Add this CORS rule:

```json
[
  {
    "AllowedOrigins": [
      "https://dhyanastays.in",
      "https://www.dhyanastays.in",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Click **Save**

This allows the browser to PUT files directly to R2 via presigned URLs.

---

## 4. Database — PostgreSQL

Cloudflare D1 is SQLite — it will **not** work with Prisma's PostgreSQL provider. Use one of these:

### Option A: Neon (recommended — free tier, serverless)

1. Go to https://neon.tech → Sign up
2. Create a new project → Region: **Singapore** (closest to India)
3. Dashboard → **Connection Details** → copy the connection string

```env
DATABASE_URL=postgresql://neondb_owner:<password>@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**Neon free tier**: 0.5 GB storage, autoscale to zero, 3 branches.

### Option B: Supabase (free tier, managed Postgres)

1. Go to https://supabase.com → New project
2. Region: **Southeast Asia (Singapore)**
3. Settings → Database → Connection string → URI

```env
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

### Option C: PostgreSQL on the same VPS

If you're running the API on a VPS, install PostgreSQL locally:
```bash
sudo apt install postgresql-16
sudo -u postgres createuser --pwprompt dhyana
sudo -u postgres createdb -O dhyana dhyana_stays
```

```env
DATABASE_URL=postgresql://dhyana:<password>@localhost:5432/dhyana_stays
```

### Run migrations (from your local machine or CI)

```bash
# Set DATABASE_URL to production, then:
pnpm --filter @dhyana/api prisma:deploy
pnpm --filter @dhyana/api seed
```

---

## 5. Redis — Background Jobs

Redis is required for BullMQ (hold expiry, payout eligibility, weekly payout batch).

### Option A: Upstash (recommended — serverless, free tier)

1. Go to https://upstash.com → Create database
2. Region: **ap-south-1** (Mumbai) or Singapore
3. Copy the Redis URL (starts with `rediss://`)

```env
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
```

**Upstash free tier**: 10,000 commands/day, 256 MB storage.

### Option B: Redis on VPS

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

```env
REDIS_URL=redis://localhost:6379
```

---

## 6. Deploy the API (NestJS)

The NestJS API is a traditional Node.js server — it cannot run on Cloudflare Workers. Deploy it to a VPS or PaaS.

### Option A: Railway (easiest — auto-deploy from Git)

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Configure the build:
   - **Root Directory**: `apps/api`
   - **Build Command**: `cd ../.. && pnpm install && pnpm --filter @dhyana/api prisma:generate && pnpm --filter @dhyana/api build`
   - **Start Command**: `node dist/main.js`
3. Add all environment variables (see [Section 10](#10-production-environment-variables))
4. Railway will give you a URL like `https://dhyana-api.up.railway.app`
5. Add a custom domain: `api.dhyanastays.in`

### Option B: Render

1. Go to https://render.com → New Web Service → Connect repo
2. Root Directory: `apps/api`
3. Build: `cd ../.. && pnpm install && pnpm --filter @dhyana/api prisma:generate && pnpm --filter @dhyana/api build`
4. Start: `node dist/main.js`
5. Add env vars and custom domain

### Option C: VPS (DigitalOcean / Hetzner / Linode)

**Minimum specs**: 1 vCPU, 1 GB RAM, 25 GB SSD ($5–6/month)

```bash
# On the VPS:
# 1. Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install pnpm
npm install -g pnpm@10

# 3. Clone your repo
git clone <your-repo-url> /opt/dhyana-stays
cd /opt/dhyana-stays

# 4. Install + build
pnpm install
pnpm --filter @dhyana/api prisma:generate
pnpm --filter @dhyana/api build

# 5. Create .env
cp apps/api/.env.example apps/api/.env
nano apps/api/.env   # fill in production values

# 6. Run migrations
pnpm --filter @dhyana/api prisma:deploy
pnpm --filter @dhyana/api seed

# 7. Start with PM2 (process manager)
npm install -g pm2
cd apps/api
pm2 start dist/main.js --name dhyana-api
pm2 save
pm2 startup   # auto-start on reboot
```

#### Nginx reverse proxy (VPS only)

```nginx
# /etc/nginx/sites-available/dhyana-api
server {
    listen 80;
    server_name api.dhyanastays.in;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase body size for file metadata (presigned URL requests)
        client_max_body_size 10M;
    }
}
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/dhyana-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

SSL is handled by Cloudflare proxy (orange cloud) — Nginx only needs to listen on port 80.

---

## 7. Deploy the Frontend (Next.js)

### Option A: Cloudflare Pages (recommended — free, global CDN)

Cloudflare Pages supports Next.js via `@cloudflare/next-on-pages`.

#### Step 1 — Install the adapter

```bash
pnpm --filter @dhyana/web add -D @cloudflare/next-on-pages
```

#### Step 2 — Add wrangler.toml

Create `apps/web/wrangler.toml`:
```toml
name = "dhyana-stays-web"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

#### Step 3 — Update package.json build script

In `apps/web/package.json`, add:
```json
{
  "scripts": {
    "pages:build": "npx @cloudflare/next-on-pages",
    "pages:preview": "npx wrangler pages dev .vercel/output/static",
    "pages:deploy": "npx wrangler pages deploy .vercel/output/static"
  }
}
```

#### Step 4 — Deploy via Cloudflare Dashboard

1. Cloudflare Dashboard → **Workers & Pages** → **Create**
2. Select **Pages** → **Connect to Git**
3. Select your repository
4. Build settings:
   - **Framework preset**: Next.js
   - **Root directory**: `apps/web`
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
5. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://api.dhyanastays.in
   NEXT_PUBLIC_AUTH0_DOMAIN=           (leave blank for custom JWT)
   NEXT_PUBLIC_AUTH0_CLIENT_ID=
   NEXT_PUBLIC_AUTH0_AUDIENCE=
   NEXT_PUBLIC_AUTH0_REDIRECT_URI=https://dhyanastays.in/auth/callback
   ```
6. Deploy

#### Step 5 — Add custom domain

1. After deploy → **Custom domains** → Add `dhyanastays.in`
2. Cloudflare auto-configures DNS

> **Note**: Next.js rewrites (`/api/*` → backend) work on Cloudflare Pages. The rewrite proxies API calls through the edge, so the user's browser never contacts `api.dhyanastays.in` directly — only `dhyanastays.in/api/*`.

### Option B: Same VPS as API

If deploying both on the same VPS, build and run Next.js with PM2:

```bash
cd /opt/dhyana-stays

# Create web env
cat > apps/web/.env.production.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.dhyanastays.in
EOF

# Build
pnpm --filter @dhyana/web build

# Start with PM2
cd apps/web
pm2 start npm --name dhyana-web -- start
pm2 save
```

Nginx config for the frontend:
```nginx
# /etc/nginx/sites-available/dhyana-web
server {
    listen 80;
    server_name dhyanastays.in www.dhyanastays.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Cloudflare SSL/TLS Settings

Go to **SSL/TLS** in your domain's Cloudflare dashboard:

### SSL Mode

- If using **Cloudflare Pages** for frontend: Set to **Full (strict)**
- If using **VPS with Nginx** (no origin SSL cert): Set to **Full**
- If VPS has its own SSL cert (Let's Encrypt): Set to **Full (strict)**

### Recommended settings

| Setting | Value | Location |
|---------|-------|----------|
| SSL/TLS mode | Full (strict) | SSL/TLS → Overview |
| Always Use HTTPS | On | SSL/TLS → Edge Certificates |
| Minimum TLS Version | TLS 1.2 | SSL/TLS → Edge Certificates |
| TLS 1.3 | On | SSL/TLS → Edge Certificates |
| Automatic HTTPS Rewrites | On | SSL/TLS → Edge Certificates |
| HSTS | Enable (max-age 6 months) | SSL/TLS → Edge Certificates |

### Origin Certificate (for VPS)

If your VPS doesn't have SSL and you set mode to "Full (strict)":
1. SSL/TLS → **Origin Server** → **Create Certificate**
2. Let Cloudflare generate a private key
3. Hostnames: `*.dhyanastays.in, dhyanastays.in`
4. Certificate validity: 15 years
5. Download both the origin cert and private key
6. Install on your VPS Nginx:
```nginx
server {
    listen 443 ssl;
    server_name api.dhyanastays.in;
    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin-key.pem;
    # ... proxy_pass as before
}
```

---

## 9. Cloudflare Security — WAF & Rate Limiting

### Page Rules (free plan)

Add these page rules (Settings → **Rules** → **Page Rules**):

| URL Pattern | Setting |
|------------|---------|
| `api.dhyanastays.in/api/payments/webhook` | Disable Security (WAF off — Razorpay needs raw POST) |
| `media.dhyanastays.in/*` | Cache Level: Cache Everything, Edge TTL: 1 month |
| `dhyanastays.in/api/*` | Cache Level: Bypass (API responses shouldn't be cached) |

### WAF Custom Rules (free plan includes 5)

Go to **Security → WAF → Custom Rules**:

**Rule 1 — Rate limit login endpoint**:
- Expression: `(http.request.uri.path eq "/api/auth/login" and http.request.method eq "POST")`
- Action: Rate Limit → 10 requests per minute per IP → Block for 10 minutes

**Rule 2 — Rate limit registration**:
- Expression: `(http.request.uri.path eq "/api/auth/register" and http.request.method eq "POST")`
- Action: Rate Limit → 5 requests per minute per IP → Block for 30 minutes

**Rule 3 — Block suspicious bots on API**:
- Expression: `(http.request.uri.path contains "/api/" and cf.client.bot)`
- Action: Managed Challenge

### Bot Fight Mode

**Security → Bots → Bot Fight Mode** → Turn **On**

This blocks known bad bots from scraping your listings or spamming signups.

---

## 10. Production Environment Variables

### API (`apps/api/.env`)

```env
# ── App
NODE_ENV=production
PORT=3001
TZ=Asia/Kolkata
API_URL=https://api.dhyanastays.in
WEB_URL=https://dhyanastays.in

# ── Database (Neon example)
DATABASE_URL=postgresql://neondb_owner:<password>@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# ── JWT — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_ACCESS_SECRET=<64-char-random-hex>
JWT_REFRESH_SECRET=<different-64-char-random-hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Redis (Upstash example)
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
REDIS_HOST=<host>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<password>

# ── Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=60
ALLOWED_ORIGINS=https://dhyanastays.in

# ── Razorpay (LIVE keys — after KYC)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxx

# ── Email
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@dhyanastays.in
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# ── SMS
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=xxxxxxxxxxxxxxxxxxxx
MSG91_SENDER_ID=DHYANA
MSG91_BOOKING_TEMPLATE_ID=<template-id>

# ── Storage (Cloudflare R2)
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_BUCKET=dhyana-stays-media
S3_REGION=auto
S3_ACCESS_KEY_ID=<r2-access-key>
S3_SECRET_ACCESS_KEY=<r2-secret-key>
CDN_URL=https://media.dhyanastays.in

# ── Auth0 (leave blank for custom JWT)
AUTH0_DOMAIN=
AUTH0_AUDIENCE=

# ── Meilisearch
MEILI_URL=https://ms-xxxxxxxx.sfo.meilisearch.io
MEILI_MASTER_KEY=<master-key>
```

### Frontend (`apps/web/.env.production.local`)

```env
NEXT_PUBLIC_API_URL=https://api.dhyanastays.in
NEXT_PUBLIC_AUTH0_DOMAIN=
NEXT_PUBLIC_AUTH0_CLIENT_ID=
NEXT_PUBLIC_AUTH0_AUDIENCE=
NEXT_PUBLIC_AUTH0_REDIRECT_URI=https://dhyanastays.in/auth/callback
```

---

## 11. Razorpay Webhook with Cloudflare

When Cloudflare proxies your API, it adds security headers and may modify requests. The Razorpay webhook signature verification must work with the raw body.

### Setup

1. **Razorpay Dashboard** → Settings → Webhooks → Add New Webhook
2. Webhook URL: `https://api.dhyanastays.in/api/payments/webhook`
3. Secret: generate a strong random string, save it as `RAZORPAY_WEBHOOK_SECRET`
4. Events:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`

### Cloudflare Page Rule

Create a page rule to ensure Cloudflare doesn't interfere with the webhook:
- URL: `api.dhyanastays.in/api/payments/webhook`
- Settings: Security Level = Essentially Off, Browser Integrity Check = Off

This ensures Razorpay's servers can POST to your webhook without being challenged.

---

## 12. Go-Live Checklist

### Before launch

- [ ] Domain active on Cloudflare (nameservers pointing, green checkmark)
- [ ] R2 bucket created with custom domain (`media.dhyanastays.in`)
- [ ] R2 CORS policy configured (allows your domain + PUT method)
- [ ] R2 API token created and saved
- [ ] PostgreSQL provisioned (Neon/Supabase) and connection string tested
- [ ] Redis provisioned (Upstash) and connection tested
- [ ] Strong JWT secrets generated (64+ chars, different for access/refresh)
- [ ] Razorpay **live** keys obtained (KYC completed)
- [ ] Razorpay webhook URL set and tested
- [ ] Email provider configured (Resend) with verified domain
- [ ] API deployed and `https://api.dhyanastays.in/api/health` returns `{ "status": "ok" }`
- [ ] Frontend deployed and `https://dhyanastays.in` loads
- [ ] Prisma migrations applied to production DB
- [ ] Admin seed data loaded (`admin@dhyanastays.com` can log in)
- [ ] SSL/TLS set to Full (strict)
- [ ] HSTS enabled
- [ ] WAF rate limiting rules active on auth endpoints
- [ ] Razorpay webhook page rule (security off for webhook path)
- [ ] `next.config.js` allows image domains for `media.dhyanastays.in`

### Smoke tests after launch

```bash
# Health check
curl https://api.dhyanastays.in/api/health

# Login
curl -X POST https://api.dhyanastays.in/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dhyanastays.com","password":"Password@123!"}'

# Public listings
curl https://api.dhyanastays.in/api/listings

# Search
curl "https://api.dhyanastays.in/api/listings/search?q=goa"
```

### Post-launch

- [ ] Change admin password from default
- [ ] Test a real booking flow end-to-end (Razorpay test card → confirm → payout)
- [ ] Verify email notifications arrive (check spam folder)
- [ ] Upload a listing photo via host dashboard — confirm it appears from R2 CDN
- [ ] Set up uptime monitoring (e.g. Cloudflare Health Checks on `/api/health`)
- [ ] Enable Cloudflare Analytics (free) to monitor traffic

---

## Quick Reference — Cloudflare Account IDs & URLs

After setup, note these values for reference:

```
Cloudflare Account ID:  ________________________________
R2 Bucket Name:         dhyana-stays-media
R2 S3 Endpoint:         https://<account-id>.r2.cloudflarestorage.com
R2 Public URL:          https://media.dhyanastays.in
API Domain:             api.dhyanastays.in
Web Domain:             dhyanastays.in
```

---

## Cost Estimate (Monthly)

| Service | Provider | Free Tier | Paid Estimate |
|---------|----------|-----------|---------------|
| DNS + CDN + SSL | Cloudflare | Free | Free |
| Media Storage | Cloudflare R2 | 10 GB + 1M requests | $0.015/GB |
| Database | Neon | 0.5 GB | $19/mo (Pro) |
| Redis | Upstash | 10K cmds/day | $10/mo (Pro) |
| API Hosting | Railway | $5 free credits | ~$5–7/mo |
| Frontend | Cloudflare Pages | Free (unlimited) | Free |
| Email | Resend | 3K emails/mo | $20/mo (Pro) |
| **Total** | | **$0 (free tiers)** | **~$55–60/mo** |

All free tiers are sufficient for launch and early growth.
