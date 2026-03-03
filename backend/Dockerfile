# Étape 1: Build stage
FROM node:20-alpine AS builder

# Installation de pnpm
RUN npm install -g pnpm@10.29.2

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml ./

# Installation des dépendances
RUN pnpm install --frozen-lockfile --prod=false

# Copie du code source
COPY . .

# Build de l'application
RUN pnpm run build

# Étape 2: Production stage
FROM node:20-alpine AS production

# Installation de pnpm
RUN npm install -g pnpm@10.29.2

# Création de l'utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package.json pnpm-lock.yaml ./

# Installation des dépendances de production uniquement
RUN pnpm install --frozen-lockfile --prod

# Copie des fichiers build depuis l'étape builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Création du dossier uploads avec permissions
RUN mkdir -p /app/uploads && \
    chown -R nestjs:nodejs /app/uploads

# Passage à l'utilisateur non-root
USER nestjs

# Exposition du port
EXPOSE 10000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=10000

# Commande de démarrage
CMD ["node", "dist/main.js"]

# Labels pour l'optimisation
LABEL maintainer="Moussa Sangaré <moussa.sangare.ma@gmail.com>"
LABEL version="1.0.0"
LABEL description="NestJS backend for Paname Consulting's Application"
