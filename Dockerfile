FROM node:18-alpine

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copier les fichiers de dépendances
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

# Installer les dépendances
RUN cd backend && pnpm install --frozen-lockfile

# Copier le reste du code
COPY backend/ ./backend/

# Générer le client Prisma (après avoir copié tout le code)
RUN cd backend && pnpm prisma generate

# Exécuter les migrations (en production, utilisez plutôt Railway console)
RUN cd backend && pnpm prisma migrate deploy || true

# Builder l'application
RUN cd backend && pnpm run build

# creation des différents dossier necessaire au bon fonctionnement du système /uploads , /backup , /logs dans le backend 
RUN mkdir -p /app/backend/uploads /app/backend/backup /app/backend/logs

EXPOSE 10000

CMD ["node", "backend/dist/src/main.js"]