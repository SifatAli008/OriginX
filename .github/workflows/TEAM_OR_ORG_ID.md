# Team ID vs Organization ID - Which One Do I Need?

## Quick Answer: **Either One Works!** ✅

The Vercel API accepts both Team ID and Organization ID. They're essentially the same thing.

---

## What You'll See in Vercel Dashboard:

### Most Common (90% of cases):
- **"Team ID"** - Starts with `team_`
  - Example: `team_abc123def456ghi789`
  - This is what most accounts have

### Less Common:
- **"Organization ID"** - Starts with `org_`
  - Example: `org_xyz789uvw456rst123`
  - Some enterprise accounts use this

---

## How to Know Which One You Have:

### Step 1: Go to Vercel Dashboard
1. Visit [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your **team/organization name** (top left corner)

### Step 2: Go to Settings
- Click **Settings** → **General**

### Step 3: Look for the ID
You'll see one of these:
- ✅ **Team ID:** `team_xxxxxxxxxxxxxxxxxxxx` ← **Use this!**
- ✅ **Organization ID:** `org_xxxxxxxxxxxxxxxxxxxx` ← **Use this!**

**Both work the same way!**

---

## Which One Should I Use?

1. **If you see "Team ID"** → Use that (copy the full value including `team_` prefix)
2. **If you see "Organization ID"** → Use that (copy the full value including `org_` prefix)
3. **If you see both** → Use either one (they're the same)

---

## Personal Accounts (No Team):

If you're using a **personal account** without a team:
- You might not see a Team ID or Org ID
- **Solution:** Create a team in Vercel:
  1. Click your account name (top right)
  2. Go to **Settings** → **Teams**
  3. Create a new team
  4. Then you'll have a Team ID

---

## Example:

```bash
# Both of these formats work:
VERCEL_ORG_ID=team_abc123def456ghi789  ✅
VERCEL_ORG_ID=org_xyz789uvw456rst123   ✅
```

---

## Summary:

| What You See | What to Do |
|-------------|------------|
| **Team ID** | Copy it → Add as `VERCEL_ORG_ID` secret |
| **Organization ID** | Copy it → Add as `VERCEL_ORG_ID` secret |
| **Both** | Use either one |
| **Neither** | Create a team first |

**Bottom line: Use whatever ID you find in your Vercel settings - both work!** 🚀

