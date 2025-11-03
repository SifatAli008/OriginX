/**
 * API Route: Movement Quality Control
 * POST /api/movements/:id/qc - Record QC check and approval for a movement
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
    getFirestore,
  } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    getFirestore,
    getFirebaseApp,
  };
}

/**
 * POST /api/movements/:id/qc
 * Record a quality control check for a movement
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

    // Check if user has warehouse or admin role (required for QC)
    if (userDoc.role !== "warehouse" && userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied - Only warehouse staff and admins can perform QC checks" },
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
      qcResult,      // "passed" | "failed" | "pending"
      qcNotes,       // Notes about the QC check
      qcInspector,   // Name/ID of QC inspector (optional, defaults to current user)
      inspectedBy,   // Alias for qcInspector
      defects,       // Array of defect descriptions (optional)
      images,        // Array of image URLs (optional)
      approvedBy,    // Name/ID of approver (optional)
      approvalNotes, // Approval notes (optional)
      updateStatus,  // Whether to update movement status based on QC result (optional, default: true)
    } = body;

    // Validate qcResult
    const validResults = ["passed", "failed", "pending"];
    if (!qcResult || !validResults.includes(qcResult)) {
      return NextResponse.json(
        { error: `Invalid qcResult. Must be one of: ${validResults.join(", ")}` },
        { status: 400 }
      );
    }

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

    // Check if user has permission (non-admin users can only QC movements in their org)
    if (userDoc.role !== "admin" && movementData.orgId !== userDoc.orgId) {
      return NextResponse.json(
        { error: "Access denied - You can only QC movements in your organization" },
        { status: 403 }
      );
    }

    // Determine inspector name
    const inspectorName = qcInspector || inspectedBy || userDoc.displayName || userDoc.email;

    // Create QC log record
    const qcRef = getCollection(db, "qc_logs");
    const qcData = {
      movementId,
      orgId: movementData.orgId,
      productId: movementData.productId,
      productName: movementData.productName,
      qcResult,
      qcInspector: inspectorName,
      qcInspectorId: uid,
      qcNotes: qcNotes || null,
      defects: defects || [],
      images: images || [],
      approvedBy: approvedBy || null,
      approvedById: null, // Could be looked up if approvedBy is a user ID
      approvalNotes: approvalNotes || null,
      movementType: movementData.type,
      movementFrom: movementData.from,
      movementTo: movementData.to,
      trackingNumber: movementData.trackingNumber,
      quantity: movementData.quantity || 1,
      createdAt: Date.now(),
      createdBy: uid,
    };

    const qcDoc = await addDoc(qcRef, qcData);
    const qcId = qcDoc.id;

    // Update movement status based on QC result if requested
    let newStatus = movementData.status;
    if (updateStatus !== false) {
      if (qcResult === "passed") {
        newStatus = "qc_passed";
      } else if (qcResult === "failed") {
        newStatus = "qc_failed";
      }
      
      await updateDoc(movementRef, {
        status: newStatus,
        qcStatus: qcResult,
        lastQcAt: Date.now(),
        lastQcBy: inspectorName,
        updatedAt: Date.now(),
      });
    } else {
      await updateDoc(movementRef, {
        qcStatus: qcResult,
        lastQcAt: Date.now(),
        lastQcBy: inspectorName,
        updatedAt: Date.now(),
      });
    }

    // Create immutable QC_LOG transaction
    const transaction = await createTransaction(
      "QC_LOG",
      "movement",
      movementId,
      userDoc.orgId,
      uid,
      {
        qcId,
        qcResult,
        qcInspector: inspectorName,
        qcNotes: qcData.qcNotes,
        defects: qcData.defects,
        productId: movementData.productId,
        productName: movementData.productName,
        movementType: movementData.type,
        from: movementData.from,
        to: movementData.to,
        trackingNumber: movementData.trackingNumber,
        quantity: movementData.quantity,
        approvedBy: qcData.approvedBy,
      }
    );

    return NextResponse.json(
      {
        qcId,
        ...qcData,
        movement: {
          id: movementId,
          status: newStatus,
          qcStatus: qcResult,
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
    console.error("Create QC log error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

