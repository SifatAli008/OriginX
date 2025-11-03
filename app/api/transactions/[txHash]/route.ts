/**
 * API Route: Get Single Transaction
 * GET /api/transactions/[txHash] - Get transaction details by hash
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";

// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const {
    collection,
    query,
    where,
    getDocs,
  } = await import("firebase/firestore");
  const { getFirestore } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    query,
    where,
    getDocs,
    getFirestore,
    getFirebaseApp,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const userDoc = await getUserDocument(decodedToken.uid);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get txHash from params
    const { txHash } = await params;

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    // Get transaction from Firestore
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      getDocs,
      getFirestore,
      getFirebaseApp,
    } = await getFirestoreUtils();

    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);
    const transactionsRef = getCollection(db, "transactions");
    const q = buildQuery(transactionsRef, buildWhere("txHash", "==", txHash));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const transaction = querySnapshot.docs[0]!.data();

    // Check if user has permission (non-admin users can only see their org's transactions)
    if (userDoc.role !== "admin" && transaction.orgId !== userDoc.orgId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error("Get transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

