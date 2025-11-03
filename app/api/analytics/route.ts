/**
 * API Route: Analytics & Reports
 * GET /api/analytics - Get KPIs, trends, and analytics data
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

interface AnalyticsData {
  kpis: {
    totalProducts: number;
    totalVerifications: number;
    counterfeitCount: number;
    lossPrevented: number; // Estimated value in USD
    genuineCount: number;
    suspiciousCount: number;
    fakeCount: number;
    invalidCount: number;
  };
  trends: {
    dailyMovements: Array<{ date: string; count: number }>;
    verificationSuccessRate: Array<{ date: string; rate: number }>;
    counterfeitRate: Array<{ date: string; rate: number }>;
  };
  recentActivity: {
    verifications: number;
    movements: number;
    registrations: number;
  };
}

/**
 * GET /api/analytics
 * Get analytics data and KPIs
 */
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
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get user document
    const userDoc = await getUserDocument(decodedToken.uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") 
      ? parseInt(searchParams.get("startDate")!)
      : Date.now() - (30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = searchParams.get("endDate")
      ? parseInt(searchParams.get("endDate")!)
      : Date.now();

    // Get Firestore utilities
    const {
      collection: getCollection,
      query: buildQuery,
      where: buildWhere,
      orderBy: buildOrderBy,
      getDocs,
      getFirestore,
      getFirebaseApp,
    } = await getFirestoreUtils();

    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);

    // Build base query filter by org (non-admin users only see their org)
    const orgFilter = userDoc.role !== "admin" && userDoc.orgId
      ? buildWhere("orgId", "==", userDoc.orgId)
      : null;

    // ========== KPIs ==========

    // Total Products
    const productsRef = getCollection(db, "products");
    let productsQuery = buildQuery(productsRef);
    if (orgFilter) {
      productsQuery = buildQuery(productsQuery, orgFilter);
    }
    const productsSnapshot = await getDocs(productsQuery);
    const totalProducts = productsSnapshot.size;

    // Total Verifications
    const verificationsRef = getCollection(db, "verifications");
    let verificationsQuery = buildQuery(verificationsRef);
    if (orgFilter) {
      verificationsQuery = buildQuery(verificationsQuery, orgFilter);
    }
    verificationsQuery = buildQuery(
      verificationsQuery,
      buildWhere("createdAt", ">=", startDate),
      buildWhere("createdAt", "<=", endDate)
    );
    const verificationsSnapshot = await getDocs(verificationsQuery);
    const totalVerifications = verificationsSnapshot.size;

    // Counterfeit counts by verdict
    const verifications = verificationsSnapshot.docs.map(doc => doc.data());
    const genuineCount = verifications.filter(v => v.verdict === "GENUINE").length;
    const suspiciousCount = verifications.filter(v => v.verdict === "SUSPICIOUS").length;
    const fakeCount = verifications.filter(v => v.verdict === "FAKE").length;
    const invalidCount = verifications.filter(v => v.verdict === "INVALID").length;
    const counterfeitCount = suspiciousCount + fakeCount + invalidCount;

    // Estimated loss prevented (assume average product value of $100, fake products would cause this loss)
    const lossPrevented = fakeCount * 100; // $100 per fake product detected

    // ========== Trends ==========

    // Daily Movements (last 30 days)
    const movementsRef = getCollection(db, "movements");
    let movementsQuery = buildQuery(movementsRef);
    if (orgFilter) {
      movementsQuery = buildQuery(movementsQuery, orgFilter);
    }
    movementsQuery = buildQuery(
      movementsQuery,
      buildWhere("createdAt", ">=", startDate),
      buildWhere("createdAt", "<=", endDate),
      buildOrderBy("createdAt", "asc")
    );
    const movementsSnapshot = await getDocs(movementsQuery);
    const movements = movementsSnapshot.docs.map(doc => doc.data());

    // Group movements by date
    const dailyMovementsMap = new Map<string, number>();
    movements.forEach(movement => {
      const date = new Date(movement.createdAt).toISOString().split("T")[0];
      dailyMovementsMap.set(date, (dailyMovementsMap.get(date) || 0) + 1);
    });
    const dailyMovements = Array.from(dailyMovementsMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Verification Success Rate (genuine / total)
    const verificationRateMap = new Map<string, { genuine: number; total: number }>();
    verifications.forEach(verification => {
      const date = new Date(verification.createdAt).toISOString().split("T")[0];
      const current = verificationRateMap.get(date) || { genuine: 0, total: 0 };
      current.total++;
      if (verification.verdict === "GENUINE") {
        current.genuine++;
      }
      verificationRateMap.set(date, current);
    });
    const verificationSuccessRate = Array.from(verificationRateMap.entries())
      .map(([date, data]) => ({
        date,
        rate: data.total > 0 ? (data.genuine / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Counterfeit Rate
    const counterfeitRateMap = new Map<string, { counterfeit: number; total: number }>();
    verifications.forEach(verification => {
      const date = new Date(verification.createdAt).toISOString().split("T")[0];
      const current = counterfeitRateMap.get(date) || { counterfeit: 0, total: 0 };
      current.total++;
      if (["SUSPICIOUS", "FAKE", "INVALID"].includes(verification.verdict)) {
        current.counterfeit++;
      }
      counterfeitRateMap.set(date, current);
    });
    const counterfeitRate = Array.from(counterfeitRateMap.entries())
      .map(([date, data]) => ({
        date,
        rate: data.total > 0 ? (data.counterfeit / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ========== Recent Activity (last 24 hours) ==========
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);

    const recentVerificationsQuery = buildQuery(
      verificationsRef,
      buildWhere("createdAt", ">=", last24Hours)
    );
    if (orgFilter) {
      // Note: This is a simplified approach - in production, you'd need to combine filters properly
    }
    const recentVerificationsSnapshot = await getDocs(recentVerificationsQuery);
    const recentVerifications = recentVerificationsSnapshot.size;

    const recentMovementsQuery = buildQuery(
      movementsRef,
      buildWhere("createdAt", ">=", last24Hours)
    );
    const recentMovementsSnapshot = await getDocs(recentMovementsQuery);
    const recentMovements = recentMovementsSnapshot.size;

    const recentProductsQuery = buildQuery(
      productsRef,
      buildWhere("createdAt", ">=", last24Hours)
    );
    const recentProductsSnapshot = await getDocs(recentProductsQuery);
    const recentRegistrations = recentProductsSnapshot.size;

    const analyticsData: AnalyticsData = {
      kpis: {
        totalProducts,
        totalVerifications,
        counterfeitCount,
        lossPrevented,
        genuineCount,
        suspiciousCount,
        fakeCount,
        invalidCount,
      },
      trends: {
        dailyMovements,
        verificationSuccessRate,
        counterfeitRate,
      },
      recentActivity: {
        verifications: recentVerifications,
        movements: recentMovements,
        registrations: recentRegistrations,
      },
    };

    return NextResponse.json(analyticsData, { status: 200 });
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

