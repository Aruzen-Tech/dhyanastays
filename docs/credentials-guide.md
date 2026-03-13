# Dhyana Stays — Credentials Configuration Guide

This guide explains every environment variable, where to get it, and what happens if it's missing.

---

## How to use this guide

1. Copy the example file: `cp apps/api/.env.example apps/api/.env`
2. Fill in each section below in order (🔴 first, then 🟡, then 🟢)
3. Restart the API: `pnpm --filter @dhyana/api start:dev`

---

## 🔴 SECTION 1 — Database (COMPULSORY)

### `DATABASE_URL`

**What it is:** The connection string to your PostgreSQL database.

**For local development (Docker):**
```
DATABASE_URL=postgresql://dhyana:dhyana@localhost:5432/dhyana_stays
```
Start Docker first: `docker-compose up -d postgres`

**For production (Supabase — free tier available):**
1. Go to https://supabase.com → New project
2. Settings → Database → Connection string → URI
3. Copy the URI, replace `[YOUR-PASSWORD]` with your project password
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

**For production (Neon — free tier available):**
1. Go to https://neon.tech → New project
2. Dashboard → Connection Details → copy the connection string
```
DATABASE_URL=postgresql://[user]:[password]@[host]/[dbname]?sslmode=require
```

**For production (Railway):**
1. Go to https://railway.app → New project → Add PostgreSQL
2. Variables tab → copy `DATABASE_URL`

---

## 🔴 SECTION 2 — Redis (COMPULSORY for background jobs)

### `REDIS_URL`

**What it is:** Connection to Redis, used for background job queues (hold expiry, payout eligibility, etc.)

**For local development (Docker):**
```
REDIS_URL=redis://localhost:6379
```
Start Docker first: `docker-compose up -d redis`

**For production (Upstash — free tier, serverless Redis):**
1. Go to https://upstash.com → Create database → Select region closest to your server
2. Details tab → copy "Redis URL" (starts with `rediss://`)
```
REDIS_URL=rediss://default:[password]@[host].upstash.io:6379
```

**For production (Railway Redis):**
1. Railway project → Add Redis → Variables → copy `REDIS_URL`

---

## 🔴 SECTION 3 — JWT Secrets (COMPULSORY — change before going live)

### `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`

**What they are:** Secret keys used to sign and verify login tokens. If these are weak or public, anyone can forge a login token and access any account.

**How to generate strong secrets (run in terminal):**
```bash
# On Windows PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

# On Mac/Linux:
openssl rand -base64 64
```

**Set them like this:**
```
JWT_ACCESS_SECRET=your-64-char-random-string-here
JWT_REFRESH_SECRET=different-64-char-random-string-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

⚠️ **NEVER use the same value for both secrets.**
⚠️ **NEVER commit these to git.** `.env` is already in `.gitignore`.

---

## 🔴 SECTION 4 — Razorpay Payments (COMPULSORY for real money)

### `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

**What they are:** Credentials to accept real INR payments from guests.

**Step-by-step setup:**

### Step 1 — Create Razorpay account
1. Go to https://razorpay.com
2. Sign up with your business email
3. Complete KYC (PAN card + bank account for payouts)
4. For testing, you can use **Test Mode** immediately without KYC

### Step 2 — Get API Keys
1. Login → Settings (top right) → API Keys
2. Click **"Generate Test Key"** (for testing) or **"Generate Live Key"** (for production)
3. You will see:
   - **Key ID**: starts with `rzp_test_` (test) or `rzp_live_` (production)
   - **Key Secret**: shown only once — copy it immediately

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3 — Set up Webhook Secret
1. Razorpay Dashboard → Settings → Webhooks → Add New Webhook
2. **Webhook URL**: `https://your-api-domain.com/api/payments/webhook`
   - For local testing: use ngrok (see below)
3. **Secret**: type any strong random string (e.g. `dhyana_webhook_2024_secret`)
4. **Events to enable**: check these:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
5. Click Save

```
RAZORPAY_WEBHOOK_SECRET=dhyana_webhook_2024_secret
```

### Step 4 — Local webhook testing with ngrok
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001
# Copy the https URL e.g. https://abc123.ngrok.io
# Use https://abc123.ngrok.io/api/payments/webhook as your Razorpay webhook URL
```

**Test card numbers (Razorpay test mode):**
| Card | Number | CVV | Expiry |
|---|---|---|---|
| Visa (success) | 4111 1111 1111 1111 | Any 3 digits | Any future date |
| Mastercard (success) | 5267 3181 8797 5449 | Any 3 digits | Any future date |
| Failure simulation | 4000 0000 0000 0002 | Any | Any future date |

---

## 🟡 SECTION 5 — Email Notifications (RECOMMENDED)

Without email, bookings still work — guests just won't receive confirmation emails.

### Option A: Resend (recommended — generous free tier, India-friendly)

1. Go to https://resend.com → Sign up
2. Add your domain (or use their sandbox for testing)
3. API Keys → Create API Key
4. Copy the key (starts with `re_`)

```
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@dhyanastays.com
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Option B: SendGrid

1. Go to https://sendgrid.com → Sign up (free tier: 100 emails/day)
2. Settings → API Keys → Create API Key → Full Access
3. Copy the key (starts with `SG.`)

```
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@dhyanastays.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
```

### Option C: SMTP (Gmail, Zoho, custom)

**For Gmail:**
1. Google Account → Security → 2-Step Verification → App Passwords
2. Generate app password for "Mail"

```
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@dhyanastays.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
```

### Option D: Skip for now
```
EMAIL_PROVIDER=stub
```
Emails will be logged to console only — no real emails sent.

---

## 🟡 SECTION 6 — SMS Notifications (RECOMMENDED for India)

### Option A: MSG91 (recommended for India — INR pricing, OTP support)

1. Go to https://msg91.com → Sign up
2. Dashboard → API → Auth Key → copy it
3. SMS → Sender ID → register your sender ID (e.g. DHYANA)
4. Templates → Create template for booking confirmation

```
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
MSG91_SENDER_ID=DHYANA
MSG91_BOOKING_TEMPLATE_ID=your-template-id
```

### Option B: Twilio

1. Go to https://twilio.com → Sign up
2. Console → Account SID + Auth Token
3. Phone Numbers → Buy a number (or use trial number)

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

### Option C: Skip
```
SMS_PROVIDER=stub
```

---

## 🟡 SECTION 7 — File Storage for Listing Images (RECOMMENDED)

Without storage, listing images use inline SVG placeholders. Hosts cannot upload real photos.

### Option A: Cloudflare R2 (recommended — free egress, S3-compatible)

1. Go to https://cloudflare.com → R2 → Create bucket
2. Bucket name: `dhyana-stays-media`
3. R2 → Manage R2 API Tokens → Create Token → Read & Write
4. Copy: Account ID, Access Key ID, Secret Access Key
5. Settings → Custom Domain → add `media.dhyanastays.com` (optional CDN)

```
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
S3_BUCKET=dhyana-stays-media
S3_REGION=auto
S3_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
CDN_URL=https://media.dhyanastays.com
```

### Option B: AWS S3

1. AWS Console → S3 → Create bucket (e.g. `dhyana-stays-media`)
2. Region: `ap-south-1` (Mumbai — closest to India)
3. IAM → Create user → Attach `AmazonS3FullAccess` → Access Keys
4. CloudFront → Create distribution → Origin: your S3 bucket (optional CDN)

```
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.ap-south-1.amazonaws.com
S3_BUCKET=dhyana-stays-media
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
CDN_URL=https://xxxxxxxx.cloudfront.net
```

### Option C: Skip (use SVG placeholders)
```
STORAGE_PROVIDER=stub
```

---

## 🟡 SECTION 8 — Meilisearch (RECOMMENDED for faceted search)

Without Meilisearch, search falls back to PostgreSQL ILIKE queries (slower, no facets).

### Option A: Meilisearch Cloud (managed)

1. Go to https://cloud.meilisearch.com → Sign up
2. Create project → copy URL and Master Key

```
MEILI_URL=https://ms-xxxxxxxx.sfo.meilisearch.io
MEILI_MASTER_KEY=your-master-key-here
```

### Option B: Self-hosted (Docker — already in docker-compose)

```
MEILI_URL=http://localhost:7700
MEILI_MASTER_KEY=meili_dev_key
```
Start with: `docker-compose up -d meilisearch`

---

## 🟢 SECTION 9 — App URLs

```
# Local development
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

# Production
API_URL=https://api.dhyanastays.com
WEB_URL=https://dhyanastays.com
```

---

## 🟢 SECTION 10 — App Configuration

```
NODE_ENV=production          # or development
PORT=3001                    # API port
TZ=Asia/Kolkata              # Timezone for cron jobs
```

---

## Complete `.env` template

Copy this to `apps/api/.env` and fill in your values:

```bash
# ─── DATABASE ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://dhyana:dhyana@localhost:5432/dhyana_stays

# ─── REDIS ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT (generate strong secrets!) ──────────────────────────────────────────
JWT_ACCESS_SECRET=CHANGE_ME_generate_with_openssl_rand_base64_64
JWT_REFRESH_SECRET=CHANGE_ME_different_from_access_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── RAZORPAY ─────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_CHANGE_ME
RAZORPAY_KEY_SECRET=CHANGE_ME
RAZORPAY_WEBHOOK_SECRET=CHANGE_ME

# ─── EMAIL ────────────────────────────────────────────────────────────────────
EMAIL_PROVIDER=stub                    # stub | resend | sendgrid | smtp
EMAIL_FROM=noreply@dhyanastays.com
RESEND_API_KEY=                        # if EMAIL_PROVIDER=resend
SENDGRID_API_KEY=                      # if EMAIL_PROVIDER=sendgrid
SMTP_HOST=                             # if EMAIL_PROVIDER=smtp
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ─── SMS ──────────────────────────────────────────────────────────────────────
SMS_PROVIDER=stub                      # stub | msg91 | twilio
MSG91_AUTH_KEY=                        # if SMS_PROVIDER=msg91
MSG91_SENDER_ID=DHYANA
TWILIO_ACCOUNT_SID=                    # if SMS_PROVIDER=twilio
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# ─── STORAGE ──────────────────────────────────────────────────────────────────
STORAGE_PROVIDER=stub                  # stub | s3 | r2
S3_ENDPOINT=
S3_BUCKET=dhyana-stays-media
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
CDN_URL=

# ─── MEILISEARCH ──────────────────────────────────────────────────────────────
MEILI_URL=http://localhost:7700
MEILI_MASTER_KEY=meili_dev_key

# ─── APP ──────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
TZ=Asia/Kolkata
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000
```

---

## Quick start checklist

### For local development (everything runs on your machine):
```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Copy env file
cp apps/api/.env.example apps/api/.env
# (Docker defaults already work — no changes needed for local dev)

# 3. Run migrations + seed
cd apps/api
pnpm prisma:migrate
pnpm seed

# 4. Start API
pnpm start:dev

# 5. Start web (new terminal)
cd apps/web
pnpm dev
```

### For production (minimum viable):
1. ✅ Set `DATABASE_URL` to hosted Postgres (Supabase/Neon/Railway)
2. ✅ Set `REDIS_URL` to hosted Redis (Upstash)
3. ✅ Generate and set `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`
4. ✅ Set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET`
5. ✅ Set `NODE_ENV=production`
6. ✅ Set `API_URL` + `WEB_URL` to your real domains

Everything else can be `stub` initially and upgraded later.

---

## Security reminders

- ❌ Never commit `.env` to git (it's in `.gitignore`)
- ❌ Never share your Key Secret or JWT secrets
- ✅ Use test mode Razorpay keys during development
- ✅ Rotate secrets if accidentally exposed
- ✅ Use different secrets for staging vs production
