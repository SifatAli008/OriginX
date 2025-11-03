/**
 * API Route: Support Tickets
 * POST /api/support/tickets - Create a support ticket
 * GET /api/support/tickets - List tickets with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
import type { SupportTicket, TicketFilters, TicketReply } from "@/lib/types/support";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit: limitQuery,
    getDocs,
    getFirestore,
    Timestamp,
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
    addDoc,
    query,
    where,
    orderBy,
    limitQuery,
    getDocs,
    getFirestore,
    Timestamp,
    app,
  };
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
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
      description,
      category = "other",
      priority = "medium",
      tags = [],
      attachments = [],
    } = body;

    // Validate required fields
    if (!subject || !description) {
      return NextResponse.json(
        { error: "Missing required fields: subject, description" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ["technical", "billing", "feature_request", "bug", "other"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    // Create ticket document
    const {
      collection: getCollection,
      addDoc,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      return NextResponse.json(
        {
          error: "Firebase not configured. Please set Firebase environment variables.",
        },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const ticketsRef = getCollection(db, "support_tickets");

    const ticketData: Omit<SupportTicket, "ticketId"> = {
      userId: uid,
      userEmail: userDoc.email,
      userName: userDoc.displayName || undefined,
      orgId: userDoc.orgId,
      orgName: userDoc.orgName || undefined,
      subject,
      description,
      category,
      priority,
      status: "open",
      tags,
      attachments,
      replies: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: uid,
    };

    const ticketDoc = await addDoc(ticketsRef, ticketData);
    const ticketId = ticketDoc.id;

    // Send notification (async, don't await)
    try {
      const { sendNotification } = await import("@/lib/services/notifications");
      await sendNotification({
        userId: uid,
        orgId: userDoc.orgId,
        type: "success",
        channel: ["in_app", "email"],
        title: "Support Ticket Created",
        message: `Your support ticket #${ticketId.substring(0, 8)} has been created successfully.`,
      });
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        ticketId,
        ...ticketData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create ticket error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/support/tickets
 * List tickets with filters
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
    let userDoc: UserDocument | null = null;
    const uid = decodedToken.uid;

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

    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as TicketFilters["status"] | null;
    const priority = searchParams.get("priority") as TicketFilters["priority"] | null;
    const category = searchParams.get("category") as TicketFilters["category"] | null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search");

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
        {
          error: "Firebase not configured. Please set Firebase environment variables.",
        },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const ticketsRef = getCollection(db, "support_tickets");
    let q = buildQuery(ticketsRef);

    // Filter by user/org (non-admin users only see their own tickets)
    if (userDoc.role !== "admin") {
      if (userDoc.orgId) {
        q = buildQuery(q, buildWhere("orgId", "==", userDoc.orgId));
      }
      q = buildQuery(q, buildWhere("userId", "==", uid));
    } else if (userDoc.orgId) {
      // Admin can see all tickets, but can filter by org
      const filterOrgId = searchParams.get("orgId");
      if (filterOrgId) {
        q = buildQuery(q, buildWhere("orgId", "==", filterOrgId));
      }
    }

    // Apply filters
    if (status) {
      q = buildQuery(q, buildWhere("status", "==", status));
    }
    if (priority) {
      q = buildQuery(q, buildWhere("priority", "==", priority));
    }
    if (category) {
      q = buildQuery(q, buildWhere("category", "==", category));
    }

    // Order by creation date (newest first)
    q = buildQuery(q, buildOrderBy("createdAt", "desc"));

    // Pagination
    q = buildQuery(q, limitQuery(pageSize));

    const querySnapshot = await getDocs(q);
    let tickets = querySnapshot.docs.map((doc) => ({
      ticketId: doc.id,
      ...doc.data(),
    })) as SupportTicket[];

    // Client-side search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      tickets = tickets.filter(
        (ticket) =>
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.ticketId.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(
      {
        items: tickets,
        total: tickets.length,
        page,
        pageSize,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get tickets error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

