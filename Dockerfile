FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client for database operations
RUN apk add --no-cache postgresql-client

# Enable corepack first
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copier les fichiers de dépendances
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

# Installer les dépendances
RUN cd backend && pnpm install --frozen-lockfile

# Copier le reste du code
COPY backend/ ./backend/

# Make scripts executable
RUN chmod +x ./backend/scripts/init-database.sh

# Générer le client Prisma avec npx
RUN cd backend && pnpm prisma generate

# Builder l'application
RUN cd backend && pnpm build

# creation des différents dossier necessaire au bon fonctionnement du système
RUN mkdir -p /app/backend/uploads /app/backend/backup /app/backend/logs

EXPOSE 10000

# Initialize database and start application
CMD ["/bin/sh", "-c", "cd /app && ./backend/scripts/init-database.sh && node backend/dist/src/main.js"]