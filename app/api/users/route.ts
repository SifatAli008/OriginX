/**
 * API Route: Users Management
 * GET /api/users - Get user count and statistics (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    query,
    getDocs,
    getFirestore,
  } = await import("firebase/firestore");
  const { initializeApp, getApps } = await import("firebase/app");
  const { firebaseConfig } = await import("@/lib/firebase/config");
  
  // Initialize Firebase app on server (avoid client module)
  let app;
  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return { collection, query, getDocs, getFirestore, app: null };
    }
    app = initializeApp(firebaseConfig);
  }
  
  return {
    collection,
    query,
    getDocs,
    getFirestore,
    app,
  };
}

/**
 * GET /api/users
 * Get total user count (admin only)
 * Returns count of all users who have logged in (have documents in users collection)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken || !decodedToken.uid) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    const uid = decodedToken.uid;

    // Get user document to verify admin role (server-side)
    let userDoc: UserDocument | null = null;
    const userEmail = decodedToken.email || 'unknown';
    const isAdminEmail = userEmail.toLowerCase() === "admin@originx.com";
    
    // Use the server-side helper which can auto-create user documents if needed
    try {
      const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
      userDoc = await getUserDocumentServer(uid, userEmail);
    } catch (error) {
      console.error("[Users API] Error fetching user document:", error);
      // If it's an admin email, allow them to proceed even if fetch fails
      if (isAdminEmail) {
        console.warn(`[Users API] Error fetching admin user document, using temporary admin profile for ${uid}`);
        userDoc = {
          uid,
          email: userEmail,
          displayName: "Admin",
          photoURL: null,
          role: "admin",
          orgId: null,
          orgName: undefined,
          mfaEnabled: false,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
          { 
            error: "Failed to fetch user information",
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          },
          { status: 500 }
        );
      }
    }
    
    // If user document doesn't exist, check if this is an admin user
    // Admin users can proceed even without a Firestore document (handles edge cases)
    if (!userDoc && isAdminEmail) {
      // For admin users, allow access even if document doesn't exist (handles edge cases)
      // In production, the document should exist, but this provides a fallback
      console.warn(`[Users API] Admin user document not found, using temporary admin profile for ${uid}`);
      userDoc = {
        uid,
        email: userEmail,
        displayName: "Admin",
        photoURL: null,
        role: "admin",
        orgId: null, // Admin doesn't need orgId
        orgName: undefined,
        mfaEnabled: false,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } else if (!userDoc) {
      return NextResponse.json(
        { 
          error: "User profile not found. Please complete your registration or contact support.",
          details: process.env.NODE_ENV === 'development' ? `UID: ${uid}, Email: ${userEmail}` : undefined
        },
        { status: 404 }
      );
    }

    // Check if user is admin (userDoc should be set at this point)
    if (userDoc.role !== "admin") {
      console.log(`[Users API] Access denied for user ${uid} with role: ${userDoc.role}`);
      return NextResponse.json(
        { 
          error: "Forbidden - Admin access required",
          details: process.env.NODE_ENV === 'development' ? `User role: ${userDoc.role}, Email: ${userEmail}` : undefined
        },
        { status: 403 }
      );
    }

    // Use Firestore REST API to query users with authentication
    // This is necessary because the Firebase client SDK on the server doesn't maintain auth context
    const { firebaseConfig } = await import("@/lib/firebase/config");
    
    if (!firebaseConfig.projectId) {
      return NextResponse.json(
        { 
          error: "Firebase not configured. Please set Firebase environment variables.",
          hint: "For development, create .env.local with NEXT_PUBLIC_FIREBASE_* variables"
        },
        { status: 500 }
      );
    }

    // Use Firestore REST API with the user's ID token for authenticated queries
    // This ensures the security rules can properly authenticate the request
    const projectId = firebaseConfig.projectId;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`;
    
    try {
      // Query all users using REST API with ID token
      const response = await fetch(`${firestoreUrl}?pageSize=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Users API] Firestore REST API error:", response.status, errorData);
        throw new Error(errorData.error?.message || `Firestore API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse the REST API response format
      const users: UserDocument[] = [];
      if (data.documents) {
        for (const doc of data.documents) {
          const userData = doc.fields;
          // Convert Firestore REST API format to UserDocument
          const user: UserDocument = {
            uid: doc.name.split('/').pop() || '',
            email: userData.email?.stringValue || userData.email || '',
            displayName: userData.displayName?.stringValue || userData.displayName || null,
            photoURL: userData.photoURL?.stringValue || userData.photoURL || null,
            role: userData.role?.stringValue || userData.role || 'sme',
            orgId: userData.orgId?.stringValue || userData.orgId || null,
            orgName: userData.orgName?.stringValue || userData.orgName || undefined,
            mfaEnabled: userData.mfaEnabled?.booleanValue || userData.mfaEnabled || false,
            status: userData.status?.stringValue || userData.status || 'pending',
            createdAt: userData.createdAt?.integerValue ? parseInt(userData.createdAt.integerValue) : userData.createdAt || Date.now(),
            updatedAt: userData.updatedAt?.integerValue ? parseInt(userData.updatedAt.integerValue) : userData.updatedAt || Date.now(),
          };
          users.push(user);
        }
      }

      // Count total users
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === "active").length;
      const pendingUsers = users.filter(u => u.status === "pending").length;

      return NextResponse.json({
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        // Include breakdown by role if needed
        byRole: {
          admin: users.filter(u => u.role === "admin").length,
          sme: users.filter(u => u.role === "sme").length,
          company: users.filter(u => u.role === "company").length,
        },
        // Return full users list for admin management
        users: users,
      }, { status: 200 });
    } catch (restError) {
      console.error("[Users API] Error using Firestore REST API:", restError);
      // Fallback: try using client SDK if REST API fails
      try {
        const {
          collection: getCollection,
          query: buildQuery,
          getDocs,
          getFirestore,
          app,
        } = await getFirestoreUtils();

        if (!app) {
          throw new Error("Firebase app initialization failed");
        }

        const db = getFirestore(app);
        const usersRef = getCollection(db, "users");
        const usersQuery = buildQuery(usersRef);
        const usersSnapshot = await getDocs(usersQuery);

        const totalUsers = usersSnapshot.size;
        const users = usersSnapshot.docs.map(doc => doc.data() as UserDocument);
        const activeUsers = users.filter(u => u.status === "active").length;
        const pendingUsers = users.filter(u => u.status === "pending").length;

        return NextResponse.json({
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
          byRole: {
            admin: users.filter(u => u.role === "admin").length,
            sme: users.filter(u => u.role === "sme").length,
            company: users.filter(u => u.role === "company").length,
          },
          // Return full users list for admin management
          users: users,
        }, { status: 200 });
      } catch (fallbackError) {
        console.error("[Users API] Fallback also failed:", fallbackError);
        throw restError; // Throw the original REST API error
      }
    }
  } catch (error: unknown) {
    console.error("Get users count error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

