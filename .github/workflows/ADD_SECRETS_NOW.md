# ⚠️ IMPORTANT Add Secrets to GitHub

You have a Vercel token. **DO NOT commit it to code.** Add it as a GitHub Secret instead.

## Quick Steps

### 1. Go to GitHub Repository Settings

- Visit: `https://github.com/SifatAli008/OriginX/settings/secrets/actions`
- Or: Repository → **Settings** → **Secrets and variables** → **Actions**

### 2. Add VERCEL_TOKEN Secret

1. Click **"New repository secret"**
2. **Name:** `VERCEL_TOKEN`
3. **Secret:** `9nVJvN1RZ6nksx22QAa880hZ`
4. Click **"Add secret"**

### 3. Add VERCEL_ORG_ID Secret

1. Click **"New repository secret"**
2. **Name:** `VERCEL_ORG_ID`
3. **Secret:** `team_9eEABLbyiHLdJRpp2L5GTlZF`
4. Click **"Add secret"**

### 4. Add VERCEL_PROJECT_ID Secret

1. Click **"New repository secret"**
2. **Name:** `VERCEL_PROJECT_ID`
3. **Secret:** `prj_UH8WS9uA4rBVwdCDnf541D5lg9sB` (you mentioned this earlier)
4. Click **"Add secret"**

### 5. Verify

After adding all 3 secrets, you should see:

- ✅ VERCEL_TOKEN = `9nVJvN1RZ6nksx22QAa880hZ`
- ✅ VERCEL_ORG_ID = `team_9eEABLbyiHLdJRpp2L5GTlZF`
- ✅ VERCEL_PROJECT_ID = `prj_UH8WS9uA4rBVwdCDnf541D5lg9sB`

### 6. Test

- Push a commit or re-run the workflow
- Deployment should now work!

## ⚠️ Security Note

- **Never** share tokens publicly
- **Never** commit tokens to git
- **Always** use GitHub Secrets for sensitive data
