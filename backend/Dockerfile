# Railway Build Configuration for NestJS Backend
# This file tells Railway how to build and deploy your NestJS application

# Use Node.js 20 (matching your Dockerfile)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN pnpm prisma generate

# Build the application
RUN pnpm run build

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# Expose port
EXPOSE 10000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Start the application
CMD ["node", "dist/src/main.js"]
