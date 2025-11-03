#!/bin/bash
# Verify and fix DATABASE_URL format

cd "$(dirname "$0")"

echo "🔍 Checking DATABASE_URL in .env.local..."
echo ""

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

# Extract current URL
CURRENT=$(awk -F'=' '/^DATABASE_URL=/ {sub(/^[^=]*=/, ""); gsub(/^["'\'']|["'\'']$/, ""); print; exit}' .env.local)

if [ -z "$CURRENT" ]; then
  echo "❌ DATABASE_URL not found in .env.local"
  exit 1
fi

echo "Current DATABASE_URL (first 100 chars):"
echo "${CURRENT:0:100}..."
echo ""

# Check if it looks like Supabase Transaction Pooler
if [[ "$CURRENT" =~ pooler\.supabase\.com.*:6543 ]]; then
  echo "✅ Looks like Transaction Pooler (port 6543)"
elif [[ "$CURRENT" =~ db\..*\.supabase\.co.*:5432 ]]; then
  echo "⚠️  Using direct connection (port 5432)"
  echo "   Consider switching to Transaction Pooler for better performance"
elif [[ "$CURRENT" =~ @.*: ]]; then
  # Try to parse it
  if node -e "
    const {URL}=require('url');
    try {
      const u=new URL('$CURRENT');
      console.log('Parsed hostname:', u.hostname);
      console.log('Parsed port:', u.port || 'default');
      console.log('Has username:', !!u.username);
      console.log('Has password:', !!u.password);
      if (u.hostname.includes('SX1') || u.hostname.length < 5) {
        console.log('❌ ERROR: Hostname looks wrong - password may be parsed as hostname');
        process.exit(1);
      }
    } catch(e) {
      console.log('❌ URL parse error:', e.message);
      process.exit(1);
    }
  " 2>/dev/null; then
    echo "✅ URL format looks valid"
  else
    echo "❌ URL parsing failed - special characters in password need encoding"
  fi
else
  echo "❌ URL format unrecognized"
fi

echo ""
echo "If you see 'SX1' or parsing errors, your password needs URL encoding."
echo ""
echo "Get a fresh Transaction Pooler URI from Supabase Dashboard:"
echo "  Settings → Database → Connection pooling → Transaction Pooler URI"

