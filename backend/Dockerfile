# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

# Version spécifique de pnpm - bon!
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers de configuration d'abord (pour meilleur cache Docker)
COPY backend/package.json backend/pnpm-lock.yaml* ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile --prefer-offline

# Copie du code source
COPY . ./

# Suppression du cache existant avant le build
RUN rm -rf dist && rm -rf node_modules/.cache

# Construction
RUN pnpm run build

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=10000

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copie des fichiers de package
COPY backend/package.json backend/pnpm-lock.yaml* ./

# Installation des dépendances de production
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# Copie des fichiers construits depuis le builder
COPY --from=builder /app/dist ./dist

# Création des dossiers nécessaires
RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app && \
    chmod -R 755 /app

USER node

EXPOSE 10000

CMD ["node", "dist/main.js"]