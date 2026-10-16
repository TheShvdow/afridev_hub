# ─────────────────────────────────────────────────────────────────
# AfriDev Hub — API (NestJS) Dockerfile
# Multi-stage build pour production
# Contexte de build : racine du monorepo
# ─────────────────────────────────────────────────────────────────

# ── Stage 1 : Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Prisma a besoin d'OpenSSL sur Alpine pour détecter le bon moteur
RUN apk add --no-cache openssl

WORKDIR /app

# Copier les manifestes de dépendances
COPY package*.json ./
COPY nx.json tsconfig.base.json ./
COPY prisma/schema.prisma ./prisma/

# Installer les dépendances (avec devDependencies pour la compilation)
# Le script "prepare" génère aussi le Prisma Client
RUN npm ci --include=dev

# Générer le Prisma Client (explicite, au cas où prepare serait ignoré)
RUN npx prisma generate --schema=prisma/schema.prisma

# Copier le code source
COPY apps/api/ ./apps/api/
COPY libs/ ./libs/

# Builder l'API avec Nx (rootDir = racine du monorepo :
# sortie dist/apps/api/apps/api/src/main.js)
ENV NX_DAEMON=false NX_NO_CLOUD=true
RUN npx nx build api --configuration=production --skip-nx-cache

# ── Stage 2 : Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copier les dépendances de production uniquement
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Le CLI prisma est une devDependency : on réutilise le client
# généré au build plutôt que de relancer `prisma generate` ici
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma/ ./prisma/

# Copier le build
COPY --from=builder /app/dist/apps/api ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/apps/api/src/main.js"]
