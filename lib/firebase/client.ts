"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore as getFirestoreSDK, type Firestore } from "firebase/firestore";
import type { Analytics } from "firebase/analytics";
import { firebaseConfig } from "@/lib/firebase/config";

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let firestoreInstance: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp | null {
  if (!appInstance) {
    // Validate Firebase config before initializing
    const hasRequiredConfig = firebaseConfig.apiKey && 
                              firebaseConfig.authDomain && 
                              firebaseConfig.projectId;
    
    if (!hasRequiredConfig) {
      if (typeof window !== 'undefined') {
        console.warn(
          '⚠️ Firebase is not configured. Please add Firebase environment variables in Vercel Dashboard. ' +
          'See: Settings → Environment Variables'
        );
      }
      return null;
    }
    
    try {
      appInstance = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return null;
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (!authInstance) {
    const app = getFirebaseApp();
    if (!app) {
      return null;
    }
    authInstance = getAuth(app);
    // Set persistence to local storage to ensure auth state persists across redirects
    if (typeof window !== 'undefined') {
      setPersistence(authInstance, browserLocalPersistence).catch((error) => {
        console.error('Failed to set auth persistence:', error);
      });
    }
  }
  return authInstance;
}

// Initialize Google Auth Provider with default settings
export const googleProvider = new GoogleAuthProvider();
// Set custom parameters for Google OAuth
googleProvider.setCustomParameters({
  prompt: 'select_account' // Forces account selection
});

export function getFirestore(): Firestore | null {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    if (!app) {
      return null;
    }
    firestoreInstance = getFirestoreSDK(app);
  }
  return firestoreInstance;
}

export async function getFirebaseAnalytics(): Promise<Analytics | undefined> {
  if (typeof window === "undefined") return undefined;
  if (!firebaseConfig.measurementId) return undefined;
  const app = getFirebaseApp();
  if (!app) return undefined;
  const { getAnalytics } = await import("firebase/analytics");
  try {
    return getAnalytics(app);
  } catch {
    return undefined;
  }
}


