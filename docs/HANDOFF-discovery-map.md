# Handoff Brief — Stay Discovery & Map Integration

**For:** the developer taking over discovery/search + map work
**Branch to work on:** `feature/discovery-map` (branched from `dev`)
**PR target when done:** `dev` (never push to `main` — that branch auto-deploys to the live staging environment)

---

## 1. Getting running (once)

Follow **[docs/SETUP.md](./SETUP.md)** end-to-end — prerequisites (Node 22,
pnpm 10.2.0, Postgres 16; Redis/Meilisearch optional), env files, migrations,
seed, and dev servers. You do NOT need any production secrets: Razorpay,
email, SMS, and storage all run in stub mode locally, and you seed your own
local admin with `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars.

Sanity check you're ready: `http://localhost:3000` shows the homepage,
`pnpm --filter @dhyana/api test` is green (260 tests).

## 2. Scope

**Track A — Discovery/search enhancement.** The current state: text search
(Meilisearch with automatic Postgres fallback) + faceted discovery (§5.18 —
experience tags, property type, dietary options, sort) on the homepage.

**Track B — Map integration.** The current state: react-leaflet map with
listing markers on the homepage (grid/map/split view) and a single-listing map
on the detail page. `GET /api/listings/map` serves the geo payload;
`Listing.latitude/longitude` are nullable floats.

## 3. The file map (where to work)

### Backend — `apps/api`
| File | Role |
|---|---|
| `src/listing/listing.service.ts` | Core logic: `discoverListings()` (facet query building), `searchListings()` (Meili + DB fallback), `meiliIndex()` (index sync), map query |
| `src/listing/public-listing.controller.ts` | Public routes: `GET /listings` (facets), `/listings/search`, `/listings/map`, `/listings/meta/tags`, `/listings/meta/facets` |
| `src/listing/listing.service.spec.ts` | Unit tests — extend with every behavior you add |
| `prisma/schema.prisma` | `Listing` model (`experienceTags`, `propertyType`, `latitude`, `longitude`) — new facet fields need a migration |

### Frontend — `apps/web`
| File | Role |
|---|---|
| `app/page.tsx` | The discovery surface: search input + debounce, facet chips, `runSearch()`, grid/map/split toggle |
| `components/ListingMap.tsx` | The Leaflet map component (markers, popups) — clustering/bounds work goes here |
| `app/listings/[id]/page.tsx` | Detail-page map |
| `lib/api.ts` | API client — `getPublic(facets)` builds the facet query string; add new params here |
| `lib/types.ts` | `DiscoveryFacets`, `Listing`, `FacetVocabulary` types |

## 4. Project conventions (non-negotiable)

1. **All money is integer paise** (1 INR = 100 paise). Never floats, never
   rupees, in any new filter (e.g. price-range facets compare paise).
2. **Search must work without Meilisearch.** The live staging deployment has
   no Meili — the Postgres fallback path in `searchListings()` is the one that
   actually runs in production today. Every search feature needs to work there.
3. **New facet fields** require all four: schema migration (numbered,
   idempotent — see `prisma/migrations/`), `meiliIndex()` document shape,
   `meta/facets` vocabulary, and the web `DiscoveryFacets` type.
4. **Styling**: use the design tokens (`brand-*`, `gray-*`, `gold`, `.card`,
   `.btn-primary`…) from `tailwind.config.ts`/`globals.css` — no hardcoded hex
   colors. The theme is nature-luxury (evergreen/ivory/gold) and auto-inverts
   in dark mode.
5. **Record your changes** in `CHANGELOG.md` (one-liner) and
   `docs/CHANGELOG-detailed.md` (files/rationale) — both, per repo convention.
6. **Lint/typecheck/tests must pass**: `pnpm --filter @dhyana/api lint`,
   `pnpm --filter @dhyana/api test`, and `pnpm --filter @dhyana/web build`
   (CI runs all of these on every push).

## 5. Guardrails — do NOT touch

- `src/booking/**`, `src/payment/**`, `src/pay-later/**`, `src/payout/**` —
  the booking/money engine is production-hardened and heavily tested; discovery
  work has no reason to modify it.
- `prisma/migrations/*` (existing ones) — append new migrations only.
- `render.yaml`, `Dockerfile*`, `.github/workflows/**` — deployment/CI config.
- Auth, RBAC guards, rate limiting, or anything in `src/common/**`.

If a feature seems to need changes there, stop and raise it instead.

## 6. Definition of done

- [ ] Works locally in both grid and map views, light + dark theme
- [ ] Search behavior verified with Meilisearch absent (don't start the container)
- [ ] Unit tests added/updated; `lint` + `test` + web `build` all green
- [ ] Migration (if any) is numbered, idempotent, and applies cleanly on a fresh DB
- [ ] Changelog entries in both files
- [ ] PR opened against `dev` with a description of endpoints/params added
