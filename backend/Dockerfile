FROM node:18-alpine

WORKDIR /app

# Copy ONLY les fichiers essentiels d'abord
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy TOUT le reste du code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main.js"]