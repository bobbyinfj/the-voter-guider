#!/bin/bash
# Quick deploy script for The VoTer GuidEr

cd /Users/bob/Projects/the-voter-guider

echo "🚀 Deploying The VoTer GuidEr..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Build check
echo "🔨 Running build check..."
npm run build

echo ""
echo "✅ Ready to deploy!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Connect to Vercel: https://vercel.com/new"
echo "3. Or run: vercel (if CLI installed)"
echo ""

