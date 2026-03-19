FROM node:18-alpine

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copier les fichiers de dépendances
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

# Installer les dépendances
RUN cd backend && pnpm install --frozen-lockfile

# Générer le client Prisma
RUN cd backend && pnpm prisma generate

# Copier le reste du code
COPY backend/ ./backend/

# Exécuter les migrations (en production, utilisez plutôt Railway console)
RUN cd backend && pnpm prisma migrate deploy || true

# creation des différents dossier necessaire au bon fonctionnement du système /uploads , /backup , /logs dans le backend 
RUN mkdir -p /app/backend/uploads /app/backend/backup /app/backend/logs

EXPOSE 10000

CMD ["node", "backend/dist/src/main.js"]