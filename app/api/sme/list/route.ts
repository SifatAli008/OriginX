export const runtime = 'nodejs';
/**
 * API Route: List all SMEs from Firebase
 * GET /api/sme/list
 * Returns all SMEs (company users and admins can see all SMEs)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { UserDocument } from "@/lib/types/user";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const email = decoded.email as string | undefined;
    const userDoc = await getUserDocumentServer(uid, email);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only company/SME/admin can list SMEs; company and SME are restricted to their org
    if (userDoc.role !== "company" && userDoc.role !== "sme" && userDoc.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let db;
    try {
      db = getAdminFirestore();
    } catch (adminError) {
      const errorMsg = adminError instanceof Error ? adminError.message : String(adminError);
      console.error("[GET /api/sme/list] Firebase Admin error:", errorMsg);
      if (errorMsg.includes('not installed') || 
          errorMsg.includes('Cannot find module') || 
          errorMsg.includes('Could not load the default credentials') ||
          errorMsg.includes('credentials') ||
          errorMsg.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
        return NextResponse.json({ 
          error: "SME list feature is temporarily unavailable. Please set FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable in Vercel with your Firebase service account credentials.",
          items: [],
          total: 0
        }, { status: 503 });
      }
      throw adminError;
    }

    // Fetch all SMEs from Firebase (no orgId filter)
    // Company users and admins can see all SMEs
    const queryRef = db.collection("users").where("role", "==", "sme");
    
    console.log(`[GET /api/sme/list] Fetching all SMEs for user ${uid} (role: ${userDoc.role})`);

    const snapshot = await queryRef.get();
    console.log(`[GET /api/sme/list] Found ${snapshot.docs.length} SME(s) for user ${uid} (role: ${userDoc.role}, orgId: ${userDoc.orgId || 'N/A'})`);
    let items: Array<Pick<UserDocument, "uid" | "email" | "displayName" | "photoURL" | "orgId" | "orgName" | "status">> = snapshot.docs.map((d: QueryDocumentSnapshot) => {
      const data = d.data() as UserDocument;
      return {
        uid: data.uid || d.id,
        email: data.email,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        orgId: data.orgId || null,
        orgName: data.orgName,
        status: data.status,
      };
    });

    // In-memory search filter (case-insensitive) for name/email/orgName
    if (q) {
      items = items.filter((s) =>
        (s.displayName || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.orgName || "").toLowerCase().includes(q)
      );
    }

    // Note: Since we're fetching all SMEs, the in-memory search filter above handles all filtering

    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/sme/list] Error:", errorMsg, error);
    
    // Handle Firebase Admin errors gracefully
    if (errorMsg.includes('not installed') || 
        errorMsg.includes('Cannot find module') || 
        errorMsg.includes('Could not load the default credentials') ||
        errorMsg.includes('credentials') ||
        errorMsg.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
      return NextResponse.json({ 
        error: "SME list feature is temporarily unavailable. Please set FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable in Vercel with your Firebase service account credentials.",
        items: [],
        total: 0
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: errorMsg || "Internal server error",
      items: [],
      total: 0
    }, { status: 500 });
  }
}


