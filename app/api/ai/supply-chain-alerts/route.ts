/**
 * API Route: Supply Chain Monitoring Alerts
 * GET /api/ai/supply-chain-alerts - Get supply chain monitoring alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import { monitorSupplyChain, aggregateAlerts } from "@/lib/services/ml/automated-agents";

async function getFirestoreUtils() {
  const {
    collection,
    query,
    where,
    getDocs,
    getFirestore,
  } = await import("firebase/firestore");
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

export async function GET(request: NextRequest) {
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
    if (!userDoc || userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all suppliers
    const { collection, query, getDocs, getFirestore, getFirebaseApp } = await getFirestoreUtils();
    const app = getFirebaseApp();
    if (!app) {
      return NextResponse.json(
        { error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const usersRef = collection(db, "users");
    const suppliersQuery = query(usersRef, where("role", "==", "supplier"));
    const suppliersSnapshot = await getDocs(suppliersQuery);

    // Fetch verifications for each supplier
    const verificationsRef = collection(db, "verifications");
    const allAlerts: any[] = [];

    for (const supplierDoc of suppliersSnapshot.docs) {
      const supplierData = supplierDoc.data();
      const supplierId = supplierDoc.id;

      // Get supplier's products
      const productsQuery = query(
        collection(db, "products"),
        where("manufacturerId", "==", supplierId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productIds = productsSnapshot.docs.map((d) => d.id);

      // Get verifications for supplier's products
      let fraudCount = 0;
      let recentVerifications = 0;
      let failureCount = 0;
      let suspiciousCount = 0;
      let totalRiskScore = 0;
      let verificationCount = 0;

      if (productIds.length > 0) {
        const verificationsQuery = query(
          verificationsRef,
          where("productId", "in", productIds.slice(0, 10)) // Firestore limit
        );
        const verificationsSnapshot = await getDocs(verificationsQuery);
        
        verificationsSnapshot.forEach((doc) => {
          const data = doc.data();
          verificationCount++;
          if (Date.now() - (data.createdAt || 0) < 30 * 24 * 60 * 60 * 1000) {
            recentVerifications++;
          }
          if (data.verdict === "FAKE" || data.verdict === "INVALID") {
            failureCount++;
            if (data.verdict === "FAKE") fraudCount++;
          }
          if (data.verdict === "SUSPICIOUS") {
            suspiciousCount++;
          }
          totalRiskScore += data.aiScore || 50;
        });
      }

      const supplierAlerts = await monitorSupplyChain({
        supplierId,
        orgId: supplierData.orgId || "",
        productCount: productsSnapshot.docs.length,
        fraudCount,
        recentVerifications,
        verificationFailureRate: verificationCount > 0 ? failureCount / verificationCount : 0,
        suspiciousProductRate: verificationCount > 0 ? suspiciousCount / verificationCount : 0,
        averageRiskScore: verificationCount > 0 ? totalRiskScore / verificationCount : 50,
        lastActivityTimestamp: supplierData.createdAt || Date.now(),
      });

      allAlerts.push(...supplierAlerts);
    }

    const aggregated = await aggregateAlerts(allAlerts);

    return NextResponse.json({
      alerts: allAlerts,
      summary: aggregated,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Supply chain alerts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

