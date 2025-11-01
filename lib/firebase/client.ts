"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";
import type { Analytics } from "firebase/analytics";
import { firebaseConfig } from "@/lib/firebase/config";

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    // Validate Firebase config before initializing
    const hasRequiredConfig = firebaseConfig.apiKey && 
                              firebaseConfig.authDomain && 
                              firebaseConfig.projectId;
    
    if (!hasRequiredConfig && typeof window !== 'undefined') {
      throw new Error(
        'Firebase is not configured. Please add Firebase environment variables in Vercel Dashboard. ' +
        'See: Settings → Environment Variables'
      );
    }
    
    appInstance = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const googleProvider = new GoogleAuthProvider();

export async function getFirebaseAnalytics(): Promise<Analytics | undefined> {
  if (typeof window === "undefined") return undefined;
  if (!firebaseConfig.measurementId) return undefined;
  const app = getFirebaseApp();
  const { getAnalytics } = await import("firebase/analytics");
  try {
    return getAnalytics(app);
  } catch {
    return undefined;
  }
}


