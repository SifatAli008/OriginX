/**
 * API Route: GDPR Data Export
 * POST /api/gdpr/export - Request data export
 * GET /api/gdpr/export/:id - Get export status/download
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
import type { DataExport } from "@/lib/types/gdpr";

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
    getFirestore,
    app,
  };
}

/**
 * POST /api/gdpr/export
 * Request data export
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
    // ... (same user doc fetching as before)

    const body = await request.json();
    const { format = "json", dataCategories = ["profile"] } = body;

    // Validate format
    const validFormats = ["json", "csv", "pdf"];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(", ")}` },
        { status: 400 }
      );
    }

    // Create export request
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

    const db = getFirestore(app);
    const exportsRef = getCollection(db, "gdpr_exports");

    const exportData: Omit<DataExport, "exportId"> = {
      userId: uid,
      orgId: userDoc?.orgId || undefined,
      status: "pending",
      format,
      dataCategories,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    };

    const exportDoc = await addDoc(exportsRef, exportData);

    // Process export asynchronously (in production, use a queue)
    processExportAsync(exportDoc.id, uid, format, dataCategories, userDoc?.orgId).catch(
      (error) => {
        console.error("Export processing error:", error);
      }
    );

    return NextResponse.json(
      {
        exportId: exportDoc.id,
        ...exportData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create export error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Process export asynchronously
 */
async function processExportAsync(
  exportId: string,
  userId: string,
  format: string,
  dataCategories: string[],
  orgId?: string
): Promise<void> {
  try {
    const { doc, updateDoc, getFirestore, collection, query, where, getDocs } = await import("firebase/firestore");
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
    const exportRef = doc(db, "gdpr_exports", exportId);

    await updateDoc(exportRef, { status: "processing" });

    // Collect user data
    const userData: Record<string, unknown> = {};

    if (dataCategories.includes("profile")) {
      const userRef = doc(db, "users", userId);
      const userSnap = await (await import("firebase/firestore")).getDoc(userRef);
      if (userSnap.exists()) {
        userData.profile = userSnap.data();
      }
    }

    if (dataCategories.includes("products")) {
      const productsRef = collection(db, "products");
      const productsQuery = query(productsRef, where("manufacturerId", "==", userId));
      const productsSnap = await getDocs(productsQuery);
      userData.products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // ... (collect other data categories)

    // Generate export file (simplified - in production, use proper file generation)
    const exportContent = format === "json" 
      ? JSON.stringify(userData, null, 2)
      : "CSV/PDF export not yet implemented";

    // In production, upload to Firebase Storage and get download URL
    const fileUrl = `data:application/json;base64,${Buffer.from(exportContent).toString("base64")}`;

    await updateDoc(exportRef, {
      status: "completed",
      fileUrl,
      completedAt: Date.now(),
    });
  } catch (error) {
    console.error("Export processing error:", error);
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
    const exportRef = doc(db, "gdpr_exports", exportId);

    await updateDoc(exportRef, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

