# Step-by-Step: How to Get Vercel Organization/Team ID

## Method 1: From Vercel Dashboard (Recommended)

### Step 1: Log into Vercel
1. Go to [https://vercel.com/login](https://vercel.com/login)
2. Sign in with your account

### Step 2: Navigate to Your Team/Organization
1. Look at the **top left corner** of the Vercel dashboard
2. You'll see your **team/organization name** (next to the Vercel logo)
3. **Click on your team/organization name**

   ```
   [Vercel Logo] Your Team Name ▼
                  ↑
           Click here!
   ```

### Step 3: Go to Team Settings
1. After clicking your team name, you'll see a dropdown menu
2. Click on **"Settings"** (usually has a gear icon ⚙️)

   OR

   If you don't see a dropdown:
   - Look for a **"Settings"** link in the left sidebar
   - Click on it

### Step 4: Find Team ID
1. You'll be on the **"General"** settings page
2. Scroll down to find **"Team ID"** or **"Organization ID"**
3. It will look something like:
   ```
   Team ID: team_xxxxxxxxxxxxxxxxxxxx
   ```
   OR
   ```
   Organization ID: org_xxxxxxxxxxxxxxxxxxxx
   ```

### Step 5: Copy the ID
1. **Copy the entire ID** (including `team_` or `org_` prefix)
2. It should be a long string like: `team_abc123def456ghi789`

---

## Method 2: From Project Settings (Alternative)

If Method 1 doesn't work, try this:

### Step 1: Go to Your Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **your project name**

### Step 2: Open Project Settings
1. Click on the **"Settings"** tab (top menu)
2. Or click the **gear icon** ⚙️

### Step 3: Check General Tab
1. You should be on the **"General"** tab by default
2. Look for **"Team"** or **"Organization"** section
3. The Team ID might be shown there
4. If not, click on the team name link to go to team settings

---

## Method 3: Using Vercel CLI (If you have it installed)

### Step 1: Open Terminal
1. Open your terminal/command prompt
2. Make sure you're in your project directory

### Step 2: Run Vercel Link
```bash
vercel link
```

### Step 3: Check Project Config
If your project is already linked:
```bash
cat .vercel/project.json
```

This will show you:
```json
{
  "orgId": "team_xxxxxxxxxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxx"
}
```

The `orgId` is your **VERCEL_ORG_ID**!

---

## Method 4: From Browser Developer Tools

### Step 1: Open Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open **Developer Tools** (F12 or Right-click → Inspect)

### Step 2: Check Network Requests
1. Go to **Network** tab
2. Refresh the page (F5)
3. Look for API requests to Vercel
4. Check the request headers or response - Team ID is often visible there

---

## What the ID Looks Like

Your Organization/Team ID will be one of these formats:
- `team_xxxxxxxxxxxxxxxxxxxx` (most common)
- `org_xxxxxxxxxxxxxxxxxxxx`
- Just a long alphanumeric string

**Example formats:**
- `team_abc123def456ghi789jkl012`
- `org_xyz789uvw456rst123`

---

## Adding to GitHub Secrets

Once you have the ID:

1. Go to: `https://github.com/SifatAli008/OriginX/settings/secrets/actions`
2. Click **"New repository secret"**
3. **Name:** `VERCEL_ORG_ID`
4. **Secret:** Paste your Team ID (e.g., `team_abc123def456ghi789`)
5. Click **"Add secret"**

---

## Still Can't Find It?

If you're having trouble:

1. **Check if you're in a team:** Some accounts are personal accounts without a team ID
   - Solution: Create a team in Vercel, or use your account ID

2. **Contact Vercel Support:** [https://vercel.com/support](https://vercel.com/support)

3. **Check Vercel Documentation:** [https://vercel.com/docs](https://vercel.com/docs)

---

## Quick Checklist

- [ ] Logged into Vercel Dashboard
- [ ] Clicked on team/organization name (top left)
- [ ] Went to Settings → General
- [ ] Found "Team ID" or "Organization ID"
- [ ] Copied the full ID (including prefix)
- [ ] Added to GitHub as `VERCEL_ORG_ID` secret

---

## Visual Guide Locations

```
Vercel Dashboard Layout:
┌─────────────────────────────────────┐
│ [Logo] Your Team Name ▼  [User]   │ ← Click here
├─────────────────────────────────────┤
│                                     │
│  Settings → General                 │
│  ┌──────────────────────────────┐  │
│  │ Team ID: team_abc123...      │  │ ← Copy this
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

Good luck! 🚀


