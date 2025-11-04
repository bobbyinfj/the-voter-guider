# Vercel Deployment Troubleshooting

## Common Issues and Solutions

### Issue: Build Never Starts or Fails Immediately

**Possible Causes:**
1. Missing `DATABASE_URL` environment variable during build
2. Prisma generate failing
3. TypeScript/linting errors
4. Node.js version mismatch

**Solutions:**

1. **Verify Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Make sure `DATABASE_URL` is set for **Production, Preview, and Development**
   - Check that the value is correct (no extra quotes, proper format)

2. **Check Build Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the failed deployment
   - Check the build logs for specific errors

3. **Verify Build Command:**
   - Settings → General → Build & Development Settings
   - Build Command should be: `prisma generate && next build`
   - Install Command should be: `npm install`

### Issue: Prisma Generate Fails

**Solution:**
Prisma generate should work without DATABASE_URL, but if it fails:

1. Make sure `@prisma/client` is in `package.json` dependencies (not devDependencies)
2. Try updating the build command to handle errors:
   ```bash
   npx prisma generate || echo "Prisma generate skipped" && npm run build
   ```

### Issue: Build Succeeds but App Doesn't Work

**Possible Causes:**
- Database migrations not run
- Environment variables not set correctly
- Database connection issues

**Solution:**
After first successful deployment, run migrations:
```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Manual Deployment Trigger

If automatic deployment isn't working:

1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Click "..." menu on latest deployment
4. Select "Redeploy"
5. Or push a new commit to trigger a new deployment

## Check Build Logs

The build logs will show:
- Installation steps
- Prisma generate output
- Next.js build output
- Any errors

Common errors:
- `Environment variable not found: DATABASE_URL` → Set env var in Vercel
- `Prisma Client not found` → Prisma generate failed
- `Module not found` → Missing dependency
- `TypeScript errors` → Fix type errors

## Verify Configuration

Your `vercel.json` should have:
```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

Your Vercel project settings should match:
- Framework: Next.js
- Build Command: `prisma generate && next build`
- Output Directory: `.next` (or leave empty for auto-detect)
- Install Command: `npm install`
- Node.js Version: 22.x (or latest)



