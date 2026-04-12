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

RUN pnpm --filter @dhyana/api prisma:generate
RUN pnpm --filter @dhyana/api build

# ── Stage 3: Production runtime ──────────────────────────────────────
FROM node:22-alpine AS runtime
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app

COPY --from=build --chown=appuser:appgroup /app/apps/api/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/apps/api/prisma ./prisma
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/apps/api/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

USER appuser
CMD ["node", "dist/main.js"]
