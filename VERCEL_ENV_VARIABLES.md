# Vercel Environment Variables - Copy and Paste Guide

## Your Firebase Configuration

Based on your Firebase Console, here are the exact values to add to Vercel:

## 📋 **Environment Variables to Add**

### Variable 1: API Key
```
Key: NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyBXvXkDwF42vEh8Ziza9MfsC-GYgLs9kGY
Environment: Production, Preview, Development
```

### Variable 2: Auth Domain
```
Key: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: originx-c734a.firebaseapp.com
Environment: Production, Preview, Development
```

### Variable 3: Project ID
```
Key: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: originx-c734a
Environment: Production, Preview, Development
```

### Variable 4: Storage Bucket
```
Key: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: originx-c734a.firebasestorage.app
Environment: Production, Preview, Development
```

### Variable 5: Messaging Sender ID
```
Key: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: 911561257885
Environment: Production, Preview, Development
```

### Variable 6: App ID
```
Key: NEXT_PUBLIC_FIREBASE_APP_ID
Value: 1:911561257885:web:d6f209b74d73515aac7574
Environment: Production, Preview, Development
```

### Variable 7: Database URL (Optional but Recommended)
```
Key: NEXT_PUBLIC_FIREBASE_DATABASE_URL
Value: https://originx-c734a-default-rtdb.asia-southeast1.firebasedatabase.app
Environment: Production, Preview, Development
```

### Variable 8: Measurement ID (Optional - for Analytics)
```
Key: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
Value: G-7R5ENYKNDG
Environment: Production, Preview, Development
```

---

## 🎯 **Step-by-Step: Adding to Vercel**

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: OriginX
3. **Click Settings** (top navigation)
4. **Click Environment Variables** (left sidebar)
5. **For each variable above:**
   - Click **"Add New"** or **"Add"**
   - Paste the **Key** exactly as shown
   - Paste the **Value** exactly as shown (no quotes, no spaces)
   - Select **Production**, **Preview**, and **Development**
   - Click **Save**
6. **Repeat for all 8 variables**

---

## ✅ **Verification Checklist**

After adding all variables, verify:

```
☐ NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyBXvXkDwF42vEh8Ziza9MfsC-GYgLs9kGY
☐ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = originx-c734a.firebaseapp.com
☐ NEXT_PUBLIC_FIREBASE_PROJECT_ID = originx-c734a
☐ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = originx-c734a.firebasestorage.app
☐ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 911561257885
☐ NEXT_PUBLIC_FIREBASE_APP_ID = 1:911561257885:web:d6f209b74d73515aac7574
☐ NEXT_PUBLIC_FIREBASE_DATABASE_URL = https://originx-c734a-default-rtdb.asia-southeast1.firebasedatabase.app
☐ NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = G-7R5ENYKNDG
```

---

## ⚠️ **CRITICAL: Redeploy After Adding Variables**

**Environment variables only take effect after a new deployment!**

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-5 minutes)
5. Test your application

---

## 🔧 **Also Enable in Firebase Console**

After adding variables, make sure:

### 1. Enable Email/Password Authentication
- Firebase Console → **Authentication** → **Sign-in method**
- Click **Email/Password**
- Toggle **Enable** to **ON**
- Click **Save**

### 2. Add Authorized Domain
- Firebase Console → **Authentication** → **Settings**
- Scroll to **Authorized domains**
- Click **Add domain**
- Enter: `origin-x.vercel.app`
- Click **Add**

### 3. Check API Key Restrictions (Optional but Recommended)
- Go to: https://console.cloud.google.com/
- Select project: **originx-c734a**
- **APIs & Services** → **Credentials**
- Find your API key (should start with `AIzaSyBXvXk...`)
- Click to edit
- Under **Application restrictions**:
  - Select **HTTP referrers (web sites)** (recommended for security)
  - Add:
    - `https://origin-x.vercel.app/*`
    - `https://*.vercel.app/*`
    - `http://localhost:3000/*`
  - OR select **None** (for testing - less secure)
- Click **Save**

---

## 🧪 **Test After Setup**

1. Wait for redeployment to complete
2. Visit: https://origin-x.vercel.app/login
3. Open Browser Console (F12)
4. Try login with:
   - Email: `admin`
   - Password: `admin`
5. Check console:
   - ✅ Should NOT see: `⚠️ Firebase is not configured`
   - ✅ Should NOT see: `400 Bad Request` errors
   - ✅ Should successfully authenticate

---

## 📝 **Quick Reference**

**Project**: originx-c734a  
**Firebase Console**: https://console.firebase.google.com/project/originx-c734a  
**Vercel Dashboard**: https://vercel.com/dashboard

---

**Once all variables are added and you've redeployed, authentication should work perfectly!**

