/**
 * API Route: Movements
 * POST /api/movements - Create a movement/shipment
 * GET /api/movements - List movements with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { createMovementTransaction } from "@/lib/utils/transactions";
import type { UserDocument } from "@/lib/types/user";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  try {
    const {
      collection,
      addDoc,
      doc,
      updateDoc,
      query,
      where,
      orderBy,
      limit,
      getDocs,
      getFirestore,
    } = await import("firebase/firestore");
    const { initializeApp, getApps } = await import("firebase/app");
    const { firebaseConfig } = await import("@/lib/firebase/config");
    
    // Check if config is valid
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase config missing required fields:", {
        hasApiKey: !!firebaseConfig.apiKey,
        hasProjectId: !!firebaseConfig.projectId,
        apiKeyLength: firebaseConfig.apiKey?.length || 0,
        projectIdLength: firebaseConfig.projectId?.length || 0,
      });
      return {
        collection,
        addDoc,
        doc,
        updateDoc,
        query,
        where,
        orderBy,
        limit,
        getDocs,
        getFirestore,
        app: null,
      };
    }
    
    // Initialize Firebase app on server (avoid client module)
    let app;
    try {
      const apps = getApps();
      if (apps.length > 0) {
        app = apps[0];
      } else {
        app = initializeApp(firebaseConfig);
      }
    } catch (initError: unknown) {
      console.error("Failed to initialize Firebase:", initError instanceof Error ? initError.message : String(initError));
      return {
        collection,
        addDoc,
        doc,
        updateDoc,
        query,
        where,
        orderBy,
        limit,
        getDocs,
        getFirestore,
        app: null,
      };
    }
    
    return {
      collection,
      addDoc,
      doc,
      updateDoc,
      query,
      where,
      orderBy,
      limit,
      getDocs,
      getFirestore,
      app,
    };
  } catch (error: unknown) {
    console.error("Error in getFirestoreUtils:", error instanceof Error ? error.message : String(error));
    // Return a structure with null app so calling code can handle it
    try {
      const { collection, addDoc, doc, updateDoc, query, where, orderBy, limit, getDocs, getFirestore } = await import("firebase/firestore");
      return {
        collection,
        addDoc,
        doc,
        updateDoc,
        query,
        where,
        orderBy,
        limit,
        getDocs,
        getFirestore,
        app: null,
      };
    } catch {
      throw error;
    }
  }
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

    // Get user document (server-side) - use helper that can auto-create
    const userEmail = decodedToken.email || 'unknown';
    let userDoc: UserDocument | null = null;
    
    try {
      const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
      userDoc = await getUserDocumentServer(uid, userEmail);
    } catch (error) {
      console.error("[Movements] Error fetching user document:", error);
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
        console.warn(`[Movements] Admin user document not found, using temporary admin profile for ${uid}`);
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
    
    // Non-admin users must have orgId
    if (!userDoc || (userDoc.role !== "admin" && !userDoc.orgId)) {
      return NextResponse.json(
        { error: "User must be associated with an organization. Please complete your company registration." },
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
      doc,
      updateDoc,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, we can still return a mock response
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        const mockMovementId = `mock-movement-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            movementId: mockMovementId,
            productId,
            productName: productName || "Unknown Product",
            orgId: userDoc?.orgId || null,
            type,
            from,
            to,
            status,
            quantity,
            trackingNumber: trackingNumber || `MOV-${Date.now()}`,
            createdBy: uid,
            notes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            transaction: {
              txHash: mockTxHash,
              blockNumber: 1001,
              status: "confirmed",
              type: "MOVEMENT",
              timestamp: Date.now(),
            },
            warning: "Firebase not configured - returning mock data",
          },
          { status: 201 }
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
        const mockMovementId = `mock-movement-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            movementId: mockMovementId,
            productId,
            productName: productName || "Unknown Product",
            orgId: userDoc?.orgId || null,
            type,
            from,
            to,
            status,
            quantity,
            trackingNumber: trackingNumber || `MOV-${Date.now()}`,
            createdBy: uid,
            notes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            transaction: {
              txHash: mockTxHash,
              blockNumber: 1001,
              status: "confirmed",
              type: "MOVEMENT",
              timestamp: Date.now(),
            },
            warning: "Firestore initialization failed - returning mock data",
            firestoreError: dbError instanceof Error ? dbError.message : String(dbError),
          },
          { status: 201 }
        );
      }
      throw dbError;
    }

    const movementsRef = getCollection(db, "movements");
    
    const movementData: Record<string, unknown> = {
      productId,
      productName: productName || "Unknown Product",
      orgId: userDoc?.orgId || null,
      type,
      from,
      to,
      status,
      quantity,
      trackingNumber: trackingNumber || `MOV-${Date.now()}`,
      createdBy: uid,
      notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Only include estimatedDelivery if it's provided (Firestore doesn't allow undefined)
    if (estimatedDelivery) {
      movementData.estimatedDelivery = new Date(estimatedDelivery).getTime();
    }

    let movementDoc;
    let movementId;
    try {
      movementDoc = await addDoc(movementsRef, movementData);
      movementId = movementDoc.id;
    } catch (firestoreError: unknown) {
      console.error("Error creating movement in Firestore:", firestoreError);
      // If Firestore fails but we're in dev with test token, return mock
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        const mockMovementId = `mock-movement-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            movementId: mockMovementId,
            ...movementData,
            transaction: {
              txHash: mockTxHash,
              blockNumber: 1001,
              status: "confirmed",
              type: "MOVEMENT",
              timestamp: Date.now(),
            },
            warning: "Firestore operation failed - returning mock data",
            firestoreError: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
          },
          { status: 201 }
        );
      }
      throw firestoreError;
    }

    // Create immutable MOVEMENT transaction (try/catch wrapped)
    // Only create transaction if orgId is available (admin users without orgId skip transactions)
    let transaction;
    if (userDoc?.orgId) {
      try {
        transaction = await createMovementTransaction(
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
          },
          app
        );
      } catch (txError: unknown) {
        console.error("Error creating transaction:", txError);
        // If transaction creation fails, still return the movement
        // but with a warning
        transaction = {
          txHash: `pending-${Date.now()}`,
          blockNumber: 1001,
          status: "failed" as const,
          type: "MOVEMENT" as const,
          timestamp: Date.now(),
        };
      }
    } else {
      // Admin users or users without orgId - create a transaction with system orgId
      try {
        transaction = await createMovementTransaction(
          movementId,
          "system", // System orgId for admin users
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
          },
          app
        );
      } catch (txError: unknown) {
        console.error("Error creating transaction:", txError);
        transaction = {
          txHash: `pending-${Date.now()}`,
          blockNumber: 1001,
          status: "failed" as const,
          type: "MOVEMENT" as const,
          timestamp: Date.now(),
        };
      }
    }

    // Update movement document with txHash for direct blockchain linkage
    try {
      const movementRef = doc(db, "movements", movementId);
      await updateDoc(movementRef, {
        txHash: transaction.txHash,
        updatedAt: Date.now(),
      });
      // Also update movementData for response
      movementData.txHash = transaction.txHash;
    } catch (updateError: unknown) {
      // Log error but don't fail the request - movement was already created
      console.error("Error updating movement with txHash:", updateError);
      // Still include txHash in response even if update failed
      movementData.txHash = transaction.txHash;
    }

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
  } catch (error: unknown) {
    console.error("Create movement error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj);
    const errorStack = errorObj instanceof Error ? errorObj.stack : undefined;
    console.error("Error stack:", errorStack);
    console.error("Error name:", errorObj instanceof Error ? errorObj.name : undefined);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        name: errorObj instanceof Error ? errorObj.name : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/movements
 * List movements with filters
 */
export async function GET(request: NextRequest) {
  console.log("[GET /api/movements] Request received");
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

    // Get user document (server-side) - use helper that can auto-create
    const uid = decodedToken.uid;
    const userEmail = decodedToken.email || 'unknown';
    let userDoc: UserDocument | null = null;
    
    try {
      const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
      userDoc = await getUserDocumentServer(uid, userEmail);
    } catch (error) {
      console.error("[Movements GET] Error fetching user document:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { 
          error: "Failed to fetch user information",
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
    
    // If user document doesn't exist, gracefully return empty result set (avoid client error)
    if (!userDoc) {
      const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
      const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "25");
      return NextResponse.json(
        { items: [], total: 0, page, pageSize },
        { status: 200 }
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
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, return empty movements
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        return NextResponse.json({
          items: [],
          total: 0,
          page,
          pageSize,
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
    const movementsRef = getCollection(db, "movements");
    let q = buildQuery(movementsRef);

    // Filter by organization (non-admin users can only see their org's movements)
    if (userDoc && userDoc.role !== "admin" && userDoc.orgId) {
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
  } catch (error: unknown) {
    console.error("Get movements error:", error);
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

