# Fix Firestore 400 Error

## ✅ **Good News: Authentication is Working!**

Your logs show:
- ✅ User authenticated: `admin@originx.com`
- ✅ Firebase Auth is working correctly

## 🔴 **Issue: Firestore 400 Error**

The error:
```
GET https://firestore.googleapis.com/.../Listen/channel?...&database=projects%2Fhttps%3A%2F%2Foriginx-c734a-default-rtdb... 400 (Bad Request)
```

**Problem:** Firestore is trying to use the Realtime Database URL, which causes a 400 error. Firestore doesn't use `databaseURL` - it uses `projectId` automatically.

## 🔧 **Solution 1: Enable Firestore in Firebase Console**

1. Go to: https://console.firebase.google.com/project/originx-c734a
2. Click **Firestore Database** in the left sidebar
3. Click **Create database** (if not already created)
4. Choose:
   - **Production mode** (start with test mode if needed)
   - Select a location (e.g., `asia-southeast1` or `us-central1`)
5. Click **Enable**

## 🔧 **Solution 2: Check Firestore Rules**

1. Firebase Console → **Firestore Database** → **Rules** tab
2. Ensure rules allow authenticated access:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
3. Click **Publish** to save rules

## 🔧 **Solution 3: Remove or Fix databaseURL**

The `databaseURL` environment variable is only needed for **Realtime Database**, not **Firestore**. 

### Option A: Remove databaseURL (if not using Realtime Database)

1. In Vercel → Settings → Environment Variables
2. **Delete** `NEXT_PUBLIC_FIREBASE_DATABASE_URL` if you're not using Realtime Database
3. Redeploy

### Option B: Keep databaseURL but ensure Firestore is configured correctly

The code has been updated to only include `databaseURL` if it's provided and not let it interfere with Firestore.

## 📋 **Checklist to Fix Firestore**

```
☐ Firestore Database created in Firebase Console
☐ Firestore Rules allow authenticated users
☐ Firestore location selected and enabled
☐ databaseURL removed from Vercel (if not using Realtime Database)
☐ OR databaseURL kept but Firestore enabled separately
☐ Code updated to handle databaseURL correctly
☐ Redeployed application after changes
```

## 🎯 **Quick Fix Steps**

1. **Enable Firestore:**
   - Firebase Console → Firestore Database → Create database
   - Select location → Enable

2. **Set Basic Rules:**
   - Firestore Database → Rules tab
   - Use basic authenticated access rules
   - Publish

3. **Redeploy:**
   - Vercel → Deployments → Redeploy

4. **Test:**
   - Login again
   - Check console - Firestore 400 errors should be gone

## 💡 **Important Notes**

- **Firestore** and **Realtime Database** are different services
- **Firestore** uses `projectId` (automatic)
- **Realtime Database** uses `databaseURL` (manual)
- If you're only using Firestore, you don't need `databaseURL`

---

**After enabling Firestore and redeploying, the 400 errors should be resolved!**

