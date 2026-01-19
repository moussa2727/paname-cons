# ============ ÉTAPE DE BUILD ============
FROM node:18-alpine AS builder

WORKDIR /app

# 1. Copie seulement les fichiers de dépendances d'abord (optimisation cache)
COPY package.json pnpm-lock.yaml* ./

# 2. Installation des dépendances
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# 3. Copie du code source
COPY . .

# 4. Build (si nécessaire)
RUN pnpm build

# ============ ÉTAPE DE PRODUCTION ============
FROM node:18-alpine AS production

WORKDIR /app

# 1. Copie des fichiers de dépendances depuis le builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./

# 2. Installation des dépendances de production
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --prod --frozen-lockfile

# 3. Copie des fichiers construits depuis le builder
COPY --from=builder /app/dist ./dist

# 4. Création des répertoires avec les bonnes permissions
RUN mkdir -p /app/uploads /app/logs && \
    chown -R node:node /app

USER node

EXPOSE 10000

CMD ["node", "dist/main.js"]