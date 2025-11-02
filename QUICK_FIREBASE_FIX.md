# Quick Fix for Firebase 400 Error

## 🎯 **Most Likely Issue: API Key Restrictions**

The 400 error usually means your Firebase API key is blocking requests from your Vercel domain.

## ⚡ **Quick Fix (5 minutes)**

### Step 1: Remove API Key Restrictions (Temporarily)

1. Go to: https://console.cloud.google.com/
2. Select your Firebase project
3. Click **APIs & Services** → **Credentials** (left sidebar)
4. Find your **API Key** (should match the one in Firebase Console)
5. **Click on the API key name** to edit it
6. Under **Application restrictions**:
   - Select **None** (temporarily remove restrictions)
7. Click **Save** at the bottom
8. **Wait 2-3 minutes** for changes to propagate

### Step 2: Enable Email/Password Authentication

1. Go to: https://console.firebase.google.com/
2. Select your project
3. Click **Authentication** (left sidebar)
4. Click **Get started** (if first time)
5. Click **Sign-in method** tab
6. Click on **Email/Password**
7. Toggle **Enable** to **ON**
8. Click **Save**

### Step 3: Add Vercel Domain to Authorized Domains

1. Still in Firebase Console → **Authentication**
2. Click **Settings** tab
3. Scroll to **Authorized domains**
4. Click **Add domain**
5. Enter: `origin-x.vercel.app`
6. Click **Add**

### Step 4: Test

1. Wait 2-3 minutes
2. Visit: https://origin-x.vercel.app/login
3. Try logging in with:
   - Email: `admin`
   - Password: `admin`
4. Check browser console (F12) - should see no 400 errors

## 🔒 **After It Works: Add Proper Restrictions**

Once login works, add back API key restrictions properly:

1. Google Cloud Console → APIs & Services → Credentials
2. Edit your API key
3. Under **Application restrictions**:
   - Select **HTTP referrers (web sites)**
   - Add:
     - `https://origin-x.vercel.app/*`
     - `https://*.vercel.app/*`
     - `http://localhost:3000/*`
4. Click **Save**

## ❌ **If Still Not Working**

### Check API Key in Vercel

1. Vercel Dashboard → Settings → Environment Variables
2. Click 👁️ next to `NEXT_PUBLIC_FIREBASE_API_KEY`
3. Compare with Firebase Console:
   - Firebase Console → Project Settings → Your apps → Web app
   - Copy `apiKey` value
   - Must match exactly in Vercel

### Verify All Variables

All 6 must exist and have correct values:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Redeploy After Changes

After updating API key restrictions or Firebase settings:
- Vercel automatically redeploys, OR
- Manually trigger: Deployments → Latest → Redeploy

---

**90% of 400 errors are fixed by removing API key restrictions temporarily and ensuring Email/Password auth is enabled.**

