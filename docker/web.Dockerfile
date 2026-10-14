# ─────────────────────────────────────────────────────────────────
# AfriDev Hub — Web (Angular SSR) Dockerfile
# Multi-stage build pour production
# ─────────────────────────────────────────────────────────────────

# ── Stage 1 : Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./

RUN npm ci --include=dev

COPY apps/web/ ./apps/web/
COPY libs/ ./libs/

# Builder l'app Angular avec SSR
RUN npx nx build web --configuration=production --skip-nx-cache

# ── Stage 2 : Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 angular

# Copier le build Angular (browser + server)
COPY --from=builder /app/dist/apps/web ./dist

# Installer uniquement express pour le SSR server
RUN npm install --omit=dev express

USER angular

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1))"

# Démarrer le serveur SSR Angular
CMD ["node", "dist/server/server.mjs"]
