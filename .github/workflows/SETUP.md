# Quick Setup Guide for CI/CD

## Step 1: Get Vercel Credentials

### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# This will create a .vercel folder with your credentials
# Check .vercel/project.json for:
# - projectId (this is your VERCEL_PROJECT_ID)
# - orgId (this is your VERCEL_ORG_ID)
```

### Option B: From Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **General**
4. Find:
   - **Project ID** → This is `VERCEL_PROJECT_ID`
   - **Team ID** → This is `VERCEL_ORG_ID`

### Get Vercel Token
1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Give it a name (e.g., "GitHub Actions")
4. Copy the token → This is `VERCEL_TOKEN`

## Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret one by one:

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `VERCEL_TOKEN` | Your Vercel token | [Account Settings](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Your organization/team ID | Vercel Dashboard → Settings → General |
| `VERCEL_PROJECT_ID` | Your project ID | Vercel Dashboard → Project Settings → General |

### Optional: Firebase Secrets
If you want CI builds to use real Firebase config, add:

| Secret Name | Example Value |
|------------|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789:web:abc123` |

**Note:** These are optional. The CI will use placeholder values if not set.

## Step 3: Test the Pipeline

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "test: CI/CD pipeline"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub to watch the workflow run

## Step 4: Verify Deployment

After pushing to `main`, check:
- GitHub Actions tab: Should show green checkmarks
- Vercel Dashboard: Should show a new deployment
- Your live site: Should be updated

## Troubleshooting

### "Vercel deployment failed"
- Double-check `VERCEL_TOKEN` is valid (not expired)
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match your project
- Check the Actions logs for specific error messages

### "Build failed"
- Ensure all dependencies are in `package.json`
- Check that Node.js version matches (currently using v20)
- Review build logs in GitHub Actions

### "Type check failed"
- Run `npx tsc --noEmit` locally to find errors
- Fix TypeScript errors before pushing

## Workflow Summary

- **Push to `main`**: ✅ Lint → ✅ Type Check → ✅ Build → 🚀 Deploy to Vercel
- **Pull Request**: ✅ Lint → ✅ Type Check → ✅ Build Test (no deployment)
- **Push to `develop`**: ✅ Lint → ✅ Type Check → ✅ Build (no deployment)

## Need Help?

- Check GitHub Actions logs for detailed error messages
- Review [GitHub Actions Documentation](https://docs.github.com/en/actions)
- Review [Vercel CLI Documentation](https://vercel.com/docs/cli)

