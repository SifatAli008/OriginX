# Quick Setup Guide - Fix "Missing Secrets" Error

## ⚠️ Error: Missing required Vercel secrets

If you're seeing this error, you need to add the secrets to GitHub.

## Step-by-Step Fix

### 1. Open GitHub Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)

### 2. Add Each Secret

Click **"New repository secret"** for each one:

#### Secret 1: VERCEL_TOKEN
- **Name:** `VERCEL_TOKEN`
- **Value:** Your Vercel token (get it from https://vercel.com/account/tokens)
  - Go to https://vercel.com/account/tokens
  - Click "Create Token"
  - Give it a name like "GitHub Actions"
  - Copy the full token (it should be a long string)

#### Secret 2: VERCEL_ORG_ID
- **Name:** `VERCEL_ORG_ID`
- **Value:** Your Vercel Organization/Team ID
  - Go to Vercel Dashboard
  - Click your organization/team name (top left)
  - Go to **Settings** → **General**
  - Find **"Team ID"** or **"Organization ID"**
  - Copy it

#### Secret 3: VERCEL_PROJECT_ID
- **Name:** `VERCEL_PROJECT_ID`
- **Value:** Your Vercel Project ID
  - Go to Vercel Dashboard
  - Open your project
  - Go to **Settings** → **General**
  - Find **"Project ID"**
  - Copy it

### 3. Verify Secrets Are Added

After adding all three secrets, you should see them listed in:
- **Settings** → **Secrets and variables** → **Actions**

⚠️ **Important:** Secrets are masked in GitHub - you won't be able to see their values after saving.

### 4. Re-run the Workflow

After adding secrets:
1. Go to **Actions** tab
2. Find the failed workflow
3. Click **"Re-run all jobs"** or push a new commit

## 🔍 How to Get Values (Alternative Method)

If you're already logged into Vercel CLI locally:

```bash
# Install Vercel CLI if not installed
npm install -g vercel

# Link your project (if not already linked)
vercel link

# This creates a .vercel/project.json file
# Open it to see your project ID and org ID
cat .vercel/project.json
```

**Note:** The `.vercel` folder should be in `.gitignore` - never commit it!

## ✅ Verification Checklist

- [ ] VERCEL_TOKEN added in GitHub Secrets
- [ ] VERCEL_ORG_ID added in GitHub Secrets
- [ ] VERCEL_PROJECT_ID added in GitHub Secrets
- [ ] All secrets are marked as "Repository secrets"
- [ ] Token is the full string (not truncated)
- [ ] Workflow re-run after adding secrets

## 🆘 Still Having Issues?

1. **Token looks incomplete?** Vercel tokens are usually longer. Make sure you copied the entire token.

2. **Can't find the IDs?** Use Vercel CLI method above or check:
   - Org ID: Dashboard → Team Settings → General
   - Project ID: Dashboard → Project → Settings → General

3. **Secrets not working?** 
   - Make sure they're added in the correct repository
   - Check that secret names match exactly (case-sensitive)
   - Try re-running the workflow

4. **Need more help?** See `.github/workflows/SETUP.md` for detailed instructions.

