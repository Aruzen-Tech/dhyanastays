# Auth0 Setup Guide — Dhyana Stays

This guide walks through every step needed to configure Auth0 for Dhyana Stays,
including tenant creation, application settings, API resource server, roles,
the Post Login Action that injects role claims, and all environment variables.

The system runs in **dual-mode**:
- **Mode A (Auth0)** — `NEXT_PUBLIC_AUTH0_DOMAIN` is set → Auth0 Universal Login, RS256 JWKS verification
- **Mode B (Custom)** — env vars are empty → existing email + password auth, HS256 JWT (default for local dev / CI)

---

## Prerequisites

- An Auth0 account (free tier is sufficient for development): https://auth0.com/signup
- The Dhyana Stays API running locally on port 3001
- The Dhyana Stays web app running locally on port 3000

---

## Step 1 — Create an Auth0 Tenant

1. Log in to https://manage.auth0.com
2. Click your avatar (top-right) → **Create tenant**
3. Fill in:
   - **Tenant Domain**: `dhyana-stays-dev` (or any name you prefer)
   - **Region**: `AU` (Australia) or `US` — pick the closest to India available on free tier
   - **Environment Tag**: `Development`
4. Click **Create**

> **Note**: Your tenant domain will be `dhyana-stays-dev.au.auth0.com` (or similar).
> This is your `AUTH0_DOMAIN` value.

---

## Step 2 — Create a Single Page Application

1. In the Auth0 Dashboard sidebar → **Applications** → **Applications**
2. Click **+ Create Application**
3. Fill in:
   - **Name**: `Dhyana Stays Web`
   - **Application Type**: `Single Page Application`
4. Click **Create**
5. You will land on the **Settings** tab. Note down:
   - **Domain** → this is `AUTH0_DOMAIN` / `NEXT_PUBLIC_AUTH0_DOMAIN`
   - **Client ID** → this is `NEXT_PUBLIC_AUTH0_CLIENT_ID`

### Configure Application URLs

Still on the Settings tab, scroll to **Application URIs** and fill in:

| Field | Value |
|---|---|
| **Allowed Callback URLs** | `http://localhost:3000/auth/callback` |
| **Allowed Logout URLs** | `http://localhost:3000` |
| **Allowed Web Origins** | `http://localhost:3000` |
| **Allowed Origins (CORS)** | `http://localhost:3000` |

> For production, add your production domain alongside the localhost values,
> separated by commas:
> `http://localhost:3000, https://dhyanastays.in/auth/callback`

6. Scroll to the bottom → click **Save Changes**

### Enable Refresh Token Rotation (recommended)

1. On the same Settings page → scroll to **Refresh Token Rotation**
2. Toggle **Rotation** → **Enabled**
3. Set **Reuse Interval** → `30` seconds
4. Click **Save Changes**

---

## Step 3 — Create an API (Resource Server)

This tells Auth0 what audience your access tokens are for.

1. Sidebar → **Applications** → **APIs**
2. Click **+ Create API**
3. Fill in:
   - **Name**: `Dhyana Stays API`
   - **Identifier**: `https://api.dhyanastays.in`
     *(This is a URI identifier — it does NOT need to be a real URL)*
   - **Signing Algorithm**: `RS256`
4. Click **Create**

> The **Identifier** value is your `AUTH0_AUDIENCE` / `NEXT_PUBLIC_AUTH0_AUDIENCE`.

### Enable RBAC Settings on the API

1. Click on the API you just created → **Settings** tab
2. Scroll to **RBAC Settings**
3. Toggle **Enable RBAC** → ON
4. Toggle **Add Permissions in the Access Token** → ON
5. Click **Save**

---

## Step 4 — Create Roles

1. Sidebar → **User Management** → **Roles**
2. Click **+ Create Role** and create three roles:

| Role Name | Description |
|---|---|
| `GUEST` | Can discover and book stays |
| `HOST` | Can list properties (requires admin approval) |
| `ADMIN` | Platform administrator — full access |

> Role names must be **exactly** `GUEST`, `HOST`, `ADMIN` (uppercase).
> The Post Login Action in Step 5 reads these values.

---

## Step 5 — Create the Post Login Action (Role Injection)

This Action runs after every login and injects the user's role into the
access token as a custom namespaced claim.

1. Sidebar → **Actions** → **Library**
2. Click **+ Build Custom**
3. Fill in:
   - **Name**: `Add Role to Token`
   - **Trigger**: `Login / Post Login`
   - **Runtime**: `Node 18` (or latest available)
4. Click **Create**
5. Replace the entire editor content with:

```javascript
/**
 * Auth0 Post Login Action — Dhyana Stays
 *
 * Injects the user's role into the access token as a namespaced claim.
 * The backend reads: https://dhyanastays.in/role
 *
 * Role priority:
 *  1. app_metadata.role  (set by admin or previous login)
 *  2. ext-role query param (passed during signup redirect from the app)
 *  3. Default: GUEST
 */
exports.onExecutePostLogin = async (event, api) => {
  const NAMESPACE = 'https://dhyanastays.in';
  const VALID_ROLES = ['GUEST', 'HOST', 'ADMIN'];

  // 1. Check app_metadata (persisted from previous logins or admin assignment)
  let role = event.user.app_metadata?.role;

  if (!role || !VALID_ROLES.includes(role)) {
    // 2. First login — check if a role was passed during the signup redirect
    //    The frontend passes: loginWithRedirect({ authorizationParams: { 'ext-role': 'HOST' } })
    const extRole = event.request.query?.['ext-role'];
    role = VALID_ROLES.includes(extRole) ? extRole : 'GUEST';

    // Persist to app_metadata so subsequent logins use the same role
    await api.user.setAppMetadata('role', role);
  }

  // Inject role into the access token (read by JwtStrategy.validate())
  api.accessToken.setCustomClaim(`${NAMESPACE}/role`, role);

  // Also inject email as a namespaced claim (fallback for Auth0 social logins
  // where the standard 'email' claim may not be present in the access token)
  api.accessToken.setCustomClaim(`${NAMESPACE}/email`, event.user.email);
};
```

6. Click **Deploy** (top-right button)

### Wire the Action into the Login Flow

1. Sidebar → **Actions** → **Flows**
2. Click **Login**
3. In the flow diagram, you will see **Start** → **Complete**
4. In the right panel under **Custom**, find **Add Role to Token**
5. Drag it into the flow between **Start** and **Complete**
6. Click **Apply** (top-right)

---

## Step 6 — Environment Variables

### Backend: `apps/api/.env`

Add these two lines to your existing `apps/api/.env` file:

```env
# ── Auth0 (optional — leave empty to use custom JWT auth) ────────────────────
# When AUTH0_DOMAIN is set, the API verifies JWTs via JWKS (RS256).
# When empty, the API uses static HS256 secret (JWT_ACCESS_SECRET).
AUTH0_DOMAIN=dhyana-stays-dev.au.auth0.com
AUTH0_AUDIENCE=https://api.dhyanastays.in
```

> Replace `dhyana-stays-dev.au.auth0.com` with your actual tenant domain from Step 1.

### Frontend: `apps/web/.env.local`

The file `apps/web/.env.local` was created for you. Fill in the values:

```env
# ── Auth0 ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_AUTH0_DOMAIN=dhyana-stays-dev.au.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id_from_step_2
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dhyanastays.in
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/auth/callback
```

> - `NEXT_PUBLIC_AUTH0_DOMAIN` — from Auth0 Dashboard → Applications → Your App → Domain
> - `NEXT_PUBLIC_AUTH0_CLIENT_ID` — from Auth0 Dashboard → Applications → Your App → Client ID
> - `NEXT_PUBLIC_AUTH0_AUDIENCE` — the API Identifier from Step 3
> - `NEXT_PUBLIC_AUTH0_REDIRECT_URI` — must match "Allowed Callback URLs" in Step 2

### How to find your values in the Auth0 Dashboard

```
Auth0 Dashboard
└── Applications
    └── Applications
        └── Dhyana Stays Web          ← click this
            └── Settings tab
                ├── Domain            → AUTH0_DOMAIN / NEXT_PUBLIC_AUTH0_DOMAIN
                └── Client ID         → NEXT_PUBLIC_AUTH0_CLIENT_ID

└── Applications
    └── APIs
        └── Dhyana Stays API          ← click this
            └── Settings tab
                └── Identifier        → AUTH0_AUDIENCE / NEXT_PUBLIC_AUTH0_AUDIENCE
```

---

## Step 7 — Restart the API and Web App

After updating the env files, restart both processes:

```powershell
# Terminal 1 — API
cd apps/api
pnpm start:dev

# Terminal 2 — Web
cd apps/web
pnpm dev
```

The API will log on startup:
```
[JwtStrategy] Auth0 mode: JWKS verification enabled (tenant: dhyana-stays-dev.au.auth0.com)
```

If `AUTH0_DOMAIN` is empty, it logs:
```
[JwtStrategy] Custom JWT mode: static HS256 secret
```

---

## Step 8 — Test the Integration

### Register as a Guest

1. Open http://localhost:3000/auth/register
2. Select **Guest** role
3. Click **Create guest account with Auth0**
4. Auth0 Universal Login opens → sign up with email + password
5. You are redirected to `/auth/callback` → spinner → `/dashboard`
6. Check the Auth0 Dashboard → User Management → Users → your new user
   - `app_metadata.role` should be `"GUEST"`

### Register as a Host

1. Open http://localhost:3000/auth/register
2. Select **Host** role
3. Click **Create host account with Auth0**
4. Complete Auth0 Universal Login
5. After redirect to `/dashboard`, you will see "Host verification pending"
6. Admin must approve the host before they can list properties

### Log in as an Existing User

1. Open http://localhost:3000/auth/login
2. Click **Continue with Auth0**
3. Auth0 Universal Login → enter credentials
4. Redirected to `/dashboard`

### Promote a User to Admin

1. Auth0 Dashboard → **User Management** → **Users**
2. Find the user → click their name
3. Scroll to **app_metadata** → click the edit (pencil) icon
4. Set:
   ```json
   {
     "role": "ADMIN"
   }
   ```
5. Click **Save**
6. The user must log out and log back in for the new role to take effect

---

## Step 9 — Verify Backend JWT Verification

The backend verifies Auth0 JWTs by fetching the public keys from:
```
GET https://{AUTH0_DOMAIN}/.well-known/jwks.json
```

You can verify this is working by calling `GET /api/auth/me` with an Auth0 access token:

```powershell
# Get a token from the browser (DevTools → Application → Local Storage → auth0spajs...)
# Or use the Auth0 Management API to get a test token

$token = "eyJ..."   # paste your Auth0 access token here

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

Expected response:
```json
{
  "id": "cm...",
  "email": "user@example.com",
  "fullName": "User Name",
  "role": "GUEST",
  "isActive": true,
  "auth0Sub": "auth0|abc123",
  "createdAt": "2026-03-03T...",
  "hostProfile": null
}
```

---

## Step 10 — POST /auth/sync Explained

After Auth0 login, the frontend automatically calls `POST /api/auth/sync`.
This endpoint upserts the user in our PostgreSQL database.

**Logic:**
1. Find user by `auth0Sub` → update name/email if changed
2. Find user by `email` → link `auth0Sub` (migration path for existing custom-auth users)
3. Create new user if not found (role from JWT claim or `desiredRole` body param)

**Request** (called automatically by `app/auth/callback/page.tsx`):
```http
POST /api/auth/sync
Authorization: Bearer <auth0_access_token>
Content-Type: application/json

{
  "fullName": "Optional override name"
}
```

**Response:**
```json
{
  "id": "cm...",
  "email": "user@example.com",
  "fullName": "User Name",
  "role": "GUEST",
  "isActive": true,
  "auth0Sub": "auth0|abc123",
  "createdAt": "2026-03-03T...",
  "hostProfile": null
}
```

---

## Step 11 — Switching Between Modes

### Switch to Auth0 mode
```env
# apps/api/.env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.dhyanastays.in

# apps/web/.env.local
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.dhyanastays.in
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Switch back to Custom JWT mode
```env
# apps/api/.env — leave empty or remove
AUTH0_DOMAIN=
AUTH0_AUDIENCE=

# apps/web/.env.local — leave empty or remove
NEXT_PUBLIC_AUTH0_DOMAIN=
NEXT_PUBLIC_AUTH0_CLIENT_ID=
NEXT_PUBLIC_AUTH0_AUDIENCE=
NEXT_PUBLIC_AUTH0_REDIRECT_URI=
```

Restart both processes after changing env vars.

---

## Step 12 — Production Checklist

Before deploying to production with Auth0:

- [ ] Add production domain to Auth0 Application URLs (Callback, Logout, Web Origins)
- [ ] Set `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` in production env (Render/Railway/etc.)
- [ ] Set `NEXT_PUBLIC_AUTH0_*` vars in Vercel/Netlify environment settings
- [ ] Change `NEXT_PUBLIC_AUTH0_REDIRECT_URI` to `https://yourdomain.com/auth/callback`
- [ ] Enable **Attack Protection** in Auth0 Dashboard → Security → Attack Protection
- [ ] Enable **Bot Detection** in Auth0 Dashboard → Security → Bot Detection
- [ ] Set up **Log Streaming** to your observability platform (Datadog, Logtail, etc.)
- [ ] Review Auth0 **Anomaly Detection** settings
- [ ] Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (used in custom JWT mode fallback)

---

## Troubleshooting

### "Invalid token" / 401 after Auth0 login
- Verify `AUTH0_DOMAIN` matches exactly (no `https://` prefix, no trailing slash)
- Verify `AUTH0_AUDIENCE` matches the API Identifier exactly
- Check the Post Login Action is deployed and wired into the Login flow

### Role is always GUEST even after setting app_metadata
- The user must log out and log back in after `app_metadata` is changed
- Verify the Post Login Action is deployed (not just saved)
- Check Auth0 Dashboard → Monitoring → Logs for Action execution errors

### "Allowed callback URL mismatch"
- Add `http://localhost:3000/auth/callback` to **Allowed Callback URLs** in the Auth0 Application settings
- Ensure `NEXT_PUBLIC_AUTH0_REDIRECT_URI` matches exactly

### CORS errors from the API
- Add `http://localhost:3000` to `ALLOWED_ORIGINS` in `apps/api/.env`
- Restart the API after changing env vars

### Custom JWT users can't log in via Auth0
- This is the migration path: when a user with the same email logs in via Auth0,
  `POST /auth/sync` automatically links their `auth0Sub` to the existing account
- The user's password remains in the DB but is no longer used for Auth0 logins
