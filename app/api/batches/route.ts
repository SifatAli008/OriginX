export const runtime = 'nodejs';
/**
 * API Route: Batches Management
 * GET /api/batches - List all batches for the user's organization
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userEmail = decoded.email || undefined;
    const userDoc = await getUserDocumentServer(decoded.uid, userEmail);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const db = getAdminFirestore();
    let batchesQuery: any = db.collection("batches");

    // Filter by organization if user is not admin
    if (userDoc.role !== "admin") {
      if (userDoc.orgId) {
        batchesQuery = batchesQuery.where("orgId", "==", userDoc.orgId);
      } else {
        // If user has no orgId, filter by createdBy
        batchesQuery = batchesQuery.where("createdBy", "==", decoded.uid);
      }
    }

    const snapshot = await batchesQuery.get();
    const batches = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        batchId: doc.id,
        name: data.name || `Batch ${doc.id.substring(0, 8)}`,
        status: data.status,
        totalCount: data.totalCount || 0,
        createdAt: data.createdAt,
      };
    });

    // Sort by creation date (newest first)
    batches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ batches }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Batches API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

