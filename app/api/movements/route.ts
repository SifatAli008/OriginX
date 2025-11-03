/**
 * API Route: Movements
 * POST /api/movements - Create a movement/shipment
 * GET /api/movements - List movements with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import { createMovementTransaction } from "@/lib/utils/transactions";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getFirestore,
  } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getFirestore,
    getFirebaseApp,
  };
}

/**
 * POST /api/movements
 * Create a new movement/shipment
 */
export async function POST(request: NextRequest) {
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

    // Get user document
    const userDoc = await getUserDocument(uid);
    if (!userDoc || !userDoc.orgId) {
      return NextResponse.json(
        { error: "User must be associated with an organization" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      productId,
      productName,
      type, // "inbound" | "outbound" | "transfer"
      from,
      to,
      status = "pending", // "pending" | "in_transit" | "delivered" | "cancelled"
      quantity = 1,
      trackingNumber,
      estimatedDelivery,
      notes,
    } = body;

    // Validate required fields
    if (!productId || !type || !from || !to) {
      return NextResponse.json(
        { error: "Missing required fields: productId, type, from, to" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["inbound", "outbound", "transfer"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Create movement document
    const {
      collection: getCollection,
      addDoc,
      getFirestore,
      getFirebaseApp,
    } = await getFirestoreUtils();

    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);
    const movementsRef = getCollection(db, "movements");
    
    const movementData = {
      productId,
      productName: productName || "Unknown Product",
      orgId: userDoc.orgId,
      type,
      from,
      to,
      status,
      quantity,
      trackingNumber: trackingNumber || `MOV-${Date.now()}`,
      createdBy: uid,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery).getTime() : undefined,
      notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const movementDoc = await addDoc(movementsRef, movementData);
    const movementId = movementDoc.id;

    // Create immutable MOVEMENT transaction
    const transaction = await createMovementTransaction(
      movementId,
      userDoc.orgId,
      uid,
      {
        productId,
        productName: productName || "Unknown Product",
        type,
        from,
        to,
        status,
        quantity,
        trackingNumber: movementData.trackingNumber,
      }
    );

    return NextResponse.json(
      {
        movementId,
        ...movementData,
        transaction: {
          txHash: transaction.txHash,
          blockNumber: transaction.blockNumber,
          status: transaction.status,
          type: transaction.type,
          timestamp: transaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create movement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/movements
 * List movements with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
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

    // Get user document
    const userDoc = await getUserDocument(decodedToken.uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const productId = searchParams.get("productId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "25");

    // Build query
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      orderBy: buildOrderBy,
      limit: limitQuery,
      getDocs,
      getFirestore,
      getFirebaseApp,
    } = await getFirestoreUtils();

    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);
    const movementsRef = getCollection(db, "movements");
    let q = buildQuery(movementsRef);

    // Filter by organization (non-admin users can only see their org's movements)
    if (userDoc.role !== "admin" && userDoc.orgId) {
      q = buildQuery(q, buildWhere("orgId", "==", userDoc.orgId));
    }

    if (type) {
      q = buildQuery(q, buildWhere("type", "==", type));
    }
    if (status) {
      q = buildQuery(q, buildWhere("status", "==", status));
    }
    if (productId) {
      q = buildQuery(q, buildWhere("productId", "==", productId));
    }

    // Order by creation date (newest first)
    q = buildQuery(q, buildOrderBy("createdAt", "desc"));

    // Pagination
    q = buildQuery(q, limitQuery(pageSize));

    const querySnapshot = await getDocs(q);
    const movements = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(
      {
        items: movements,
        total: movements.length,
        page,
        pageSize,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get movements error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

