#!/bin/bash
# Launch The VoTer GuidEr

set -e

cd "$(dirname "$0")"

# Check for .env.local
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  echo ""
  echo "Create it with:"
  echo "  echo 'DATABASE_URL=\"YOUR_SUPABASE_URI\"' > .env.local"
  echo ""
  echo "Get your Supabase URI from: Dashboard → Settings → Database → Connection pooling → URI"
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

# Check if it's a Supabase URL (accepts both .com and .co domains)
if [[ ! "$DATABASE_URL" =~ (supabase\.com|supabase\.co) ]]; then
  echo "⚠️  Warning: DATABASE_URL doesn't appear to be a Supabase URL"
  echo "   Continuing anyway - if connection fails, check your DATABASE_URL"
  echo ""
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

# Convert Transaction Pooler to Session Pooler for migrations
# Transaction Pooler doesn't support prepared statements, but Session Pooler does
if [[ "$DATABASE_URL" =~ pooler\.supabase\.com ]] && [[ ! "$DATABASE_URL" =~ pgbouncer=true ]]; then
  # Add ?pgbouncer=true to use Session Pooler mode (supports prepared statements)
  if [[ "$DATABASE_URL" =~ \? ]]; then
    # Already has query params, append
    DATABASE_URL="${DATABASE_URL}&pgbouncer=true"
  else
    # No query params, add it
    DATABASE_URL="${DATABASE_URL}?pgbouncer=true"
  fi
  export DATABASE_URL
  echo "   Using Session Pooler mode for migrations (supports prepared statements)..."
fi

# Run prisma db push (Prisma has its own timeout handling)
npx prisma db push --skip-generate --accept-data-loss

# Seed data (if needed)
echo ""
echo "🌱 Seeding data..."
npm run seed || true

# Start server
echo ""
echo "🚀 Starting server at http://localhost:3000"
echo ""

npm run dev
