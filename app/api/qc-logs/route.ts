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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
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

