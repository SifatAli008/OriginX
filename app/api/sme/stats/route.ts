export const runtime = 'nodejs';
/**
 * API Route: SME Dashboard Statistics
 * GET /api/sme/stats - Get SME-specific statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

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

    // Only SME users can access this
    if (userDoc.role !== "sme" && userDoc.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - SME access only" }, { status: 403 });
    }

    const db = getAdminFirestore();

    // For SME users, products include ones created by them AND ones transferred to them
    const isAdmin = userDoc.role === "admin";
    const manufacturerId = isAdmin ? null : decoded.uid;

    // 1. Total Products
    const productsQuery = db.collection("products");
    const baseProductsSnapshot = await productsQuery.get();
    let productDocs: QueryDocumentSnapshot[] = baseProductsSnapshot.docs as QueryDocumentSnapshot[];

    if (!isAdmin) {
      // Start with products created by the SME
      const createdBySme = baseProductsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => doc.data().manufacturerId === manufacturerId);

      // Also include products transferred to this SME via movements
      const toValues = [userDoc.displayName, userDoc.email].filter(Boolean) as string[];
      const movedInProductIds = new Set<string>();
      if (toValues.length > 0) {
        const movSnap = await db.collection("movements").where("to", "in", toValues).get();
        movSnap.forEach((m: QueryDocumentSnapshot) => {
          const data = m.data() as { productId?: string };
          if (data.productId) movedInProductIds.add(data.productId);
        });
      }

      const movedInDocs = baseProductsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => movedInProductIds.has(doc.id));
      const mergedMap = new Map<string, QueryDocumentSnapshot>();
      [...createdBySme, ...movedInDocs].forEach((d) => mergedMap.set(d.id, d));
      productDocs = Array.from(mergedMap.values());
    }

    const totalProducts = productDocs.length;
    
    // Active products
    const activeProducts = productDocs.filter(
      (doc: QueryDocumentSnapshot) => doc.data().status === "active"
    ).length;

    // Products with QR codes
    const productsWithQR = productDocs.filter((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return data.qrDataUrl || data.qrCode;
    }).length;

    // Recent products (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentProducts = productDocs.filter((doc: QueryDocumentSnapshot) => {
      const createdAt = doc.data().createdAt || 0;
      return createdAt >= sevenDaysAgo;
    }).length;

    // 2. Total Verifications (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let recentVerificationsCount = 0;
    let totalVerificationsCount = 0;
    
    if (!isAdmin) {
      const orgProductIds = productDocs.map((doc: QueryDocumentSnapshot) => doc.id);
      if (orgProductIds.length > 0) {
        const allVerifications30d = await db.collection("verifications")
          .where("createdAt", ">=", thirtyDaysAgo)
          .get();
        
        const allVerifications = await db.collection("verifications").get();
        
        allVerifications30d.docs.forEach((doc: QueryDocumentSnapshot) => {
          const data = doc.data();
          if (orgProductIds.includes(data.productId as string)) {
            recentVerificationsCount++;
          }
        });

        allVerifications.docs.forEach((doc: QueryDocumentSnapshot) => {
          const data = doc.data();
          if (orgProductIds.includes(data.productId as string)) {
            totalVerificationsCount++;
          }
        });
      }
    } else {
      const verificationsQuery30d = db.collection("verifications")
        .where("createdAt", ">=", thirtyDaysAgo);
      const verificationsSnapshot30d = await verificationsQuery30d.get();
      recentVerificationsCount = verificationsSnapshot30d.size;

      const verificationsSnapshot = await db.collection("verifications").get();
      totalVerificationsCount = verificationsSnapshot.size;
    }

    // Verification breakdown (last 30 days)
    let genuine = 0;
    let suspicious = 0;
    let fake = 0;

    if (!isAdmin) {
      const orgProductIds = productDocs.map((doc: QueryDocumentSnapshot) => doc.id);
      if (orgProductIds.length > 0) {
        const allVerifications30d = await db.collection("verifications")
          .where("createdAt", ">=", thirtyDaysAgo)
          .get();
        
        allVerifications30d.docs.forEach((doc: QueryDocumentSnapshot) => {
          const data = doc.data();
          if (orgProductIds.includes(data.productId as string)) {
            if (data.verdict === "GENUINE") genuine++;
            else if (data.verdict === "SUSPICIOUS") suspicious++;
            else if (data.verdict === "FAKE") fake++;
          }
        });
      }
    } else {
      const genuineSnapshot = await db.collection("verifications")
        .where("createdAt", ">=", thirtyDaysAgo)
        .where("verdict", "==", "GENUINE")
        .get();
      genuine = genuineSnapshot.size;

      const suspiciousSnapshot = await db.collection("verifications")
        .where("createdAt", ">=", thirtyDaysAgo)
        .where("verdict", "==", "SUSPICIOUS")
        .get();
      suspicious = suspiciousSnapshot.size;

      const fakeSnapshot = await db.collection("verifications")
        .where("createdAt", ">=", thirtyDaysAgo)
        .where("verdict", "==", "FAKE")
        .get();
      fake = fakeSnapshot.size;
    }

    // 3. Total Batches
    let batchesQuery = db.collection("batches");
    if (userDoc.orgId) {
      batchesQuery = batchesQuery.where("orgId", "==", userDoc.orgId) as typeof batchesQuery;
    } else if (userDoc.role !== "admin") {
      batchesQuery = batchesQuery.where("createdBy", "==", decoded.uid) as typeof batchesQuery;
    }
    const batchesSnapshot = await batchesQuery.get();
    const totalBatches = batchesSnapshot.size;

    // Unique categories
    const categoriesSet = new Set<string>();
    productDocs.forEach((doc: QueryDocumentSnapshot) => {
      const category = doc.data().category;
      if (category) {
        categoriesSet.add(category as string);
      }
    });
    const uniqueCategories = categoriesSet.size;

    return NextResponse.json({
      stats: {
        totalProducts,
        activeProducts,
        productsWithQR,
        recentProducts,
        totalVerifications: totalVerificationsCount,
        recentVerifications: recentVerificationsCount,
        totalBatches,
        uniqueCategories,
        verificationBreakdown: {
          genuine,
          suspicious,
          fake,
        },
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("[SME Stats API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

