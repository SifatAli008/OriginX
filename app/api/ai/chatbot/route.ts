/**
 * API Route: Customer Support Chatbot
 * POST /api/ai/chatbot - Process customer support queries
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import { processChatQuery, shouldEscalateToHuman } from "@/lib/services/ml/customer-support-chatbot";

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
        { error: "Invalid token" },
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

    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid message" },
        { status: 400 }
      );
    }

    // Build context from user data
    const { collection, query, where, orderBy, limit, getDocs, getFirestore, getFirebaseApp } = await getFirestoreUtils();
    const app = getFirebaseApp();
    const context: { userId: string; userRole: string; orgId?: string; recentVerifications?: number } = {
      userId: uid,
      userRole: userDoc.role,
      orgId: userDoc.orgId,
    };

    if (app) {
      try {
        const db = getFirestore(app);
        const verificationsRef = collection(db, "verifications");
        const recentVerificationsQuery = query(
          verificationsRef,
          where("verifierId", "==", uid),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const verificationsSnapshot = await getDocs(recentVerificationsQuery);
        context.recentVerifications = verificationsSnapshot.docs.length;
      } catch (error) {
        console.error("Failed to fetch user context:", error);
      }
    }

    // Process chat query
    const response = await processChatQuery(message, context);

    // Check if escalation needed
    const history = conversationHistory || [];
    const shouldEscalate = shouldEscalateToHuman(response, history);

    return NextResponse.json({
      response: response.response,
      confidence: response.confidence,
      suggestedActions: response.suggestedActions,
      flagged: response.flagged,
      incidentType: response.incidentType,
      escalate: shouldEscalate,
      ...(shouldEscalate && {
        escalationMessage: "This query has been flagged for human review. Our support team will contact you shortly.",
      }),
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

