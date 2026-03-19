# ==================== DOCKERFILE PRODUCTION - BACKEND NESTJS ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie du code source
COPY . .

# Génération du client Prisma et build
RUN pnpm prisma generate
RUN pnpm run build

# Nettoyage pour la production
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# ==================== STAGE 2 : PRODUCTION ====================
FROM node:20-alpine AS production

# Configuration de sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Installation des dépendances système
RUN apk add --no-cache dumb-init curl && rm -rf /var/cache/apk/*

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers depuis le builder
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Création des répertoires nécessaires dans le backend
RUN mkdir -p ./uploads ./logs ./backup && \
    chown -R nestjs:nodejs ./uploads ./logs ./backup

# Changement d'utilisateur
USER nestjs

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=10000

# Exposition du port
EXPOSE 10000

# Démarrage
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]