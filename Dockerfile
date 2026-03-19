FROM node:18-alpine

# Installer pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copier les fichiers de dépendances
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

# Installer les dépendances
RUN cd backend && pnpm install --frozen-lockfile --prod

# creation des différents dossier necessaire au bon fonctionnement du système /uploads , /backup , /logs dans le backend 
RUN mkdir -p /app/backend/uploads /app/backend/backup /app/backend/logs

# Copier le reste du code
COPY backend/ ./backend/

EXPOSE 10000

CMD ["node", "backend/dist/src/main.js"]