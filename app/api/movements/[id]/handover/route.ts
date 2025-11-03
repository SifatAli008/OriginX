/**
 * API Route: Movement Handover
 * POST /api/movements/:id/handover - Record handover event for a movement
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import { createTransaction } from "@/lib/utils/transactions";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    getDocs,
    getFirestore,
  } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    getDocs,
    getFirestore,
    getFirebaseApp,
  };
}

/**
 * POST /api/movements/:id/handover
 * Record a handover event for a movement
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

    // Get movement ID from params
    const { id: movementId } = await params;

    if (!movementId) {
      return NextResponse.json(
        { error: "Movement ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      handedOverBy,      // Name/ID of person handing over (optional, defaults to current user)
      receivedBy,        // Name/ID of person receiving (optional)
      handoverLocation,  // Location where handover occurs (optional)
      handoverNotes,    // Notes about the handover (optional)
      condition,        // Condition of items at handover (optional)
      signature,        // Digital signature (optional)
      updateStatus,     // Whether to update movement status to "delivered" (optional, default: false)
    } = body;

    // Get Firestore utilities
    const {
      collection: getCollection,
      doc: getDocRef,
      getDoc,
      addDoc,
      updateDoc,
      getFirestore,
      getFirebaseApp,
    } = await getFirestoreUtils();

    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);

    // Get the movement document
    const movementRef = getDocRef(db, "movements", movementId);
    const movementDoc = await getDoc(movementRef);

    if (!movementDoc.exists()) {
      return NextResponse.json(
        { error: "Movement not found" },
        { status: 404 }
      );
    }

    const movementData = movementDoc.data();

    // Check if user has permission (non-admin users can only handover movements in their org)
    if (userDoc.role !== "admin" && movementData.orgId !== userDoc.orgId) {
      return NextResponse.json(
        { error: "Access denied - You can only handover movements in your organization" },
        { status: 403 }
      );
    }

    // Create handover record
    const handoverRef = getCollection(db, "handovers");
    const handoverData = {
      movementId,
      orgId: movementData.orgId,
      productId: movementData.productId,
      productName: movementData.productName,
      handedOverBy: handedOverBy || userDoc.displayName || userDoc.email,
      handedOverById: uid,
      receivedBy: receivedBy || null,
      receivedById: null, // Could be looked up if receivedBy is a user ID
      handoverLocation: handoverLocation || movementData.to || null,
      handoverNotes: handoverNotes || null,
      condition: condition || null,
      signature: signature || null,
      movementType: movementData.type,
      movementFrom: movementData.from,
      movementTo: movementData.to,
      quantity: movementData.quantity || 1,
      trackingNumber: movementData.trackingNumber,
      createdAt: Date.now(),
      createdBy: uid,
    };

    const handoverDoc = await addDoc(handoverRef, handoverData);
    const handoverId = handoverDoc.id;

    // Update movement status if requested
    if (updateStatus === true) {
      await updateDoc(movementRef, {
        status: "delivered",
        updatedAt: Date.now(),
        lastHandoverAt: Date.now(),
      });
      movementData.status = "delivered";
    } else {
      await updateDoc(movementRef, {
        updatedAt: Date.now(),
        lastHandoverAt: Date.now(),
      });
    }

    // Create immutable HANDOVER transaction (using MOVEMENT type with handover refType)
    const transaction = await createTransaction(
      "MOVEMENT", // Using MOVEMENT type as specified in TransactionType
      "movement",
      movementId,
      userDoc.orgId,
      uid,
      {
        handoverId,
        handedOverBy: handoverData.handedOverBy,
        receivedBy: handoverData.receivedBy,
        handoverLocation: handoverData.handoverLocation,
        productId: movementData.productId,
        productName: movementData.productName,
        movementType: movementData.type,
        from: movementData.from,
        to: movementData.to,
        quantity: movementData.quantity,
        trackingNumber: movementData.trackingNumber,
        condition: handoverData.condition,
      }
    );

    return NextResponse.json(
      {
        handoverId,
        ...handoverData,
        movement: {
          id: movementId,
          status: movementData.status,
          trackingNumber: movementData.trackingNumber,
        },
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
    console.error("Create handover error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

