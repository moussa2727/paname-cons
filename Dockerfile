FROM node:18-alpine

# Set the base working directory
WORKDIR /app

# 1. Enable Corepack for pnpm immediately
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. Copy dependency files first (better for caching)
# We use the relative path because WORKDIR /app is already set
COPY backend/package.json backend/pnpm-lock.yaml ./backend/

# 3. Change WORKDIR to the backend folder for subsequent commands
WORKDIR /app/backend

# 4. Install dependencies
RUN pnpm install --frozen-lockfile

# 5. Copy the rest of the backend source code
COPY backend/ .

# 6. Generate Prisma client & Build
RUN pnpm prisma generate
RUN pnpm build

# 7. Create necessary directories
RUN mkdir -p uploads backup logs

EXPOSE 10000

# 8. Start the app (adjust path if build output moved)
CMD ["node", "dist/src/main.js"]