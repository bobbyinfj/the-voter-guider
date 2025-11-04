# Vercel Deployment Checklist

## Before Deployment

### ✅ 1. Environment Variables Set
Go to Vercel Dashboard → Settings → Environment Variables and verify:

- [ ] `DATABASE_URL` is set for **Production, Preview, AND Development**
- [ ] `GOOGLE_CIVIC_API_KEY` is set (optional, but recommended)
- [ ] Values are correct (no extra quotes, proper format)

**Important:** Make sure to select ALL environments (Production, Preview, Development) when adding variables!

### ✅ 2. Build Settings Verified
Go to Vercel Dashboard → Settings → General:

- [ ] Framework Preset: **Next.js**
- [ ] Build Command: `prisma generate && next build`
- [ ] Install Command: `npm install`
- [ ] Output Directory: `.next` (or leave empty)
- [ ] Node.js Version: **22.x** (or latest)

### ✅ 3. Repository Connected
- [ ] GitHub repository is connected to Vercel
- [ ] Correct branch is selected (usually `main`)
- [ ] Auto-deploy is enabled

## Deploy Now

### Option 1: Trigger via Git Push
```bash
# Make a small change and push
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

### Option 2: Manual Deploy in Vercel
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Click "Redeploy" on latest deployment
4. Or click "Create Deployment" → Select branch → Deploy

## Check Build Status

1. Go to Vercel Dashboard → Deployments
2. Click on the deployment
3. Check the build logs for:
   - ✅ Installation success
   - ✅ Prisma generate success
   - ✅ Next.js build success
   - ❌ Any errors (copy error messages)

## Common Build Errors

### Error: "Environment variable not found: DATABASE_URL"
**Fix:** Set `DATABASE_URL` in Vercel Environment Variables (all environments)

### Error: "Prisma Client not found"
**Fix:** Build command should include `prisma generate` before `next build`

### Error: "Module not found"
**Fix:** Check that all dependencies are in `package.json` (not just devDependencies)

### Error: TypeScript errors
**Fix:** Fix TypeScript errors locally first, then push

## After Successful Build

1. **Run Database Migrations:**
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

2. **Seed Database (Optional):**
   ```bash
   npm run seed
   ```

3. **Verify Deployment:**
   - Visit your Vercel URL
   - Check that the app loads
   - Test creating a guide

## If Deployment Still Fails

1. **Check Build Logs** - Copy the exact error message
2. **Verify Environment Variables** - Make sure they're set for all environments
3. **Test Build Locally:**
   ```bash
   npm install
   npx prisma generate
   npm run build
   ```
4. **Check Vercel Status:** https://www.vercel-status.com/


