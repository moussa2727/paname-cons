# ==================== DOCKERFILE PRODUCTION - BACKEND NESTJS ====================
# Optimisé pour le déploiement en production avec multi-stage build
# Base : Node.js 20 LTS Alpine pour une taille minimale et sécurité

# ==================== STAGE 1 : BUILD ====================
FROM node:20-alpine AS builder

# Configuration de base
WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Installation des dépendances de production et de développement
RUN pnpm install --frozen-lockfile

# Copie du code source
COPY . .

# Génération du client Prisma
RUN pnpm prisma generate

# Build de l'application NestJS
RUN pnpm run build

# Nettoyage des dépendances de développement pour la production
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# ==================== STAGE 2 : PRODUCTION ====================
FROM node:20-alpine AS production

# Configuration de sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Configuration de base
WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des fichiers de dépendances depuis le builder
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copie des fichiers générés
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Création des répertoires nécessaires avec permissions
RUN mkdir -p /app/uploads /app/backend/logs /app/backend/backups && \
    chown -R nestjs:nodejs /app/backend/uploads /app/backend/logs /app/backend/backups

# Changement d'utilisateur pour la sécurité
USER nestjs

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=10000

# Exposition du port
EXPOSE 10000

# Démarrage de l'application avec dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
