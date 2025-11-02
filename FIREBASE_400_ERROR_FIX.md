# Fix Firebase 400 Error (Bad Request)

## Error You're Seeing

```
identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSy...
Failed to load resource: the server responded with a status of 400
```

## 🔴 Common Causes & Solutions

### 1. **Invalid or Wrong API Key**

**Problem:** The API key in Vercel doesn't match your Firebase project.

**Solution:**
1. Verify the API key:
   - Go to Firebase Console → Project Settings
   - Click "General" tab
   - Scroll to "Your apps" → Click your web app
   - Copy the `apiKey` from `firebaseConfig`
2. Verify in Vercel:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Click the eye icon 👁️ next to `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Compare with Firebase Console value
   - They must match exactly (no spaces, no quotes)

### 2. **API Key Restrictions Blocking Your Domain**

**Problem:** Firebase API key has HTTP referrer restrictions that block `origin-x.vercel.app`.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Find your **API Key** (the one from Firebase)
5. Click on it to edit
6. Under **Application restrictions**:
   - Select **HTTP referrers (web sites)**
   - Add these to **Website restrictions**:
     - `https://origin-x.vercel.app/*`
     - `https://*.vercel.app/*` (to allow all Vercel previews)
     - `http://localhost:3000/*` (for local dev)
7. Click **Save**
8. **Wait 5 minutes** for changes to propagate
9. **Redeploy** your Vercel app

### 3. **Authentication Not Enabled in Firebase**

**Problem:** Email/Password authentication is not enabled in Firebase.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Check if **Email/Password** is enabled:
   - If it shows "Disabled", click on it
   - Toggle **Enable** to ON
   - Click **Save**
5. Also enable **Google** if you want Google OAuth:
   - Click on **Google**
   - Toggle **Enable** to ON
   - Enter your support email
   - Click **Save**

### 4. **Domain Not Authorized**

**Problem:** Your Vercel domain isn't in Firebase's authorized domains list.

**Solution:**
1. Go to Firebase Console → **Authentication** → Settings
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Add: `origin-x.vercel.app`
5. Click **Add**
6. Changes take effect immediately (no redeploy needed)

### 5. **Firebase Project Billing Issue**

**Problem:** Some Firebase features require billing to be enabled.

**Solution:**
1. Go to Firebase Console → Project Settings
2. Check if billing is enabled
3. If needed, enable billing:
   - Go to **Usage and billing**
   - Click **Upgrade** or **Add billing account**
   - Firebase Spark (free) plan should work for basic auth

### 6. **API Key API Restrictions**

**Problem:** The API key is restricted and doesn't allow Identity Toolkit API.

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click on your API key
4. Under **API restrictions**:
   - Select **Restrict key**
   - Make sure **Identity Toolkit API** is enabled
   - Or select **Don't restrict key** (not recommended for production)
5. Click **Save**

## 🔍 **Debugging Steps**

### Step 1: Verify All Environment Variables

In Vercel Dashboard → Environment Variables, verify all 6 required variables exist and have correct values:

```
✅ NEXT_PUBLIC_FIREBASE_API_KEY
✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
✅ NEXT_PUBLIC_FIREBASE_APP_ID
```

### Step 2: Check Browser Console for Specific Error

1. Open https://origin-x.vercel.app/login
2. Press F12 → Console tab
3. Try to login
4. Look for the full error message (not just 400)
5. Common Firebase error codes:
   - `auth/api-key-not-valid` → Wrong API key
   - `auth/unauthorized-domain` → Domain not authorized
   - `auth/operation-not-allowed` → Auth method not enabled
   - `auth/invalid-api-key` → Invalid API key format

### Step 3: Verify Firebase Project Configuration

1. Go to Firebase Console → Project Settings
2. Verify:
   - Project is active (not deleted/suspended)
   - Web app is registered
   - Authentication is enabled
   - Correct project ID matches your env variable

### Step 4: Test API Key Directly

You can test if the API key works:

1. Open browser DevTools → Network tab
2. Try to login
3. Find the failed request to `identitytoolkit.googleapis.com`
4. Check the request URL - the API key should be in the query string
5. Copy the full URL and test in a new tab (should show JSON error with details)

## ✅ **Quick Fix Checklist**

```
☐ API key matches Firebase Console exactly
☐ API key restrictions allow origin-x.vercel.app
☐ Email/Password authentication enabled in Firebase
☐ Domain origin-x.vercel.app added to authorized domains
☐ Identity Toolkit API enabled for the API key
☐ Firebase project billing enabled (if required)
☐ All 6 environment variables set in Vercel
☐ Redeployed after fixing configuration
☐ Cleared browser cache and hard refresh
```

## 🚀 **Most Likely Fix**

Based on the 400 error, **the most common cause is API key restrictions**. 

**Try this first:**
1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Edit your API key
4. Change **Application restrictions** to **None** (temporarily)
5. Save and wait 5 minutes
6. Test login again
7. If it works, add proper HTTP referrer restrictions

## 📞 **Still Not Working?**

If after trying all these steps, you still get 400 errors:

1. **Check Firebase Console → Authentication → Sign-in method**
   - Ensure Email/Password is enabled
   - Ensure Google is enabled (if using)

2. **Check Vercel Build Logs:**
   - Deployments → Latest → Build Logs
   - Look for any environment variable errors

3. **Verify API Key in Network Request:**
   - Browser DevTools → Network tab
   - Try login
   - Check the failed request
   - Verify the API key in the URL matches Firebase Console

4. **Create a New API Key:**
   - Google Cloud Console → APIs & Services → Credentials
   - Create new API key
   - Don't add restrictions initially
   - Update in Vercel environment variables
   - Redeploy

---

**Last Updated:** Based on current Firebase 400 error troubleshooting

