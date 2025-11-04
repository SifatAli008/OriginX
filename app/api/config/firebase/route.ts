/**
 * API Route: Firebase Config
 * GET /api/config/firebase - Returns public Firebase configuration
 * This is safe to expose as it's client-side public configuration
 */

import { NextResponse } from "next/server";
import { firebaseConfig } from "@/lib/firebase/config";

export async function GET() {
  // Return only the public Firebase config (safe to expose)
  // These are the same values used in client-side Firebase initialization
  return NextResponse.json({
    apiKey: firebaseConfig.apiKey || "",
    authDomain: firebaseConfig.authDomain || "",
    projectId: firebaseConfig.projectId || "",
    storageBucket: firebaseConfig.storageBucket || "",
    messagingSenderId: firebaseConfig.messagingSenderId || "",
    appId: firebaseConfig.appId || "",
    measurementId: firebaseConfig.measurementId || "",
    configured: !!(firebaseConfig.apiKey && firebaseConfig.projectId),
  });
}

