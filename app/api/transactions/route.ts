/**
 * API Route: Blockchain Transactions
 * GET /api/transactions - List transactions with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import type { TransactionType } from "@/lib/utils/transactions";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    query,
    where,
    orderBy,
    limit: limitQuery,
    getDocs,
  } = await import("firebase/firestore");
  const { getFirestore } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    query,
    where,
    orderBy,
    limitQuery,
    getDocs,
    getFirestore,
    getFirebaseApp,
  };
}

export async function GET(request: NextRequest) {
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

    // Get user document
    const userDoc = await getUserDocument(uid);
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
      getFirebaseApp,
    } = await getFirestoreUtils();

    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
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
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

