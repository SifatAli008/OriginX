# 🚀 Ready-to-Copy Firebase Environment Variables for Vercel

## Add these to Vercel Dashboard → Settings → Environment Variables

Copy each variable name and value below, then paste them into Vercel.

### Step-by-Step:

1. Go to: https://vercel.com/dashboard
2. Click on your **origin-x** project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New** for each variable below

---

## Environment Variables to Add:

### 1. Firebase API Key
**Variable Name:** `NEXT_PUBLIC_FIREBASE_API_KEY`  
**Value:** `AIzaSyBXvXkDwF42vEh8Ziza9MfsC-GYgLs9kGY`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 2. Firebase Auth Domain
**Variable Name:** `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`  
**Value:** `originx-c734a.firebaseapp.com`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 3. Firebase Project ID
**Variable Name:** `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  
**Value:** `originx-c734a`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 4. Firebase Storage Bucket
**Variable Name:** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`  
**Value:** `originx-c734a.firebasestorage.app`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 5. Firebase Messaging Sender ID
**Variable Name:** `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`  
**Value:** `911561257885`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 6. Firebase App ID
**Variable Name:** `NEXT_PUBLIC_FIREBASE_APP_ID`  
**Value:** `1:911561257885:web:d6f209b74d73515aac7574`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 7. Firebase Database URL (Optional but recommended)
**Variable Name:** `NEXT_PUBLIC_FIREBASE_DATABASE_URL`  
**Value:** `https://originx-c734a-default-rtdb.asia-southeast1.firebasedatabase.app`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

### 8. Firebase Measurement ID (Optional - for Analytics)
**Variable Name:** `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`  
**Value:** `G-7R5ENYKNDG`  
**Environment:** ✅ Production, ✅ Preview, ✅ Development

---

## After Adding All Variables:

1. ✅ Make sure all 8 variables are added
2. ✅ Check that each is enabled for **Production** environment (at minimum)
3. 🚀 Go to **Deployments** tab
4. 🔄 Click **"..."** on latest deployment → **Redeploy**
5. ⏳ Wait 2-3 minutes for deployment to complete
6. 🎉 Visit https://origin-x.vercel.app/ - Firebase errors should be gone!

---

## Quick Copy-Paste Format:

If you prefer to add them quickly, here's the format:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBXvXkDwF42vEh8Ziza9MfsC-GYgLs9kGY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=originx-c734a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=originx-c734a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=originx-c734a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=911561257885
NEXT_PUBLIC_FIREBASE_APP_ID=1:911561257885:web:d6f209b74d73515aac7574
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://originx-c734a-default-rtdb.asia-southeast1.firebasedatabase.app
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-7R5ENYKNDG
```

---

**⚠️ Important:** These values are now in your codebase. Consider rotating your API keys if this repository is public. Firebase API keys are safe to expose client-side, but for additional security, you can restrict them in Firebase Console → Authentication → Settings → Authorized domains.

