FROM node:18-alpine

WORKDIR /app

# Copier tous les fichiers de configuration d'abord
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Installer les dépendances
RUN npm install

# Copier tout le code source
COPY . .

# Builder l'application
RUN npm run build

# Exposer le port
EXPOSE 3000

# Démarrer l'application
CMD ["node", "dist/main.js"]