# Vercel Deployment Setup

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub Repository**: Ensure your code is pushed to GitHub
3. **Neon Database**: Your PostgreSQL database should be set up

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository (`the-voter-guider`)
3. Vercel will auto-detect Next.js

### 2. Configure Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `GOOGLE_CIVIC_API_KEY` - (Optional) Your Google Civic API key for real ballot data

### 3. Configure Build Settings

Vercel should auto-detect from `vercel.json`, but verify:
- **Framework Preset**: Next.js
- **Build Command**: `prisma generate && next build`
- **Install Command**: `npm install`
- **Output Directory**: `.next` (default)

### 4. Deploy

Click **Deploy** and wait for the build to complete.

### 5. Post-Deployment: Run Database Migrations

After first deployment, run migrations:

```bash
# Option 1: Via Vercel CLI
npx vercel env pull .env.local
npx prisma migrate deploy

# Option 2: Directly connect to your database
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### 6. Seed Database (Optional)

If you want to seed initial data:

```bash
# Via Vercel CLI or direct database connection
npm run seed
```

## Important Notes

- **Database Migrations**: Run `prisma migrate deploy` after first deployment
- **Prisma Client**: Must be generated during build (handled by buildCommand)
- **Environment Variables**: Never commit `.env.local` to git
- **API Keys**: Store all sensitive keys in Vercel Environment Variables

## Troubleshooting

### Build Fails with Prisma Error

Make sure `DATABASE_URL` is set in Vercel environment variables.

### Database Connection Issues

- Verify `DATABASE_URL` format is correct
- Check that your Neon database allows connections from Vercel IPs
- Ensure SSL mode is set correctly (`?sslmode=require`)

### Prisma Client Not Found

The build command should handle this, but if issues persist:
- Check that `prisma generate` runs before `next build`
- Verify `@prisma/client` is in `package.json` dependencies

## Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions


