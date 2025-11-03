/**
 * API Route: Support Ticket Operations
 * GET /api/support/tickets/:id - Get ticket details
 * PUT /api/support/tickets/:id - Update ticket (status, assign, etc.)
 * POST /api/support/tickets/:id/reply - Add reply to ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
import type { SupportTicket, TicketReply } from "@/lib/types/support";
import { sendNotification } from "@/lib/services/notifications";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    doc,
    getDoc,
    updateDoc,
    addDoc,
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
    doc,
    getDoc,
    updateDoc,
    addDoc,
    getFirestore,
    app,
  };
}

/**
 * GET /api/support/tickets/:id
 * Get ticket details with replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: ticketId } = await params;

    // Get ticket and user document
    const { doc: getDocRef, getDoc, getFirestore, app } = await getFirestoreUtils();

    if (!app) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    
    // Get user document for permission check
    let userRole: string | undefined = undefined;
    let userOrgId: string | undefined = undefined;
    
    if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
      userRole = 'admin';
      userOrgId = 'test-org-123';
    } else {
      try {
        const userRef = getDocRef(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserDocument;
          userRole = userData.role || undefined;
          userOrgId = userData.orgId != null ? userData.orgId : undefined;
        }
      } catch (err) {
        console.error("Error fetching user document:", err);
      }
    }

    if (!userRole) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const ticketRef = getDocRef(db, "support_tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = { ticketId, ...ticketSnap.data() } as SupportTicket;

    // Check permissions
    if (userRole !== "admin" && ticket.userId !== uid) {
      if (userOrgId !== ticket.orgId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error: unknown) {
    console.error("Get ticket error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/support/tickets/:id
 * Update ticket (status, assign, priority, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: ticketId } = await params;
    const body = await request.json();
    const { status, priority, assignedTo, tags } = body;

    const { doc: getDocRef, getDoc, updateDoc, getFirestore, app } = await getFirestoreUtils();

    if (!app) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    
    // Get user document for role check
    let userRole: string | undefined = undefined;
    try {
      const userRef = getDocRef(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserDocument;
        userRole = userData.role || undefined;
      }
    } catch (err) {
      console.error("Error fetching user document:", err);
    }

    const ticketRef = getDocRef(db, "support_tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = ticketSnap.data() as SupportTicket;

    // Only admin or ticket owner can update
    if (userRole !== "admin" && ticket.userId !== uid) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Partial<SupportTicket> = {
      updatedAt: Date.now(),
    };

    if (status) {
      updates.status = status;
      if (status === "resolved") {
        updates.resolvedAt = Date.now();
      }
      if (status === "closed") {
        updates.closedAt = Date.now();
      }
    }

    if (priority) updates.priority = priority;
    if (assignedTo && userRole === "admin") {
      updates.assignedTo = assignedTo;
    }
    if (tags) updates.tags = tags;

    await updateDoc(ticketRef, updates);

    // Send notification
    if (status && ticket.userId) {
      await sendNotification({
        userId: ticket.userId,
        orgId: ticket.orgId,
        type: "info",
        channel: ["in_app", "email"],
        title: "Ticket Updated",
        message: `Your ticket #${ticketId.substring(0, 8)} has been ${status}.`,
      });
    }

    return NextResponse.json(
      { ticketId, ...updates },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update ticket error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/tickets/:id/reply
 * Add reply to ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: ticketId } = await params;
    const body = await request.json();
    const { message, isInternal = false, attachments = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get user and ticket (similar to GET)
    // ... (user doc fetching logic)

    const { doc: getDocRef, getDoc, updateDoc, getFirestore, app } = await getFirestoreUtils();

    if (!app) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const ticketRef = getDocRef(db, "support_tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (!ticketSnap.exists()) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = ticketSnap.data() as SupportTicket;

    // Create reply
    const reply: TicketReply = {
      replyId: `reply_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ticketId,
      userId: uid,
      userName: undefined, // Could fetch from user doc
      userEmail: "", // Could fetch from user doc
      isInternal,
      message,
      attachments,
      createdAt: Date.now(),
      createdBy: uid,
    };

    // Add reply to ticket
    const replies = ticket.replies || [];
    replies.push(reply);

    await updateDoc(ticketRef, {
      replies,
      updatedAt: Date.now(),
      lastReplyBy: uid,
      lastReplyAt: Date.now(),
    });

    // Send notification
    if (!isInternal && ticket.userId !== uid) {
      await sendNotification({
        userId: ticket.userId,
        orgId: ticket.orgId,
        type: "info",
        channel: ["in_app", "email"],
        title: "New Reply on Ticket",
        message: `Your ticket #${ticketId.substring(0, 8)} has a new reply.`,
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error: unknown) {
    console.error("Add reply error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

