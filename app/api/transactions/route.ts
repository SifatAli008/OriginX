export const runtime = 'nodejs';
/**
 * API Route: Simulated Blockchain-Style Transfer Records
 * GET /api/transactions - List transfer records with filters
 * Note: This is a simulation - not a real blockchain network
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
  let app: ReturnType<typeof initializeApp> | undefined;
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

    // Get user document (server-side) - use helper that can auto-create
    const userEmail = decodedToken.email || 'unknown';
    let userDoc: UserDocument | null = null;
    
    try {
      const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
      userDoc = await getUserDocumentServer(uid, userEmail);
    } catch (error) {
      console.error("[Transactions] Error fetching user document:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { 
          error: "Failed to fetch user information",
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
    
    // If user document doesn't exist, check if this is an admin user
    if (!userDoc) {
      const isAdminEmail = userEmail.toLowerCase() === "admin@originx.com";
      
      if (isAdminEmail && process.env.NODE_ENV !== 'production') {
        // For admin users in development, create a temporary user doc
        console.warn(`[Transactions] Admin user document not found, using temporary admin profile for ${uid}`);
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
      } else {
        return NextResponse.json(
          { 
            error: "User profile not found. Please complete your registration or contact support.",
            details: process.env.NODE_ENV === 'development' ? `UID: ${uid}, Email: ${userEmail}` : undefined
          },
          { status: 404 }
        );
      }
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
    const productId = searchParams.get("productId"); // Can be top-level field or in payload
    const movementId = searchParams.get("movementId"); // Direct movement reference
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
      // Fallback to Admin SDK on server (no NEXT_PUBLIC_ variables needed)
      try {
        const { getAdminFirestore } = await import("@/lib/firebase/admin");
        const adb = getAdminFirestore();
        let ref = adb.collection("transactions");
        // When productId is provided, show full lifecycle across orgs
        if (!productId && userDoc.role !== "admin" && userDoc.orgId) ref = ref.where("orgId", "==", userDoc.orgId);
        if (type) ref = ref.where("type", "==", type);
        if (refType) ref = ref.where("refType", "==", refType);
        if (refId) ref = ref.where("refId", "==", refId);
        if (movementId) ref = ref.where("movementId", "==", movementId);
        if (productId) ref = ref.where("productId", "==", productId);
        if (status) ref = ref.where("status", "==", status);
        if (startDate) ref = ref.where("createdAt", ">=", startDate);
        if (endDate) ref = ref.where("createdAt", "<=", endDate);
        const snap = await ref.orderBy("createdAt", "desc").get();
        const all = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() }));
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return NextResponse.json({
          items: all.slice(startIndex, endIndex),
          total: all.length,
          page,
          pageSize,
          hasMore: endIndex < all.length,
        }, { status: 200 });
      } catch (fallbackErr) {
        console.error("[Transactions] Admin fallback failed:", fallbackErr);
        return NextResponse.json({ error: "Database not configured" }, { status: 500 });
      }
    }

    // When productId is provided, use Admin SDK to avoid index/security rule issues
    if (productId) {
      try {
        const { getAdminFirestore } = await import("@/lib/firebase/admin");
        const adb = getAdminFirestore();
        let ref = adb.collection("transactions").where("productId", "==", productId);
        if (type) ref = ref.where("type", "==", type);
        if (refType) ref = ref.where("refType", "==", refType);
        if (refId) ref = ref.where("refId", "==", refId);
        if (movementId) ref = ref.where("movementId", "==", movementId);
        if (status) ref = ref.where("status", "==", status);
        if (startDate) ref = ref.where("createdAt", ">=", startDate);
        if (endDate) ref = ref.where("createdAt", "<=", endDate);
        const snap = await ref.get();
        interface TransactionItem {
          id: string;
          createdAt?: number;
          [key: string]: unknown;
        }
        const all = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => {
          const data = d.data() as Record<string, unknown>;
          return { id: d.id, ...data } as TransactionItem;
        });
        all.sort((a: TransactionItem, b: TransactionItem) => (b.createdAt || 0) - (a.createdAt || 0));
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return NextResponse.json({
          items: all.slice(startIndex, endIndex),
          total: all.length,
          page,
          pageSize,
          hasMore: endIndex < all.length,
        }, { status: 200 });
      } catch (adminErr) {
        console.error("[Transactions] Admin SDK query failed:", adminErr);
        // Fall through to client SDK path
      }
    }

    const db = getFirestore(app);
    const transactionsRef = getCollection(db, "transactions");
    let q = buildQuery(transactionsRef);

    // Apply filters
    // Non-admin users: restrict to org, EXCEPT when querying a specific productId (show full lifecycle)
    if (!productId && userDoc.role !== "admin" && userDoc.orgId) {
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
    // Filter by movementId (top-level field for efficient querying)
    if (movementId) {
      q = buildQuery(q, buildWhere("movementId", "==", movementId));
    }
    // Filter by productId (top-level field for efficient querying)
    if (productId) {
      q = buildQuery(q, buildWhere("productId", "==", productId));
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

    // Get all matching transactions
    // Note: productId and movementId are now filtered at query level (above) for efficiency
    // Older transactions without top-level productId/movementId fields won't match these queries
    // but can still be queried by refId or payload (for backward compatibility)
    const allDocs = await getDocs(q);
    const items: Array<Record<string, unknown>> = allDocs.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        ...data,
      };
    });

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
  } catch (error: unknown) {
    console.error("Get transactions error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    console.error("Error details:", {
      message: errorObj.message,
      name: errorObj instanceof Error ? errorObj.name : undefined,
    });
    
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

