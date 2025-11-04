/**
 * Server-side Firestore utilities
 * These functions work in API routes and server components
 */

import type { UserDocument } from "@/lib/types/user";

/**
 * Get user document from Firestore (server-side)
 * This version works in API routes
 */
export async function getUserDocumentServer(uid: string, email?: string): Promise<UserDocument | null> {
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
    const { doc, getDoc, getFirestore, setDoc } = await import("firebase/firestore");
    const { initializeApp, getApps } = await import("firebase/app");
    const { firebaseConfig } = await import("@/lib/firebase/config");
    
    // Initialize Firebase app on server
    let app;
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("[Firestore Server] Firebase config missing required fields");
        return null;
      }
      app = initializeApp(firebaseConfig);
    }

    const db = getFirestore(app);
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserDocument;
    }

    // If user document doesn't exist and we have email, try to create a basic one
    // This handles cases where user authenticated but document wasn't created yet
    if (email) {
      const isAdmin = email.toLowerCase() === "admin@originx.com";
      const basicUserDoc: UserDocument = {
        uid,
        email,
        displayName: null,
        photoURL: null,
        role: isAdmin ? "admin" : "sme",
        orgId: null, // Will be set during company registration
        orgName: undefined,
        mfaEnabled: false,
        status: isAdmin ? "active" : "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        // Try to create the document (may fail due to security rules, but worth trying)
        await setDoc(userRef, basicUserDoc);
        console.log(`[Firestore Server] Created user document for ${uid}`);
        return basicUserDoc;
      } catch (createError) {
        // If creation fails (e.g., due to security rules), log and return null
        console.warn(`[Firestore Server] Could not auto-create user document for ${uid}:`, createError);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error("[Firestore Server] Error getting user document:", error);
    return null;
  }
}

