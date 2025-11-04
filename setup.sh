#!/bin/bash
# Auto-setup script for The VoTer GuidEr

set -e

cd /Users/bob/Projects/politics-apps/the-voter-guider

echo "🚀 Starting auto-setup for The VoTer GuidEr..."

# 1. Install dependencies
echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

# 2. Create .env if it doesn't exist
echo ""
echo "📝 Step 2: Setting up environment file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env file from template"
  echo "⚠️  IMPORTANT: Edit .env and add your DATABASE_URL from Neon PostgreSQL"
else
  echo "✅ .env file already exists"
fi

# 3. Check if DATABASE_URL is set
echo ""
echo "🔍 Step 3: Checking database configuration..."
if grep -q "DATABASE_URL=\"postgresql://user:password@" .env 2>/dev/null; then
  echo "⚠️  DATABASE_URL appears to be a template - update it with your actual Neon PostgreSQL URL"
  SKIP_DB=true
elif grep -q "DATABASE_URL=" .env 2>/dev/null; then
  echo "✅ DATABASE_URL found in .env"
  SKIP_DB=false
else
  echo "⚠️  DATABASE_URL not found in .env - database operations will be skipped"
  SKIP_DB=true
fi

# 4. Generate Prisma client (always try)
echo ""
echo "🔧 Step 4: Generating Prisma client..."
if [ "$SKIP_DB" = false ]; then
  npx prisma generate 2>&1 | tail -5 || echo "⚠️  Prisma generation failed - check DATABASE_URL"
else
  echo "⏭️  Skipping Prisma generate (no DATABASE_URL)"
fi

# 5. Initialize git if needed
echo ""
echo "📚 Step 5: Setting up Git..."
if [ ! -d .git ]; then
  git init
  echo "✅ Git initialized"
else
  echo "✅ Git already initialized"
fi

# 6. Build check
echo ""
echo "🏗️  Step 6: Building project..."
npm run build 2>&1 | tail -10 || echo "⚠️  Build failed - this is normal if DATABASE_URL is not set"

# Summary
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
if [ "$SKIP_DB" = true ]; then
  echo "1. Set up Neon PostgreSQL database:"
  echo "   - Go to https://neon.tech"
  echo "   - Create new project"
  echo "   - Copy DATABASE_URL from Dashboard > Connection Details"
  echo "   - Update .env file with your DATABASE_URL"
  echo ""
  echo "2. Run database migrations:"
  echo "   npx prisma migrate dev"
  echo ""
  echo "3. Seed initial data:"
  echo "   npm run seed"
  echo ""
fi
echo "4. Start development server:"
echo "   npm run dev"
echo ""
echo "5. Open in browser:"
echo "   http://localhost:3000"
echo ""
echo "════════════════════════════════════════════════════════"

