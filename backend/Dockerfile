FROM node:20-alpine

# Installer PostgreSQL client tools pour pg_dump
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Enable corepack first
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copier les fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances
RUN pnpm install --frozen-lockfile

# Copier le code source
COPY . .

# Générer le client Prisma
RUN pnpm prisma generate

# Builder l'application
RUN pnpm build

# Exécuter les migrations
RUN pnpm prisma migrate deploy || true

# Création des dossiers nécessaires
RUN mkdir -p uploads backup logs

EXPOSE 10000

CMD ["node", "dist/src/main.js"]
