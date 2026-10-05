#!/bin/bash
# Launch The VoTer GuidEr

set -e

cd "$(dirname "$0")"

# Check for .env.local
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  echo ""
  echo "Create it with:"
  echo "  echo 'DATABASE_URL=\"YOUR_NEON_POSTGRES_URI\"' > .env.local"
  echo ""
  echo "Get your Neon PostgreSQL connection string from: Dashboard → Connection Details"
  exit 1
fi

# Extract DATABASE_URL (handle special characters in password)
# Use awk to properly handle the = delimiter and preserve everything after it
DATABASE_URL=$(awk -F'=' '/^DATABASE_URL=/ {sub(/^[^=]*=/, ""); gsub(/^["'\'']|["'\'']$/, ""); print; exit}' .env.local)

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env.local"
  exit 1
fi

# Basic validation - check if it starts with postgresql://
if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
  echo "❌ Invalid DATABASE_URL format (must start with postgresql://)"
  exit 1
fi

export DATABASE_URL

# Verify DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is empty after extraction"
  exit 1
fi

# Generate Prisma client (with DATABASE_URL in environment)
echo "🔧 Generating Prisma client..."
export DATABASE_URL
npx prisma generate

# Push schema
echo ""
echo "📊 Setting up database..."
echo "   Connecting to: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "   (This may take 10-30 seconds on first connection...)"
export DATABASE_URL

# Apply committed migrations (never `db push --accept-data-loss`: it can drop data)
npx prisma migrate deploy

# Start server
echo ""
echo "🚀 Starting server at http://localhost:3000"
echo ""

npm run dev
