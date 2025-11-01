# ⚠️ IMPORTANT: Add Secrets to GitHub

You have a Vercel token. **DO NOT commit it to code.** Add it as a GitHub Secret instead.

## Quick Steps:

### 1. Go to GitHub Repository Settings
- Visit: `https://github.com/SifatAli008/OriginX/settings/secrets/actions`
- Or: Repository → **Settings** → **Secrets and variables** → **Actions**

### 2. Add VERCEL_TOKEN Secret
1. Click **"New repository secret"**
2. **Name:** `VERCEL_TOKEN`
3. **Secret:** `9nVJvN1RZ6nksx22QAa880hZ`
4. Click **"Add secret"**

### 3. Get and Add Other Required Secrets

You still need these two:

#### VERCEL_ORG_ID:
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Click your team/org name (top left)
- Go to **Settings** → **General**
- Find **"Team ID"** or **"Organization ID"**
- Copy it and add as secret named `VERCEL_ORG_ID`

#### VERCEL_PROJECT_ID:
- Go to [Vercel Dashboard](https://vercel.com/dashboard)
- Open your project
- Go to **Settings** → **General**
- Find **"Project ID"**
- Copy it and add as secret named `VERCEL_PROJECT_ID`

### 4. Verify
After adding all 3 secrets, you should see:
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID

### 5. Test
- Push a commit or re-run the workflow
- Deployment should now work!

## ⚠️ Security Note:
- **Never** share tokens publicly
- **Never** commit tokens to git
- **Always** use GitHub Secrets for sensitive data

