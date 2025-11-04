/**
 * API Route: Movement Handover
 * POST /api/movements/:movementId/handover - Record handover event for a movement
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
    query,
    where,
    orderBy,
    getDocs,
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
      query,
      where,
      orderBy,
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
      doc,
      getDoc,
      addDoc,
      updateDoc,
      query,
      where,
      orderBy,
      getDocs,
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
    query,
    where,
    orderBy,
    getDocs,
    getFirestore,
    app,
  };
}

/**
 * POST /api/movements/:movementId/handover
 * Record a handover event for a movement
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
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, return mock response
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        const mockHandoverId = `mock-handover-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            handoverId: mockHandoverId,
            movementId,
            orgId: userDoc.orgId,
            handedOverBy: handedOverBy || userDoc.displayName || userDoc.email,
            handedOverById: uid,
            receivedBy: receivedBy || null,
            handoverLocation: handoverLocation || null,
            handoverNotes: handoverNotes || null,
            condition: condition || null,
            createdAt: Date.now(),
            createdBy: uid,
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
        const mockHandoverId = `mock-handover-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            handoverId: mockHandoverId,
            movementId,
            orgId: userDoc.orgId,
            handedOverBy: handedOverBy || userDoc.displayName || userDoc.email,
            handedOverById: uid,
            receivedBy: receivedBy || null,
            handoverLocation: handoverLocation || null,
            handoverNotes: handoverNotes || null,
            condition: condition || null,
            createdAt: Date.now(),
            createdBy: uid,
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
  } catch (error: unknown) {
    console.error("Create handover error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    console.error("Error details:", {
      message: errorObj.message,
      name: errorObj instanceof Error ? errorObj.name : undefined,
      stack: errorObj instanceof Error ? errorObj.stack : undefined,
    });
    
    // In development with test token, return mock data even on error
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.includes("test-token") && process.env.NODE_ENV === 'development') {
        const mockHandoverId = `mock-handover-${Date.now()}`;
        const mockTxHash = `0x${Date.now().toString(16)}`;
        return NextResponse.json(
          {
            handoverId: mockHandoverId,
            warning: "Error occurred but returning mock data for testing",
            originalError: errorObj.message,
            transaction: {
              txHash: mockTxHash,
              blockNumber: 1001,
              status: "confirmed",
              type: "MOVEMENT",
              timestamp: Date.now(),
            },
          },
          { status: 201 }
        );
      }
    } catch {}
    
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

