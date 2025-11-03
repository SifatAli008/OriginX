/**
 * API Route: User Behavior Analysis
 * GET /api/ai/user-behavior?userId=xxx - Analyze user scanning behavior
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { analyzeUserBehavior } from "@/lib/services/ml/user-behavior-analysis";
import { getUserDocument } from "@/lib/firebase/firestore";

async function getFirestoreUtils() {
  const {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getFirestore,
  } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getFirestore,
    getFirebaseApp,
  };
}

export async function GET(request: NextRequest) {
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
    const userDoc = await getUserDocument(uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Only admins can analyze any user, others can only analyze themselves
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || uid;
    
    if (targetUserId !== uid && userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Only admins can analyze other users" },
        { status: 403 }
      );
    }

    // Fetch scan history
    const { collection, query, where, orderBy, limit, getDocs, getFirestore, getFirebaseApp } = await getFirestoreUtils();
    const app = getFirebaseApp();
    if (!app) {
      return NextResponse.json(
        { error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const verificationsRef = collection(db, "verifications");
    const historyQuery = query(
      verificationsRef,
      where("verifierId", "==", targetUserId),
      orderBy("createdAt", "desc"),
      limit(500)
    );

    const snapshot = await getDocs(historyQuery);
    const scanHistory = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        timestamp: data.createdAt || Date.now(),
        productId: data.productId,
        location: data.location?.address,
        verdict: data.verdict,
        aiScore: data.aiScore,
      };
    });

    // Get target user document
    const targetUserDoc = targetUserId === uid ? userDoc : await getUserDocument(targetUserId);

    // Analyze behavior
    const result = await analyzeUserBehavior(
      targetUserId,
      scanHistory,
      targetUserDoc?.role,
      targetUserDoc?.orgId
    );

    return NextResponse.json({
      userId: targetUserId,
      analysis: result,
      scanCount: scanHistory.length,
    });
  } catch (error) {
    console.error("User behavior analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

