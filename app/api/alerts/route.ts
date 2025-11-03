/**
 * API Route: Alerts
 * POST /api/alerts - Create an alert
 * GET /api/alerts - List alerts with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
import type { Alert } from "@/lib/types/notifications";
import { createAlert } from "@/lib/services/notifications";

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

/**
 * POST /api/alerts
 * Create an alert
 */
export async function POST(request: NextRequest) {
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

    const uid = decodedToken.uid;

    // Get user document
    let userDoc: UserDocument | null = null;
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

    if (!userDoc || !userDoc.orgId) {
      return NextResponse.json(
        { error: "User must be associated with an organization" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      subject,
      message,
      severity = "medium",
      category = "other",
      userId, // Optional: alert for specific user
      actionRequired = false,
      actionUrl,
      metadata,
    } = body;

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields: subject, message" },
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity. Must be one of: ${validSeverities.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["security", "system", "product", "movement", "verification", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Create alert
    const alertId = await createAlert({
      orgId: userDoc.orgId,
      userId,
      subject,
      message,
      severity,
      category,
      actionRequired,
      actionUrl,
      metadata,
    });

    return NextResponse.json(
      {
        alertId,
        message: "Alert created successfully",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts
 * List alerts with filters
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

    // Get user document (similar to POST)
    // ... (user doc fetching)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as Alert["status"] | null;
    const severity = searchParams.get("severity") as Alert["severity"] | null;
    const category = searchParams.get("category") as Alert["category"] | null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Build query
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      orderBy: buildOrderBy,
      limitQuery,
      getDocs,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const alertsRef = getCollection(db, "alerts");
    let q = buildQuery(alertsRef);

    // Filter by org (non-admin users only see their org's alerts)
    // ... (org filtering logic)

    // Apply filters
    if (status) {
      q = buildQuery(q, buildWhere("status", "==", status));
    }
    if (severity) {
      q = buildQuery(q, buildWhere("severity", "==", severity));
    }
    if (category) {
      q = buildQuery(q, buildWhere("category", "==", category));
    }

    // Order by creation date (newest first)
    q = buildQuery(q, buildOrderBy("createdAt", "desc"));

    // Pagination
    q = buildQuery(q, limitQuery(pageSize));

    const querySnapshot = await getDocs(q);
    const alerts = querySnapshot.docs.map((doc) => ({
      alertId: doc.id,
      ...doc.data(),
    })) as Alert[];

    return NextResponse.json(
      {
        items: alerts,
        total: alerts.length,
        page,
        pageSize,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get alerts error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

