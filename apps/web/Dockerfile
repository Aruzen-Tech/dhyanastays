# ── Stage 1: Install dependencies ────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --filter @dhyana/web...

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN pnpm --filter @dhyana/web build

# ── Stage 3: Production runtime ──────────────────────────────────────
FROM node:22-alpine AS runtime
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app

COPY --from=build --chown=appuser:appgroup /app/apps/web/.next/standalone ./
COPY --from=build --chown=appuser:appgroup /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=appuser:appgroup /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER appuser
CMD ["node", "server.js"]
