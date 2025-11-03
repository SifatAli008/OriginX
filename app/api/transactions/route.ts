/**
 * API Route: Blockchain Transactions
 * GET /api/transactions - List transactions with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { TransactionType } from "@/lib/utils/transactions";
import type { UserDocument } from "@/lib/types/user";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    query,
    where,
    orderBy,
    limit: limitQuery,
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
    orderBy,
    limitQuery,
    getDocs,
    getFirestore,
    app,
  };
}

export async function GET(request: NextRequest) {
  console.log("[GET /api/transactions] Request received");
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
    const uid = decodedToken.uid;

    // Get user document (server-side)
    let userDoc: UserDocument | null = null;
    
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
        
        // Initialize Firebase app on server (avoid client module)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "25");
    const type = searchParams.get("type") as TransactionType | null;
    const refType = searchParams.get("refType") as
      | "product"
      | "movement"
      | "verification"
      | "batch"
      | null;
    const refId = searchParams.get("refId");
    const productId = searchParams.get("productId"); // Search in payload
    const status = searchParams.get("status") as
      | "pending"
      | "confirmed"
      | "failed"
      | null;
    const startDate = searchParams.get("startDate")
      ? parseInt(searchParams.get("startDate")!)
      : null;
    const endDate = searchParams.get("endDate")
      ? parseInt(searchParams.get("endDate")!)
      : null;

    // Build filters (non-admin users can only see their org's transactions)
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      orderBy: buildOrderBy,
      getDocs,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, return empty transactions
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        return NextResponse.json({
          items: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
          warning: "Firebase not configured - returning mock data",
        }, { status: 200 });
      }
      return NextResponse.json(
        { 
          error: "Firebase not configured. Please set Firebase environment variables.",
          hint: "For development, create .env.local with NEXT_PUBLIC_FIREBASE_* variables"
        },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const transactionsRef = getCollection(db, "transactions");
    let q = buildQuery(transactionsRef);

    // Apply filters
    if (userDoc.role !== "admin" && userDoc.orgId) {
      // Non-admin users can only see their org's transactions
      q = buildQuery(q, buildWhere("orgId", "==", userDoc.orgId));
    }

    if (type) {
      q = buildQuery(q, buildWhere("type", "==", type));
    }
    if (refType) {
      q = buildQuery(q, buildWhere("refType", "==", refType));
    }
    if (refId) {
      q = buildQuery(q, buildWhere("refId", "==", refId));
    }
    if (status) {
      q = buildQuery(q, buildWhere("status", "==", status));
    }
    if (startDate) {
      q = buildQuery(q, buildWhere("createdAt", ">=", startDate));
    }
    if (endDate) {
      q = buildQuery(q, buildWhere("createdAt", "<=", endDate));
    }

    // Order by creation date (newest first)
    q = buildQuery(q, buildOrderBy("createdAt", "desc"));

    // Get all matching transactions first (for client-side productId filtering)
    const allDocs = await getDocs(q);
    let items = allDocs.docs.map((doc) => ({
      ...doc.data(),
    })) as Array<Record<string, unknown>>;

    // Filter by productId in payload if provided (client-side)
    if (productId) {
      items = items.filter(
        (tx) => {
          const payload = tx.payload as Record<string, unknown> | undefined;
          return payload?.productId === productId;
        }
      );
    }

    // Pagination (client-side after productId filter)
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);

    // Get total count
    const total = items.length;

    return NextResponse.json(
      {
        items: paginatedItems,
        total,
        page,
        pageSize,
        hasMore: endIndex < total,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get transactions error:", error);
    console.error("Error details:", {
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    
    // In development with test token, return mock data even on error
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.includes("test-token") && process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          items: [],
          total: 0,
          page: 1,
          pageSize: 25,
          hasMore: false,
          warning: "Error occurred but returning mock data for testing",
          originalError: error?.message,
        }, { status: 200 });
      }
    } catch {}
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : String(error),
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        code: error?.code,
      },
      { status: 500 }
    );
  }
}

