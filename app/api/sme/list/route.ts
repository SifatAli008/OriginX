export const runtime = 'nodejs';
/**
 * API Route: List SMEs in the caller's organization
 * GET /api/sme/list
 * Returns SMEs filtered by the authenticated user's orgId
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { UserDocument } from "@/lib/types/user";

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

    const db = getAdminFirestore();
    let queryRef = db.collection("users").where("role", "==", "sme");

    // Non-admins restricted to their orgId
    if (userDoc.role !== "admin") {
      if (!userDoc.orgId) {
        return NextResponse.json({ error: "Organization not set for user" }, { status: 403 });
      }
      queryRef = queryRef.where("orgId", "==", userDoc.orgId);
    }

    const snapshot = await queryRef.get();
    let items: Array<Pick<UserDocument, "uid" | "email" | "displayName" | "photoURL" | "orgId" | "orgName" | "status">> = snapshot.docs.map((d: any) => {
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

    // Fallback: If nothing matched in org-scoped query and the query looks like an email,
    // try an exact email lookup across orgs (read-only) so companies can find external SMEs by email.
    if (items.length === 0 && q && q.includes("@")) {
      try {
        const exactSnap = await db
          .collection("users")
          .where("role", "==", "sme")
          .where("email", "==", q)
          .limit(5)
          .get();
        const extra = exactSnap.docs.map((d: any) => {
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
        // Only add if not already included
        extra.forEach((e: any) => {
          if (!items.find((x) => x.uid === e.uid)) items.push(e);
        });
      } catch (e) {
        // ignore fallback errors to avoid blocking primary response
        console.warn("[GET /api/sme/list] fallback email lookup failed", e);
      }
    }

    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/sme/list]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


