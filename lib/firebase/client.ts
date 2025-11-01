"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth";
import type { Analytics } from "firebase/analytics";
import { firebaseConfig } from "@/lib/firebase/config";

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;

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
  }
  return authInstance;
}

export const googleProvider = new GoogleAuthProvider();

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


