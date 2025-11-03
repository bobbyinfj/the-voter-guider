# GitHub Repository Setup Guide

## Create Repository on GitHub

1. **Create new repository:**
   - Go to https://github.com/new
   - Repository name: `the-voter-guider`
   - Description: "A modern system for tracking voting choices across multiple jurisdictions"
   - Visibility: Public (or Private)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

2. **Push existing code:**
   ```bash
   cd /Users/bob/Projects/the-voter-guider
   git remote add origin git@github.com:YOUR_USERNAME/the-voter-guider.git
   git branch -M main
   git push -u origin main
   ```

## Set Up Collaborators

1. Go to repository Settings → Collaborators
2. Add collaborators by username or email
3. They'll receive an invitation email

## Repository Settings

### Enable GitHub Pages (optional)
- Settings → Pages
- Source: Deploy from a branch
- Branch: `main` / `docs` (if using static export)

### Enable GitHub Actions (for CI/CD)
- Actions tab → New workflow
- Use Next.js template or create custom

## Environment Variables (for CI/CD)

If using GitHub Actions, add secrets:
- Settings → Secrets and variables → Actions
- Add: `DATABASE_URL`, `SUPABASE_URL`, etc.

## Next Steps After GitHub Setup

1. ✅ Push code to GitHub
2. ✅ Connect to Vercel for deployment
3. ✅ Set up Supabase database
4. ✅ Add environment variables in Vercel
5. ✅ Run database migrations
6. ✅ Seed initial data

