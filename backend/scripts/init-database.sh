#!/bin/bash

# Script to initialize database with migrations
# Usage: ./init-database.sh

set -e

echo "🚀 Initializing database..."

# Wait for database to be ready
echo "Waiting for database connection..."
sleep 5

# Extract database connection info from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Database URL: $DATABASE_URL"

# Generate Prisma client
echo "📦 Generating Prisma client..."
cd /app/backend && pnpm prisma generate

# Push database schema (creates database if it doesn't exist)
echo "🗄️ Creating database schema..."
cd /app/backend && pnpm prisma db push --force-reset

# Run migrations
echo "🔄 Running database migrations..."
cd /app/backend && pnpm prisma migrate deploy

echo "✅ Database initialized successfully!"
