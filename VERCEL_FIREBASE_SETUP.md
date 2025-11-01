# 🔥 Firebase Setup for Vercel Deployment

## Quick Setup Guide

Your deployment is working, but Firebase environment variables need to be added to Vercel.

## Step-by-Step Instructions

### 1. Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the **gear icon** ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. Click on your web app (or click **</>** to add a web app)

### 2. Copy Your Firebase Config

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX" // Optional - only if using Analytics
};
```

### 3. Add Environment Variables to Vercel

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Click on your **origin-x** project
3. Go to **Settings** → **Environment Variables**
4. Add each variable one by one:

| Variable Name | Value (from Firebase config) |
|--------------|------------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Copy from `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Copy from `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Copy from `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Copy from `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Copy from `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Copy from `appId` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Copy from `measurementId` (optional) |

**Important:**
- Select **Production**, **Preview**, and **Development** environments
- Click **Save** after adding each variable

### 4. Redeploy Your Application

After adding all environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for the deployment to complete (2-3 minutes)

### 5. Verify It Works

Visit https://origin-x.vercel.app/
- The Firebase error should be gone
- You should be able to use authentication features

## Troubleshooting

### Still seeing "invalid-api-key" error?
- Double-check that all variable names start with `NEXT_PUBLIC_`
- Make sure you copied the values correctly (no extra spaces)
- Verify the variables are set for **Production** environment
- Redeploy after adding variables

### Can't find Firebase config?
- Make sure you're looking at the correct Firebase project
- Check that you have a web app created in Firebase
- If using an existing project, the config is in Project Settings → Your apps

### Need help?
- Check Firebase Console: https://console.firebase.google.com/
- Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables

## What Each Variable Does

- **API_KEY**: Authenticates your app with Firebase
- **AUTH_DOMAIN**: Domain for Firebase Authentication
- **PROJECT_ID**: Your Firebase project identifier
- **STORAGE_BUCKET**: Where files are stored (Cloud Storage)
- **MESSAGING_SENDER_ID**: For push notifications (Firebase Cloud Messaging)
- **APP_ID**: Unique identifier for your Firebase app
- **MEASUREMENT_ID**: For Google Analytics (optional)

---

✅ After completing these steps, your app will be fully functional!

