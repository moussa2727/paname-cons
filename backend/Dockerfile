# Étape de build
FROM node:18-alpine AS builder

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copier les fichiers de configuration
COPY package.json pnpm-lock.yaml* tsconfig.json ./

# Installer toutes les dépendances (y compris devDependencies pour la compilation)
RUN pnpm install --frozen-lockfile

# Copier les sources
COPY src/ ./src/
COPY nest-cli.json ./

# Builder l'application
RUN pnpm run build

# Étape de production
FROM node:18-alpine AS production

WORKDIR /app

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copier les fichiers de package
COPY package.json pnpm-lock.yaml* ./

# Installer uniquement les dépendances de production
RUN pnpm install --prod --frozen-lockfile

# Copier les fichiers compilés depuis le builder
COPY --from=builder /app/dist ./dist

# Sécurité : utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Port exposé (identique à votre configuration NestJS)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Commande de démarrage
CMD ["node", "dist/main.js"]