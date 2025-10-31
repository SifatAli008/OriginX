# CI/CD Pipeline Documentation

This repository uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)
Runs on every push to `main` and `develop` branches, and on pull requests.

**Jobs:**
- **Lint and Type Check**: Runs ESLint and TypeScript type checking
- **Build**: Builds the Next.js application to verify it compiles correctly
- **Deploy**: Automatically deploys to Vercel (only on pushes to `main`)

### 2. PR Checks (`pr-checks.yml`)
Runs on pull requests to ensure code quality before merging.

**Jobs:**
- **Code Quality Checks**: Runs linting and type checking
- **Build Test**: Verifies the application can be built successfully

### 3. Vercel Deployment (`vercel-deploy.yml`)
Production deployment workflow that runs on pushes to `main` and version tags.

## Required Secrets

To enable Vercel deployment, add these secrets to your GitHub repository:

1. Go to: `Settings` → `Secrets and variables` → `Actions`
2. Add the following secrets:

### Vercel Secrets
- `VERCEL_TOKEN`: Your Vercel authentication token
  - Get it from: [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
  
- `VERCEL_ORG_ID`: Your Vercel Organization ID
  - Found in: Vercel Dashboard → Settings → General
  
- `VERCEL_PROJECT_ID`: Your Vercel Project ID
  - Found in: Vercel Dashboard → Your Project → Settings → General

### Optional: Firebase Secrets (for build)
If you want to use real Firebase config during CI builds, add:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Note: These are optional as the build uses placeholder values by default.

## Setup Instructions

1. **Get Vercel Token:**
   ```bash
   # Visit https://vercel.com/account/tokens
   # Create a new token and copy it
   ```

2. **Get Vercel IDs:**
   - Install Vercel CLI: `npm i -g vercel`
   - Run: `vercel link`
   - Check `.vercel/project.json` for IDs, or find them in Vercel dashboard

3. **Add Secrets to GitHub:**
   - Repository → Settings → Secrets and variables → Actions
   - Add all required secrets listed above

4. **Enable GitHub Actions:**
   - Actions are enabled by default
   - You can view runs in the "Actions" tab

## Workflow Behavior

- **On Push to Main**: Runs all checks + deploys to Vercel production
- **On Pull Request**: Runs quality checks only (no deployment)
- **On Push to Develop**: Runs checks only (no deployment)
- **On Version Tags (v*)**: Deploys to Vercel production

## Manual Deployment

If you need to deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Troubleshooting

### Build Fails
- Check that all environment variables are set in Vercel dashboard
- Verify Node.js version compatibility
- Check build logs in GitHub Actions

### Deployment Fails
- Verify `VERCEL_TOKEN` is valid and not expired
- Check that `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Ensure Vercel project is linked correctly

### TypeScript Errors
- Run `npx tsc --noEmit` locally to check for errors
- Ensure all types are properly defined

