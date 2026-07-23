# ── Stage 1: Install dependencies ────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter @dhyana/api...

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Call prisma directly — the package's prisma:generate script wraps it in
# `dotenv -e .env`, and .env is (correctly) excluded from the build context.
RUN pnpm --filter @dhyana/api exec prisma generate
RUN pnpm --filter @dhyana/api build

# ── Stage 3: Production runtime ──────────────────────────────────────
# pnpm links each package's dependencies inside its own node_modules as
# RELATIVE symlinks into the root .pnpm store (apps/api/node_modules/@nestjs/
# common → ../../../node_modules/.pnpm/...). Both trees must therefore be
# preserved at the same workspace-relative paths — flattening dist to /app
# breaks module resolution (Cannot find module '@nestjs/common').
FROM node:22-alpine AS runtime
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
# Fonts for the Stay Pass renderer (resvg loads system fonts; none are fetched
# at render time). Noto covers Latin + Tamil + Devanagari guest names.
RUN apk add --no-cache fontconfig ttf-dejavu font-noto font-noto-tamil font-noto-devanagari
WORKDIR /app

COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=appuser:appgroup /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=appuser:appgroup /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=appuser:appgroup /app/apps/api/package.json ./apps/api/package.json

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

USER appuser
WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
