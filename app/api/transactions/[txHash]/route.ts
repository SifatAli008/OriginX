/**
 * API Route: Get Single Transaction
 * GET /api/transactions/[txHash] - Get transaction details by hash
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    query,
    where,
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
    app = initializeApp(firebaseConfig);
  }
  
  return {
    collection,
    query,
    where,
    getDocs,
    getFirestore,
    app,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken || !decodedToken.uid) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get user document (server-side)
    let userDoc: UserDocument | null = null;
    const uid = decodedToken.uid;
    
    // Handle hardcoded test user
    if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
      userDoc = {
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
    } else {
      // Get from Firestore (server-side initialization)
      try {
        const { doc, getDoc, getFirestore } = await import("firebase/firestore");
        const { initializeApp, getApps } = await import("firebase/app");
        const { firebaseConfig } = await import("@/lib/firebase/config");
        
        let app;
        const apps = getApps();
        if (apps.length > 0) {
          app = apps[0];
        } else {
          app = initializeApp(firebaseConfig);
        }
        
        const db = getFirestore(app);
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userDoc = userSnap.data() as UserDocument;
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
      }
    }
    
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get txHash from params
    const { txHash } = await params;

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    // Get transaction from Firestore
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      getDocs,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, return mock response
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        return NextResponse.json(
          {
            txHash,
            type: "MOVEMENT",
            status: "confirmed",
            blockNumber: 1001,
            refType: "movement",
            refId: "mock-movement-id",
            orgId: userDoc.orgId,
            createdBy: uid,
            createdAt: Date.now(),
            confirmedAt: Date.now(),
            warning: "Firebase not configured - returning mock data",
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { 
          error: "Firebase not configured. Please set Firebase environment variables.",
          hint: "For development, create .env.local with NEXT_PUBLIC_FIREBASE_* variables"
        },
        { status: 500 }
      );
    }

    // Safely get Firestore instance
    let db;
    try {
      db = getFirestore(app);
    } catch (dbError: unknown) {
      console.error("Error getting Firestore instance:", dbError);
      // If Firestore fails but we're in dev with test token, return mock
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        return NextResponse.json(
          {
            txHash,
            type: "MOVEMENT",
            status: "confirmed",
            blockNumber: 1001,
            refType: "movement",
            refId: "mock-movement-id",
            orgId: userDoc.orgId,
            createdBy: uid,
            createdAt: Date.now(),
            confirmedAt: Date.now(),
            warning: "Firestore initialization failed - returning mock data",
            firestoreError: dbError instanceof Error ? dbError.message : String(dbError),
          },
          { status: 200 }
        );
      }
      throw dbError;
    }
    const transactionsRef = getCollection(db, "transactions");
    const q = buildQuery(transactionsRef, buildWhere("txHash", "==", txHash));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const transaction = querySnapshot.docs[0]!.data();

    // Check if user has permission (non-admin users can only see their org's transactions)
    if (userDoc.role !== "admin" && transaction.orgId !== userDoc.orgId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(transaction, { status: 200 });
  } catch (error: unknown) {
    console.error("Get transaction error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    console.error("Error details:", {
      message: errorObj.message,
      name: errorObj instanceof Error ? errorObj.name : undefined,
    });
    
    // In development with test token, return mock data even on error
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.includes("test-token") && process.env.NODE_ENV === 'development') {
        const { txHash } = await params;
        return NextResponse.json(
          {
            txHash: txHash || "mock-hash",
            type: "MOVEMENT",
            status: "confirmed",
            blockNumber: 1001,
            refType: "movement",
            refId: "mock-movement-id",
            orgId: "test-org-123",
            createdBy: "test-user-123",
            createdAt: Date.now(),
            confirmedAt: Date.now(),
            warning: "Error occurred but returning mock data for testing",
            originalError: errorObj.message,
          },
          { status: 200 }
        );
      }
    } catch {}
    
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

