export const runtime = 'nodejs';
/**
 * API Route: SME Dashboard Statistics
 * GET /api/sme/stats - Get SME-specific statistics
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

    // Only SME users can access this
    if (userDoc.role !== "sme" && userDoc.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - SME access only" }, { status: 403 });
    }

    const db = getAdminFirestore();

    // For SME users, products are filtered by manufacturerId (their uid)
    const manufacturerId = userDoc.role === "admin" ? null : decoded.uid;

    // 1. Total Products
    let productsQuery: any = db.collection("products");
    if (manufacturerId) {
      productsQuery = productsQuery.where("manufacturerId", "==", manufacturerId);
    }
    const productsSnapshot = await productsQuery.get();
    const totalProducts = productsSnapshot.size;
    
    // Active products
    const activeProducts = productsSnapshot.docs.filter(
      (doc: any) => doc.data().status === "active"
    ).length;

    // Products with QR codes
    const productsWithQR = productsSnapshot.docs.filter((doc: any) => {
      const data = doc.data();
      return data.qrDataUrl || data.qrCode;
    }).length;

    // Recent products (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentProducts = productsSnapshot.docs.filter((doc: any) => {
      const createdAt = doc.data().createdAt || 0;
      return createdAt >= sevenDaysAgo;
    }).length;

    // 2. Total Verifications (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let recentVerificationsCount = 0;
    let totalVerificationsCount = 0;
    
    if (manufacturerId) {
      const orgProductIds = productsSnapshot.docs.map((doc: any) => doc.id);
      if (orgProductIds.length > 0) {
        const allVerifications30d = await db.collection("verifications")
          .where("createdAt", ">=", thirtyDaysAgo)
          .get();
        
        const allVerifications = await db.collection("verifications").get();
        
        allVerifications30d.docs.forEach((doc: any) => {
          const data = doc.data();
          if (orgProductIds.includes(data.productId)) {
            recentVerificationsCount++;
          }
        });

        allVerifications.docs.forEach((doc: any) => {
          const data = doc.data();
          if (orgProductIds.includes(data.productId)) {
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

    if (manufacturerId) {
      const orgProductIds = productsSnapshot.docs.map((doc: any) => doc.id);
      if (orgProductIds.length > 0) {
        const allVerifications30d = await db.collection("verifications")
          .where("createdAt", ">=", thirtyDaysAgo)
          .get();
        
        allVerifications30d.docs.forEach((doc: any) => {
          const data = doc.data();
          if (orgProductIds.includes(data.productId)) {
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
    let batchesQuery: any = db.collection("batches");
    if (userDoc.orgId) {
      batchesQuery = batchesQuery.where("orgId", "==", userDoc.orgId);
    } else if (userDoc.role !== "admin") {
      batchesQuery = batchesQuery.where("createdBy", "==", decoded.uid);
    }
    const batchesSnapshot = await batchesQuery.get();
    const totalBatches = batchesSnapshot.size;

    // Unique categories
    const categoriesSet = new Set<string>();
    productsSnapshot.docs.forEach((doc: any) => {
      const category = doc.data().category;
      if (category) {
        categoriesSet.add(category);
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

