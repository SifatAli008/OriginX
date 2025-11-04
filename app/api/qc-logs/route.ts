/**
 * API Route: QC Logs
 * GET /api/qc-logs - List QC logs with filters
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
    orderBy,
    limit,
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
    limit,
    getDocs,
    getFirestore,
    app,
  };
}

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

    // Get user document (server-side) - use helper that can auto-create
    const uid = decodedToken.uid;
    const userEmail = decodedToken.email || 'unknown';
    let userDoc: UserDocument | null = null;
    
    try {
      const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
      userDoc = await getUserDocumentServer(uid, userEmail);
    } catch (error) {
      console.error("[QC Logs] Error fetching user document:", error);
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
        console.warn(`[QC Logs] Admin user document not found, using temporary admin profile for ${uid}`);
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
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const movementId = searchParams.get("movementId");
    const productId = searchParams.get("productId");
    const qcResult = searchParams.get("qcResult");
    const startDate = searchParams.get("startDate") ? parseInt(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? parseInt(searchParams.get("endDate")!) : undefined;

    // Get Firestore utilities
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      orderBy: buildOrderBy,
      limit: buildLimit,
      getDocs,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);

    // Build query
    const qcLogsRef = getCollection(db, "qc_logs");
    let qcLogsQuery = buildQuery(qcLogsRef);

    // Filter by org (non-admin users only see their org)
    if (userDoc.role !== "admin" && userDoc.orgId) {
      qcLogsQuery = buildQuery(qcLogsQuery, buildWhere("orgId", "==", userDoc.orgId));
    }

    // Apply filters
    if (movementId) {
      qcLogsQuery = buildQuery(qcLogsQuery, buildWhere("movementId", "==", movementId));
    }
    if (productId) {
      qcLogsQuery = buildQuery(qcLogsQuery, buildWhere("productId", "==", productId));
    }
    if (qcResult) {
      qcLogsQuery = buildQuery(qcLogsQuery, buildWhere("qcResult", "==", qcResult));
    }
    if (startDate) {
      qcLogsQuery = buildQuery(qcLogsQuery, buildWhere("createdAt", ">=", startDate));
    }
    if (endDate) {
      qcLogsQuery = buildQuery(qcLogsQuery, buildWhere("createdAt", "<=", endDate));
    }

    // Order by creation date (newest first)
    qcLogsQuery = buildQuery(qcLogsQuery, buildOrderBy("createdAt", "desc"));

    // Pagination
    const offset = (page - 1) * pageSize;
    qcLogsQuery = buildQuery(qcLogsQuery, buildLimit(pageSize + offset));

    // Execute query
    const snapshot = await getDocs(qcLogsQuery);
    const allDocs = snapshot.docs;
    const paginatedDocs = allDocs.slice(offset);

    // Format results
    const items = paginatedDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        movementId: data.movementId || "",
        productId: data.productId || "",
        productName: data.productName || "",
        qcResult: data.qcResult || "pending",
        qcInspector: data.qcInspector || "",
        qcNotes: data.qcNotes || "",
        defects: data.defects || [],
        images: data.images || [],
        approvedBy: data.approvedBy || null,
        createdAt: data.createdAt || Date.now(),
        trackingNumber: data.trackingNumber || "",
        quantity: data.quantity || 1,
      };
    });

    return NextResponse.json({
      items,
      total: allDocs.length,
      page,
      pageSize,
      totalPages: Math.ceil(allDocs.length / pageSize),
    });
  } catch (error) {
    console.error("Get QC logs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

