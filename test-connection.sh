#!/bin/bash
# Quick test of database connection

cd "$(dirname "$0")"

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

export DATABASE_URL=$(awk -F'=' '/^DATABASE_URL=/ {sub(/^[^=]*=/, ""); gsub(/^["'\'']|["'\'']$/, ""); print; exit}' .env.local)

echo "Testing connection to Supabase..."
echo "Target: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/' | sed 's/\/.*//')"
echo ""

# Try simple connection test using Prisma (it has its own timeout)
echo "Attempting connection test..."
echo ""
npx prisma db execute --stdin <<< "SELECT 1 as test;" 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Connection successful!"
else
  echo ""
  echo "❌ Connection failed"
  echo ""
  echo "Possible issues:"
  echo "  1. Supabase project might be paused (check dashboard)"
  echo "  2. Network/firewall blocking connection"
  echo "  3. Incorrect DATABASE_URL"
  echo ""
  echo "Check Supabase Dashboard → Settings → Database"
fi

