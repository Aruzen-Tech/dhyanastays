# Runbook — Dhyana Stays (Complete New-PC Setup Guide)

This is the **step-by-step onboarding guide** to set up and run Dhyana Stays on another Windows PC.

---

## 0) What you are setting up

- `apps/api` → NestJS API (`http://localhost:3001/api`)
- `apps/web` → Next.js app (`http://localhost:3000`)
- PostgreSQL (database)
- Redis (queues/jobs)
- Optional Meilisearch

---

## 1) Mandatory dependencies (detailed, one by one)

> Run PowerShell as **Administrator** for installs.

## 1.1 Install Git

### Step A — Check if already installed
```powershell
git --version
```
If version appears (example: `git version 2.47.0`), skip install.

### Step B — Install with winget
```powershell
winget install --id Git.Git -e --source winget
```

### Step C — Verify
```powershell
git --version
where git
```

### Common issues
- **`winget` not found**  
  Install “App Installer” from Microsoft Store, then reopen terminal.
- **`git` not recognized after install**  
  Close terminal, reopen PowerShell, run `git --version` again.

---

## 1.2 Install Node.js (LTS)

### Step A — Check existing Node
```powershell
node -v
npm -v
```
If Node major version is below 22, upgrade.

### Step B — Install Node LTS
```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

### Step C — Verify
```powershell
node -v
npm -v
where node
where npm
```

### Required version
- Node `22+` recommended.

### Common issues
- **Old Node still used**  
  You may have multiple Node installs. Remove old versions from “Add/Remove Programs” or fix PATH priority.
- **`npm` missing**  
  Reinstall Node LTS, ensure “Add to PATH” is enabled.

---

## 1.3 Install pnpm

### Step A — Install global pnpm
```powershell
npm install -g pnpm@10
```

### Step B — Verify
```powershell
pnpm -v
where pnpm
```

### Common issues
- **Global install permission error**  
  Run PowerShell as Administrator.
- **`pnpm` not found after install**  
  Reopen terminal. If needed:
  ```powershell
  npm config get prefix
  ```
  Ensure npm global bin path is in PATH.

---

## 1.4 Install PostgreSQL 16

### Step A — Install
```powershell
winget install --id PostgreSQL.PostgreSQL.16 -e --source winget
```

### Step B — During installer
- Keep default port: `5432`
- Set superuser (`postgres`) password (remember it)
- Keep service startup: Automatic

### Step C — Verify service
```powershell
Get-Service *postgres*
```
You should see service like `postgresql-x64-16` in Running state.

### Step D — Verify psql binary path
```powershell
Get-ChildItem "C:\Program Files\PostgreSQL\16\bin\psql.exe"
```

If file exists, continue.

### Step E — Create DB + user for project
```powershell
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

& $psql -U postgres -h localhost -p 5432 -c "CREATE USER dhyana WITH PASSWORD 'dhyana';"
& $psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE dhyana_stays OWNER dhyana;"
& $psql -U postgres -h localhost -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE dhyana_stays TO dhyana;"
```

### Step F — Verify DB login
```powershell
& $psql -U dhyana -h localhost -p 5432 -d dhyana_stays -c "SELECT current_database();"
```

Expected output includes `dhyana_stays`.

### Common issues
- **`psql` path differs**  
  Find path:
  ```powershell
  Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter psql.exe
  ```
- **Connection refused on 5432**  
  Start service:
  ```powershell
  Get-Service *postgres*
  Start-Service postgresql-x64-16
  ```
- **Password auth failed**  
  Recheck postgres password used during install.

---

## 1.5 Install Redis (Memurai Developer on Windows)

### Step A — Install
```powershell
winget install --id Memurai.Memurai-Developer -e --source winget
```

### Step B — Verify service
```powershell
Get-Service *memurai*
```

### Step C — Start service if stopped
```powershell
Start-Service Memurai
```

### Step D — Verify Redis ping
If redis-cli is available:
```powershell
redis-cli ping
```
Expected: `PONG`

If `redis-cli` is unavailable, confirm service is Running via `Get-Service`.

### Common issues
- **Service name mismatch**  
  Use:
  ```powershell
  Get-Service | Where-Object {$_.Name -match "memurai|redis"}
  ```
- **Port conflict (6379)**  
  Stop conflicting process or change Redis port in config and API env.

---

## 1.6 Optional: Docker Desktop (alternative infra approach)

If you prefer containerized infra instead of native DB/Redis:

```powershell
winget install --id Docker.DockerDesktop -e --source winget
```

After install:
1. Restart PC once.
2. Launch Docker Desktop and wait until it says “Running”.
3. Then from repo root:
   ```bash
   docker compose up -d
   ```

---

## 2) Required VS Code extensions

Install these extensions:

1. ESLint (`dbaeumer.vscode-eslint`)
2. Prettier - Code formatter (`esbenp.prettier-vscode`)
3. Prisma (`Prisma.prisma`)
4. Docker (`ms-azuretools.vscode-docker`)
5. EditorConfig (`EditorConfig.EditorConfig`)
6. GitLens (`eamodio.gitlens`)
7. Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
8. REST Client (`humao.rest-client`)

---

## 3) Clone repository and install project dependencies

## Step A — Clone
```bash
git clone <your-repo-url>
cd dhyana-stays
```

## Step B — Install workspace packages
```bash
pnpm install
```

## Step C — Verify lockfile consistency (optional)
```bash
pnpm install --frozen-lockfile
```

---

## 4) Create environment files (critical)

## 4.1 API env file

Create file: `apps/api/.env`

```env
NODE_ENV=development
PORT=3001
TZ=Asia/Kolkata
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

DATABASE_URL=postgresql://dhyana:dhyana@localhost:5432/dhyana_stays?schema=public

JWT_ACCESS_SECRET=replace_with_long_secret_32_chars_minimum
JWT_REFRESH_SECRET=replace_with_long_secret_32_chars_minimum
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
ALLOWED_ORIGINS=http://localhost:3000

# IMPORTANT: Keep blank for local custom JWT mode
AUTH0_DOMAIN=
AUTH0_AUDIENCE=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

MEILI_URL=http://localhost:7700
MEILI_MASTER_KEY=meili_dev_key
```

## 4.2 Web env file

Create file: `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_MODE=custom
```

---

## 5) Prepare database schema + seed data

From repo root:

```bash
pnpm --filter @dhyana/api prisma:generate
pnpm --filter @dhyana/api prisma:migrate
pnpm --filter @dhyana/api seed
```

---

## 6) Start the application

Use 2 terminals in repo root.

## Terminal 1 — API
```bash
pnpm --filter @dhyana/api start:dev
```

Expected:
- API starts on `http://localhost:3001/api`
- You see Nest logs and periodic job logs.

## Terminal 2 — Web
```bash
pnpm --filter @dhyana/web dev
```

Expected:
- Web starts on `http://localhost:3000`.

---

## 7) Default working credentials

- Email: `admin@dhyanastays.com`
- Password: `Password@123!`

---

## 8) Quick smoke tests

## 8.1 Login
```bash
curl -X POST http://localhost:3001/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@dhyanastays.com\",\"password\":\"Password@123!\"}"
```

## 8.2 Auth me
```bash
curl http://localhost:3001/api/auth/me ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 8.3 Admin endpoint
```bash
curl http://localhost:3001/api/admin/hosts/pending ^
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 9) Dependency-specific troubleshooting

## Git
- Reopen terminal after install.
- Verify `where git`.

## Node/npm/pnpm
- Ensure no old Node versions shadow PATH.
- Reopen terminal after global pnpm install.

## PostgreSQL
- Ensure service is running.
- Ensure port `5432` is open.
- Ensure DB/user exists exactly as configured in `DATABASE_URL`.

## Redis
- Ensure Memurai/Redis service is running.
- Ensure API env points to same host/port.

## Auth mode mismatch (important)
If login works but protected endpoints return 401:
- Ensure in `apps/api/.env`:
  - `AUTH0_DOMAIN=`
  - `AUTH0_AUDIENCE=`
- Restart API and login again for fresh token.

---

## 10) Lint and tests

```bash
pnpm --filter @dhyana/api lint
pnpm --filter @dhyana/api test
pnpm --filter @dhyana/web lint
```

If web lint prompts once for config, choose **Strict** and rerun.

---

## 11) Final checklist (new machine ready)

- [ ] Git installed and working
- [ ] Node 22+ installed
- [ ] pnpm 10+ installed
- [ ] PostgreSQL running and DB/user created
- [ ] Redis/Memurai running
- [ ] `pnpm install` completed
- [ ] `apps/api/.env` created correctly
- [ ] `apps/web/.env.local` created correctly
- [ ] Prisma migrate + seed successful
- [ ] API + web running
- [ ] Admin login successful with `admin@dhyanastays.com`
- [ ] `/api/auth/me` works with bearer token

Setup complete.
