/**
 * API Route: GDPR Data Deletion
 * POST /api/gdpr/delete - Request data deletion (right to be forgotten)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
import type { DataDeletionRequest } from "@/lib/types/gdpr";
import { auditRequest } from "@/lib/utils/audit";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
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
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
    getFirestore,
    app,
  };
}

/**
 * POST /api/gdpr/delete
 * Request data deletion
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

    const body = await request.json();
    const { reason } = body;

    // Create deletion request
    const {
      collection: getCollection,
      addDoc,
      getFirestore,
      app,
    } = await getFirestoreUtils();

    if (!app) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    // Get user document for orgId and user details
    let orgId: string | undefined = undefined;
    let userEmail: string | undefined = undefined;
    let userName: string | undefined = undefined;
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const db = getFirestore(app);
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserDocument;
        orgId = userData.orgId || undefined;
        userEmail = userData.email || undefined;
        userName = userData.displayName || undefined;
      }
    } catch (err) {
      console.error("Error fetching user document:", err);
    }

    const db = getFirestore(app);
    const requestsRef = getCollection(db, "gdpr_deletion_requests");

    const deletionRequest: Omit<DataDeletionRequest, "requestId"> = {
      userId: uid,
      orgId: orgId,
      status: "pending",
      reason,
      requestedAt: Date.now(),
    };

    const requestDoc = await addDoc(requestsRef, deletionRequest);

    // Audit log
    await auditRequest(
      "data_delete",
      "user",
      {
        userId: uid,
        userEmail: userEmail,
        userName: userName || undefined,
        orgId: orgId,
        description: "GDPR data deletion request submitted",
        metadata: { reason, requestId: requestDoc.id },
        outcome: "success",
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      }
    );

    // Process deletion asynchronously (in production, use a queue)
    processDeletionAsync(requestDoc.id, uid, orgId).catch(
      (error) => {
        console.error("Deletion processing error:", error);
      }
    );

    return NextResponse.json(
      {
        requestId: requestDoc.id,
        message: "Data deletion request submitted. You will be notified when processing is complete.",
        ...deletionRequest,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create deletion request error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Process data deletion asynchronously
 * NOTE: In production, this should run in a secure, isolated environment
 * Some data may need to be retained for legal/compliance reasons (e.g., transactions)
 */
async function processDeletionAsync(
  requestId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _orgId?: string
): Promise<void> {
  try {
    const { doc, updateDoc, getFirestore, collection, query, where, getDocs, writeBatch } = await import("firebase/firestore");
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
    const requestRef = doc(db, "gdpr_deletion_requests", requestId);

    await updateDoc(requestRef, { status: "processing" });

    // Delete user data from various collections
    // Note: Some data (like transactions) may need to be anonymized rather than deleted for audit purposes

    const batch = writeBatch(db);

    // Delete user document (anonymize instead for audit trail)
    const userRef = doc(db, "users", userId);
    const userSnap = await (await import("firebase/firestore")).getDoc(userRef);
    if (userSnap.exists()) {
      // Anonymize user data instead of deleting
      batch.update(userRef, {
        email: `deleted_${userId}@originx.deleted`,
        displayName: "[Deleted User]",
        photoURL: null,
        status: "inactive",
        updatedAt: Date.now(),
        gdprDeleted: true,
        deletedAt: Date.now(),
      });
    }

    // Delete/anonymize user's products (if owner)
    const productsRef = collection(db, "products");
    const productsQuery = query(productsRef, where("manufacturerId", "==", userId));
    const productsSnap = await getDocs(productsQuery);
    productsSnap.docs.forEach((productDoc) => {
      batch.update(productDoc.ref, {
        manufacturerName: "[Deleted User]",
        updatedAt: Date.now(),
      });
    });

    // Anonymize user's movements
    const movementsRef = collection(db, "movements");
    const movementsQuery = query(movementsRef, where("createdBy", "==", userId));
    const movementsSnap = await getDocs(movementsQuery);
    movementsSnap.docs.forEach((movementDoc) => {
      batch.update(movementDoc.ref, {
        createdBy: "[deleted]",
        updatedAt: Date.now(),
      });
    });

    // Commit batch
    await batch.commit();

    // Mark request as completed
    await updateDoc(requestRef, {
      status: "completed",
      processedAt: Date.now(),
    });

    // Note: Transactions should NOT be deleted (immutable audit trail)
    // They can be anonymized by removing personal identifiers
  } catch (error) {
    console.error("Deletion processing error:", error);
    const { doc, updateDoc, getFirestore } = await import("firebase/firestore");
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
    const requestRef = doc(db, "gdpr_deletion_requests", requestId);

    await updateDoc(requestRef, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

