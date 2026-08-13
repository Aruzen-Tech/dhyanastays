# UI Design Manual — Dhyana Stays

Welcome! You're here to **improve how the app looks** — layout, spacing, colours,
components, polish — **without changing how it works**. This manual is everything
you need: what you may touch, how to set up, the design system to build with, and
the exact steps to ship a change.

> **The one sentence that matters:** change how things **look**, never how they
> **work**. All your work happens inside `apps/web`. You never touch the backend
> (`apps/api`) or the data layer.

---

## 1. The fence — what you may and may not change

### ✅ Safe to edit (pure UI)

| Path | What it is |
| --- | --- |
| `apps/web/components/**` | Reusable UI components — your main workspace |
| `apps/web/app/**/*.tsx` | Pages — **only the JSX markup and `className`/styling inside `return(...)`** |
| `apps/web/app/globals.css` | Global styles + the reusable component classes |
| `apps/web/tailwind.config.ts` | Design tokens (colours, fonts, radius, shadows) |
| `apps/web/public/**` | Images, icons, fonts, static assets |

### ⛔ Off-limits (backend structure & data flow)

| Path | Why it's off-limits |
| --- | --- |
| `apps/api/**` | The entire backend (NestJS). Never touch. |
| `packages/shared/**` | Shared types/contracts between front and back |
| `apps/web/lib/api.ts` | The API client — this **is** the front↔back data flow |
| `apps/web/hooks/**` | Data hooks (fetching, realtime) — app logic |
| `apps/web/context/**` | Auth / Feature / Theme providers — app logic |
| `apps/web/next.config.js`, `package.json`, `tsconfig.json` | Build/deps config |
| `prisma/**`, `.github/**` | Database & CI |

> These are enforced: pull requests that touch off-limits paths are **blocked by
> branch protection + a CI scope check**, and need the repo owner's explicit
> approval. So if a PR gets blocked, that's expected — not a bug.

### The grey area: `page.tsx` files

Page files mix **data** (fetching, state) and **presentation** (the JSX). You edit
the presentation only.

**Inside a `page.tsx`, you MAY change:**

- Anything inside the `return ( ... )` — the JSX markup, structure, and `className`s.
- Text/labels and how data is laid out and styled.

**You may NOT change:**

- `import` lines (especially anything from `lib/api`).
- `useState`, `useEffect`, hooks, and any function that fetches or sends data.
- The names of variables the JSX reads (e.g. if the code maps `booking.status`,
  keep reading `booking.status` — don't rename or invent fields).

If a redesign needs a **new piece of data** from the backend, that's a **request to
the owner**, not something you add yourself.

---

## 2. One-time setup

### Prerequisites

- **Node.js 22** (LTS). Check: `node -v`.
- **pnpm 10.2.0** — enable via Corepack (ships with Node):

  ```bash
  corepack enable
  corepack prepare pnpm@10.2.0 --activate
  pnpm -v   # should print 10.2.0
  ```

- **Git**, and a code editor (VS Code recommended).

### Get the code

```bash
git clone <REPO_URL>
cd "dhyana stays"
pnpm install
```

### Configure the web app to use the shared API

You do **not** run the backend. You point the web app at the owner's staging/live
API, so you design against real data.

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Then open `apps/web/.env.local` and set (ask the owner for the exact values):

```bash
NEXT_PUBLIC_API_URL=https://api.dhyanastays.in   # the shared staging/live API
NEXT_PUBLIC_AUTH_MODE=custom
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Run it

```bash
pnpm --filter @dhyana/web dev
```

Open <http://localhost:3000>. Edits hot-reload instantly.

### Logging in

Many pages require login. **Ask the owner for a test account** (ideally one guest,
one host, and one admin login) so you can see every screen. You can't create
backend accounts yourself — that's on purpose.

---

## 3. The design system — build with these, never hardcode

The app already has a design system (a calm, luxury wellness look: deep evergreen +
antique gold, Inter/Playfair type). **Always reuse these tokens and classes.** Never
paste raw hex colours or magic numbers — they break dark mode and consistency.

### Colours (Tailwind classes)

All colours are dark-mode aware — they auto-adjust when the theme flips. Use the
Tailwind class names, e.g. `bg-brand-700`, `text-gray-600`, `border-gray-200`.

| Token | Use for |
| --- | --- |
| `brand-50 … brand-900` | Primary brand (evergreen). Buttons, links, accents. |
| `gold` | Luxury accent — sparingly, for highlights |
| `surface` | Page background |
| `white`, `gray-50 … gray-900` | Text, borders, surfaces (auto-invert in dark) |
| `muted` | Secondary/subtle text |
| `pure.white`, `pure.black` | Fixed values that must **never** invert (rare) |

> ❌ Don't write `style={{ color: '#224d38' }}` or `text-[#16a34a]`.
> ✅ Do write `text-brand-700`.

### Typography

- `font-sans` → **Inter** (body/UI).
- `font-serif` → **Playfair Display** (elegant headings).

### Shape & depth

- Radius: `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
- Shadows: `shadow-card`, `shadow-card-hover`, `shadow-glass`, `shadow-glow`.

### Reusable component classes (from `globals.css`)

Prefer these over rebuilding styles from scratch:

| Class | What it is |
| --- | --- |
| `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-danger` | Buttons |
| `.input` `.label` | Form fields |
| `.card` `.card-hover` | Cards |
| `.glass` `.glass-card` `.glass-nav` `.gradient-border` | Glassmorphism surfaces |
| `.container-page` | Standard page width + horizontal padding |
| `.page-title` `.eyebrow` | Headings / section kickers |
| `.alert-info` `.alert-error` `.alert-success` | Inline messages |
| `.badge` + `.badge-success` `.badge-error` `.badge-warning` | Status pills |
| `.divider` `.spinner` | Rule line / loading spinner |

If you need a genuinely new reusable style, add it under `@layer components` in
`globals.css` using `@apply` with existing tokens — don't scatter one-off hex values.

### Dark mode is mandatory

The app supports light **and** dark (`darkMode: 'class'`, toggled via the theme
switch in the UI). **Every change must look right in both.** Test by toggling the
theme. If you use the tokens/classes above, this mostly takes care of itself.

### Responsive is mandatory

Design must work at mobile, tablet, and desktop. Use Tailwind's responsive prefixes
(`sm:`, `md:`, `lg:`). Test by resizing the browser / using device toolbar.

---

## 4. How to ship a change — step by step

### Step 1 — Start from the latest `dev`

```bash
git checkout dev
git pull origin dev
```

### Step 2 — Create a UI branch

Name it `ui/<what-you-are-doing>`:

```bash
git checkout -b ui/listing-card-redesign
```

### Step 3 — Find the right file

- Reusable pieces (buttons, cards, navbar, modals) live in `apps/web/components/`.
- A specific screen lives in `apps/web/app/<area>/.../page.tsx`.
- Tip: search the visible text (a heading/label) across `apps/web` to jump to the file.

### Step 4 — Make the change (styling only)

Edit the JSX markup and `className`s. Use design tokens and the reusable classes.
Keep all hooks, imports, and data logic exactly as they are.

### Step 5 — Preview thoroughly

With `pnpm --filter @dhyana/web dev` running, check your screen in:

- ☀️ Light **and** 🌙 dark mode (toggle the theme).
- 📱 Mobile, 💻 tablet, 🖥️ desktop widths.
- Hover / focus / disabled / loading / empty states where relevant.

### Step 6 — Self-check (must pass before you push)

```bash
pnpm --filter @dhyana/web exec tsc --noEmit   # no type errors
pnpm --filter @dhyana/web lint                # no lint errors
```

Then confirm the [PR checklist](#5-pr-checklist) below.

### Step 7 — Commit

Write a clear message prefixed `ui:`:

```bash
git add apps/web
git commit -m "ui: redesign listing card with new shadow + spacing"
```

> Only `git add apps/web` — never stage backend files.

### Step 8 — Push and open a Pull Request

```bash
git push -u origin ui/listing-card-redesign
```

Open a PR on GitHub **into `dev`** (never `main`). Fill in the checklist and add
before/after screenshots (light + dark).

### Step 9 — Review

The owner reviews. They'll confirm it's UI-only and looks right. Address any
comments by pushing more commits to the same branch.

### Step 10 — Merge

The **owner merges** into `dev` (you won't have merge rights on protected branches —
that's intentional). It deploys from there.

---

## 5. PR checklist

Copy this into every PR description and tick each box:

```text
### UI change checklist
- [ ] Only files under `apps/web/` are changed
- [ ] No changes to `lib/api.ts`, `hooks/`, `context/`, or any `apps/api` file
- [ ] No data logic touched (imports, hooks, fetch calls, field names unchanged)
- [ ] Uses design tokens / existing classes — no hardcoded hex or magic numbers
- [ ] Looks correct in BOTH light and dark mode
- [ ] Responsive at mobile / tablet / desktop
- [ ] `tsc --noEmit` and `lint` pass locally
- [ ] Before/after screenshots attached (light + dark)
```

---

## 6. Do / Don't examples

### ✅ Good — restyle a button

```tsx
// before
<button className="bg-green-600 text-white px-3 py-1 rounded">Book now</button>

// after — uses the design-system class
<button className="btn-primary">Book now</button>
```

### ✅ Good — improve a card's layout (data untouched)

```tsx
// You changed spacing, radius, shadow — NOT what `listing` is or where it came from
<div className="card p-5 hover:shadow-card-hover transition-shadow">
  <h3 className="font-serif text-lg text-gray-900">{listing.title}</h3>
  <p className="text-sm text-muted">{listing.location}</p>
</div>
```

### ⛔ Bad — changing data flow

```tsx
// DON'T add/alter API calls, fields, or endpoints:
const data = await api.get('/listings?includeSecretField=true'); // ❌ backend flow
fetch('/api/new-endpoint')                                        // ❌ new contract
```

### ⛔ Bad — editing the API client or hooks

Touching `apps/web/lib/api.ts`, `apps/web/hooks/`, or anything in `apps/web/context/`
is off-limits — those define how the app talks to the backend and manages auth.

---

## 7. Troubleshooting

| Problem | Fix |
| --- | --- |
| `pnpm` wrong version | `corepack prepare pnpm@10.2.0 --activate` |
| Port 3000 in use | Stop the other process, or run `next dev -p 3001` |
| Blank data / 401s | Check `NEXT_PUBLIC_API_URL` in `.env.local`; log in with a test account |
| Can't log in | Ask the owner for valid test credentials on the staging API |
| Styles not updating | Save the file; if stuck, restart `pnpm --filter @dhyana/web dev` |
| A colour looks wrong in dark mode | You hardcoded a value — switch to a token (`brand-*`, `gray-*`) |
| Your PR is blocked by CI/owner | You touched an off-limits path — revert that file; keep changes in `apps/web` UI only |

---

## 8. Asking for backend changes

If a design needs something the backend doesn't provide yet (a new field, a new
status, different data), **don't build it** — open an issue or message the owner
describing what you need and why. They'll add it, then you can style it.

---

**In short:** work in `apps/web`, reuse the design system, keep data logic
untouched, test light + dark + responsive, and open a PR into `dev`. Happy
designing! 🎨
