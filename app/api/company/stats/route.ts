export const runtime = 'nodejs';
/**
 * API Route: Company Dashboard Statistics
 * GET /api/company/stats - Get company-specific statistics
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
    let userDoc = await getUserDocumentServer(decoded.uid, userEmail);
    
    // If user document doesn't exist, try to create it
    if (!userDoc && userEmail) {
      try {
        // getUserDocumentServer should auto-create, but if it doesn't, we'll handle it
        // Try one more time after a brief delay
        userDoc = await getUserDocumentServer(decoded.uid, userEmail);
      } catch (createError) {
        console.warn(`[Company Stats] Failed to create user document for ${decoded.uid}:`, createError);
      }
    }
    
    if (!userDoc) {
      return NextResponse.json({ 
        error: "User not found. Please ensure your account is properly set up." 
      }, { status: 404 });
    }

    // Only company users can access this
    if (userDoc.role !== "company" && userDoc.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Company access only" }, { status: 403 });
    }

    const db = getAdminFirestore();

    // Get organization filter
    // For products: company users' products are filtered by manufacturerId (their uid)
    // For batches: company users' batches are filtered by orgId
    const orgId = userDoc.role === "admin" ? null : userDoc.orgId;
    const manufacturerId = userDoc.role === "admin" ? null : decoded.uid;

    // 1. Total Products - filter by manufacturerId (user's UID) for company users
    let productsQuery = db.collection("products");
    if (manufacturerId) {
      productsQuery = productsQuery.where("manufacturerId", "==", manufacturerId) as typeof productsQuery;
    }
    const productsSnapshot = await productsQuery.get();
    const totalProducts = productsSnapshot.size;
    
    console.log(`[Company Stats] User: ${decoded.uid}, Role: ${userDoc.role}, OrgId: ${orgId}, ManufacturerId: ${manufacturerId}, Products found: ${totalProducts}`);
    
    // Active products (status === "active")
    const activeProducts = productsSnapshot.docs.filter(
      (doc: QueryDocumentSnapshot) => doc.data().status === "active"
    ).length;

    // 2. Total Batches - filter by orgId or createdBy
    let batchesQuery = db.collection("batches");
    if (orgId) {
      batchesQuery = batchesQuery.where("orgId", "==", orgId) as typeof batchesQuery;
    } else if (userDoc.role !== "admin") {
      // If no orgId, filter by createdBy (user's UID)
      batchesQuery = batchesQuery.where("createdBy", "==", decoded.uid) as typeof batchesQuery;
    }
    const batchesSnapshot = await batchesQuery.get();
    const totalBatches = batchesSnapshot.size;
    console.log(`[Company Stats] Batches found: ${totalBatches}`);

    // 3. Total Verifications (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let recentVerificationsCount = 0;
    
    // Filter by organization if not admin
    if (orgId) {
      // Get product IDs for this organization
      const orgProductIds = productsSnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.id);
      if (orgProductIds.length > 0) {
        // Note: Firestore 'in' queries are limited to 10 items, so we'll filter after fetching
        // For now, we'll get all recent verifications and filter in memory
        const allVerifications = await db.collection("verifications")
          .where("createdAt", ">=", thirtyDaysAgo)
          .get();
        const recentVerifications = allVerifications.docs.filter((doc: QueryDocumentSnapshot) => {
          const data = doc.data();
          return orgProductIds.includes(data.productId as string);
        });
        recentVerificationsCount = recentVerifications.length;
      } else {
        recentVerificationsCount = 0;
      }
    } else {
      const verificationsQuery = db.collection("verifications")
        .where("createdAt", ">=", thirtyDaysAgo);
      const verificationsSnapshot = await verificationsQuery.get();
      recentVerificationsCount = verificationsSnapshot.size;
    }

    // 4. Recent Activity (products created in last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentProducts = productsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      const createdAt = doc.data().createdAt || 0;
      return createdAt >= sevenDaysAgo;
    }).length;

    // 5. Products with QR codes
    const productsWithQR = productsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return data.qrDataUrl || data.qrCode;
    }).length;

    // 6. Products by status
    const productsByStatus = {
      active: 0,
      inactive: 0,
      out_of_stock: 0,
      pending: 0,
    };
    productsSnapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
      const status = doc.data().status || "active";
      if (status in productsByStatus) {
        productsByStatus[status as keyof typeof productsByStatus]++;
      }
    });

    // 7. Products in batches
    const productsInBatches = productsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      return doc.data().batchId;
    }).length;

    // 8. Unique categories count
    const categoriesSet = new Set<string>();
    productsSnapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
      const category = doc.data().category;
      if (category) {
        categoriesSet.add(category as string);
      }
    });
    const uniqueCategories = categoriesSet.size;

    // 9. Total verifications (all time)
    let totalVerificationsCount = 0;
    if (orgId) {
      const orgProductIds = productsSnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.id);
      if (orgProductIds.length > 0) {
        const allVerifications = await db.collection("verifications").get();
        const orgVerifications = allVerifications.docs.filter((doc: QueryDocumentSnapshot) => {
          const data = doc.data();
          return orgProductIds.includes(data.productId as string);
        });
        totalVerificationsCount = orgVerifications.length;
      }
    } else {
      const verificationsSnapshot = await db.collection("verifications").get();
      totalVerificationsCount = verificationsSnapshot.size;
    }

    // 10. Verification breakdown (last 30 days)
    let genuine = 0;
    let suspicious = 0;
    let fake = 0;

    if (orgId) {
      const orgProductIds = productsSnapshot.docs.map((doc: QueryDocumentSnapshot) => doc.id);
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

    // 11. Products without images
    const productsWithoutImages = productsSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      return !doc.data().imgUrl;
    }).length;

    // 12. Recent batches (last 7 days)
    const recentBatches = batchesSnapshot.docs.filter((doc: QueryDocumentSnapshot) => {
      const createdAt = doc.data().createdAt || 0;
      return createdAt >= sevenDaysAgo;
    }).length;

    return NextResponse.json({
      stats: {
        totalProducts,
        activeProducts,
        inactiveProducts: productsByStatus.inactive,
        outOfStockProducts: productsByStatus.out_of_stock,
        pendingProducts: productsByStatus.pending,
        totalBatches,
        recentBatches,
        recentVerifications: recentVerificationsCount,
        totalVerifications: totalVerificationsCount,
        recentProducts,
        productsWithQR,
        productsInBatches,
        productsWithoutImages,
        uniqueCategories,
        verificationBreakdown: {
          genuine,
          suspicious,
          fake,
        },
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Company Stats API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

