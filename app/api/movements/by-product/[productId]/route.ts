/**
 * API Route: Get Movements by Product (API Key Secured)
 * GET /api/movements/by-product/[productId]
 * Header: x-api-key: <INTERNAL_API_KEY>
 */

import { NextRequest, NextResponse } from "next/server";

// Dynamic imports for Firestore to avoid bundling client SDKs on edge/runtime improperly
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
    limitQuery,
    getDocs,
    getFirestore,
    app,
  };
}

function verifyApiKey(request: NextRequest): { ok: boolean; error?: string } {
  const configuredKey = process.env.INTERNAL_API_KEY;
  if (!configuredKey) {
    return { ok: false, error: "Server misconfiguration: INTERNAL_API_KEY is not set" };
  }
  const headerKey = request.headers.get("x-api-key") || request.headers.get("X-API-Key");
  if (!headerKey) {
    return { ok: false, error: "Unauthorized: missing x-api-key header" };
  }
  if (headerKey !== configuredKey) {
    return { ok: false, error: "Unauthorized: invalid API key" };
  }
  return { ok: true };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // API key authentication
    const keyCheck = verifyApiKey(request);
    if (!keyCheck.ok) {
      return NextResponse.json({ error: keyCheck.error }, { status: 401 });
    }

    const { productId } = await params;
    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );
    }

    // pagination (optional): pageSize defaults to 50
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

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
    const movementsRef = getCollection(db, "movements");
    const q = buildQuery(
      movementsRef,
      buildWhere("productId", "==", productId),
      buildOrderBy("createdAt", "desc"),
      limitQuery(pageSize)
    );

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items, total: items.length, pageSize }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


