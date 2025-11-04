/**
 * API Route: Movement Quality Control
 * POST /api/movements/:movementId/qc - Record QC check and approval for a movement
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { createTransaction } from "@/lib/utils/transactions";
import type { UserDocument } from "@/lib/types/user";

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
  const { initializeApp, getApps } = await import("firebase/app");
  const { firebaseConfig } = await import("@/lib/firebase/config");
  
  // Check if config is valid
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("Firebase config missing required fields");
    return {
      collection,
      doc,
      getDoc,
      addDoc,
      updateDoc,
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
      doc,
      getDoc,
      addDoc,
      updateDoc,
      getFirestore,
      app: null,
    };
  }
  
  return {
    collection,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    getFirestore,
    app,
  };
}

/**
 * POST /api/movements/:movementId/qc
 * Record a quality control check for a movement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ movementId: string }> }
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

    // Get user document (server-side)
    let userDoc: UserDocument | null = null;
    
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
        const { doc: getDocRef, getDoc, getFirestore } = await import("firebase/firestore");
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
        const userRef = getDocRef(db, "users", uid);
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

    // Check if user has warehouse or admin role (required for QC)
    if (userDoc.role !== "warehouse" && userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied - Only warehouse staff and admins can perform QC checks" },
        { status: 403 }
      );
    }

    // Get movement ID from params
    const { movementId } = await params;

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
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, return mock response
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        const mockQcId = `mock-qc-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            qcId: mockQcId,
            movementId,
            orgId: userDoc.orgId,
            qcResult: qcResult || "passed",
            qcInspector: qcInspector || inspectedBy || userDoc.displayName || userDoc.email,
            qcInspectorId: uid,
            qcNotes: qcNotes || null,
            defects: defects || [],
            images: images || [],
            createdAt: Date.now(),
            createdBy: uid,
            transaction: {
              txHash: mockTxHash,
              blockNumber: 1001,
              status: "confirmed",
              type: "QC_LOG",
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
        const mockQcId = `mock-qc-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            qcId: mockQcId,
            movementId,
            orgId: userDoc.orgId,
            qcResult: qcResult || "passed",
            qcInspector: qcInspector || inspectedBy || userDoc.displayName || userDoc.email,
            qcInspectorId: uid,
            qcNotes: qcNotes || null,
            defects: defects || [],
            images: images || [],
            createdAt: Date.now(),
            createdBy: uid,
            transaction: {
              txHash: mockTxHash,
              blockNumber: 1001,
              status: "confirmed",
              type: "QC_LOG",
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
  } catch (error: unknown) {
    console.error("Create QC log error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    console.error("Error details:", {
      message: errorObj.message,
      name: errorObj instanceof Error ? errorObj.name : undefined,
      stack: errorObj instanceof Error ? errorObj.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
        name: errorObj instanceof Error ? errorObj.name : undefined,
      },
      { status: 500 }
    );
  }
}

