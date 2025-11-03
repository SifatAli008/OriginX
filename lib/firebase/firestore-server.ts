/**
 * Server-side Firestore utilities
 * These functions work in API routes and server components
 */

import type { UserDocument } from "@/lib/types/user";

/**
 * Get user document from Firestore (server-side)
 * This version works in API routes
 */
export async function getUserDocumentServer(uid: string): Promise<UserDocument | null> {
  // Handle hardcoded test user (ONLY IN DEVELOPMENT)
  if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
    console.warn('⚠️ Using hardcoded test user - NOT FOR PRODUCTION');
    return {
      uid: 'test-user-123',
      email: 'test@originx.com',
      displayName: 'Test User',
      photoURL: null,
      role: 'admin',
      orgId: 'test-org-123',
      orgName: 'Test Organization',
      mfaEnabled: false,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  try {
    // Dynamic import for server-side Firestore
    const { doc, getDoc, getFirestore } = await import("firebase/firestore");
    const { getFirebaseApp } = await import("@/lib/firebase/client");
    
    const app = getFirebaseApp();
    if (!app) {
      console.error("Firebase app not initialized");
      return null;
    }

    const db = getFirestore(app);
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return userSnap.data() as UserDocument;
  } catch (error) {
    console.error("Error getting user document:", error);
    return null;
  }
}

