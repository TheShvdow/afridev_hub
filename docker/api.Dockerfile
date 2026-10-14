# ─────────────────────────────────────────────────────────────────
# AfriDev Hub — API (NestJS) Dockerfile
# Multi-stage build pour production
# ─────────────────────────────────────────────────────────────────

# ── Stage 1 : Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les manifestes de dépendances
COPY package*.json ./
COPY tsconfig.base.json ./
COPY prisma/schema.prisma ./prisma/

# Installer les dépendances (avec devDependencies pour la compilation)
RUN npm ci --include=dev

# Générer le Prisma Client
RUN npx prisma generate --schema=prisma/schema.prisma

# Copier le code source
COPY apps/api/ ./apps/api/
COPY libs/ ./libs/

# Builder l'API avec Nx
RUN npx nx build api --configuration=production --skip-nx-cache

# ── Stage 2 : Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copier les dépendances de production uniquement
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copier le Prisma client et les migrations
COPY prisma/ ./prisma/
RUN npx prisma generate --schema=prisma/schema.prisma

# Copier le build
COPY --from=builder /app/dist/apps/api ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
