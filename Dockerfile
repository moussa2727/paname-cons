FROM node:20-alpine

WORKDIR /app

# Enable corepack first
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---------- FRONTEND DEPENDENCIES ----------
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN cd frontend && pnpm install --frozen-lockfile

# ---------- FRONTEND BUILD ----------
COPY frontend/ ./frontend/
RUN cd frontend && pnpm build

# Copier les fichiers de dépendances backend
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

# Installer les dépendances backend
RUN cd backend && pnpm install --frozen-lockfile

# Copier le reste du code backend
COPY backend/ ./backend/

# Copier le build du frontend dans le backend pour servir les fichiers statiques
RUN mkdir -p backend/public && cp -r frontend/dist/* backend/public/

# Générer le client Prisma
RUN cd backend && pnpm prisma generate

# Builder l'application backend
RUN cd backend && pnpm build

# Exécuter les migrations
RUN cd backend && pnpm prisma migrate deploy || true

# Création des dossiers nécessaires
RUN mkdir -p /app/backend/uploads /app/backend/backup /app/backend/logs

EXPOSE 10000

CMD ["node", "backend/dist/src/main.js"]