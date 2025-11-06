export const runtime = 'nodejs';
/**
 * API Route: Analytics & Reports
 * GET /api/analytics - Get KPIs, trends, and analytics data
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";

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
  const { initializeApp, getApps } = await import("firebase/app");
  const { firebaseConfig } = await import("@/lib/firebase/config");
  
  // Initialize Firebase app on server (avoid client module)
  let app;
  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
  } else {
    app = initializeApp(firebaseConfig);
  }
  
  return {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getFirestore,
    app,
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
  console.log("[GET /api/analytics] Request received");
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

    // Get user document (server-side)
    let userDoc: UserDocument | null = null;
    const uid = decodedToken.uid;
    const userEmail = decodedToken.email || 'unknown';
    
    // Use the server-side helper which can auto-create user documents if needed
    try {
      const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
      userDoc = await getUserDocumentServer(uid, userEmail);
    } catch (error) {
      console.error("[Analytics] Error fetching user document:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { 
          error: "Failed to fetch user information",
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
    
    // If user document doesn't exist, check if this is an admin user
    // Admin users can proceed even without a Firestore document (for development/testing)
    if (!userDoc) {
      const isAdminEmail = userEmail.toLowerCase() === "admin@originx.com";
      if (isAdminEmail && process.env.NODE_ENV !== 'production') {
        console.warn(`[Analytics] Admin user document not found, using temporary admin profile for ${uid}`);
        userDoc = {
          uid,
          email: userEmail,
          displayName: "Admin",
          photoURL: null,
          role: "admin",
          orgId: null,
          orgName: undefined,
          mfaEnabled: false,
          status: "active",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        // Return empty analytics with consistent shape
        const empty: AnalyticsData = {
          kpis: {
            totalProducts: 0,
            totalVerifications: 0,
            counterfeitCount: 0,
            lossPrevented: 0,
            genuineCount: 0,
            suspiciousCount: 0,
            fakeCount: 0,
            invalidCount: 0,
          },
          trends: {
            dailyMovements: [],
            verificationSuccessRate: [],
            counterfeitRate: [],
          },
          recentActivity: {
            verifications: 0,
            movements: 0,
            registrations: 0,
          },
        };
        return NextResponse.json(empty, { status: 200 });
      }
    }

    // Non-admin users without an organization should receive empty analytics
    if (userDoc && userDoc.role !== "admin" && !userDoc.orgId) {
      const empty: AnalyticsData = {
        kpis: {
          totalProducts: 0,
          totalVerifications: 0,
          counterfeitCount: 0,
          lossPrevented: 0,
          genuineCount: 0,
          suspiciousCount: 0,
          fakeCount: 0,
          invalidCount: 0,
        },
        trends: {
          dailyMovements: [],
          verificationSuccessRate: [],
          counterfeitRate: [],
        },
        recentActivity: {
          verifications: 0,
          movements: 0,
          registrations: 0,
        },
      };
      return NextResponse.json(empty, { status: 200 });
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
      app,
    } = await getFirestoreUtils();

    if (!app) {
      console.error("Firebase app initialization failed - config may be missing");
      // In development with test token, return mock analytics
      if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
        return NextResponse.json({
          kpis: {
            totalProducts: 0,
            totalVerifications: 0,
            counterfeitCount: 0,
            lossPrevented: 0,
            genuineCount: 0,
            suspiciousCount: 0,
            fakeCount: 0,
            invalidCount: 0,
          },
          trends: {
            dailyMovements: [],
            verificationSuccessRate: [],
            counterfeitRate: [],
          },
          recentActivity: {
            verifications: 0,
            movements: 0,
            registrations: 0,
          },
          warning: "Firebase not configured - returning mock data",
        }, { status: 200 });
      }
      return NextResponse.json(
        { 
          error: "Firebase not configured. Please set Firebase environment variables.",
          hint: "For development, create .env.local with NEXT_PUBLIC_FIREBASE_* variables"
        },
        { status: 500 }
      );
    }

    const db = getFirestore(app);

    // ========== KPIs ==========

    // Total Products
    const productsRef = getCollection(db, "products");
    const productsQuery = buildQuery(productsRef);
    // org filter removed
    let productsSnapshot;
    try {
      productsSnapshot = await getDocs(productsQuery);
    } catch {
      // Gracefully handle missing/insufficient permissions by returning empty analytics
      const empty: AnalyticsData = {
        kpis: {
          totalProducts: 0,
          totalVerifications: 0,
          counterfeitCount: 0,
          lossPrevented: 0,
          genuineCount: 0,
          suspiciousCount: 0,
          fakeCount: 0,
          invalidCount: 0,
        },
        trends: {
          dailyMovements: [],
          verificationSuccessRate: [],
          counterfeitRate: [],
        },
        recentActivity: {
          verifications: 0,
          movements: 0,
          registrations: 0,
        },
      };
      return NextResponse.json(empty, { status: 200 });
    }
    const totalProducts = productsSnapshot.size;

    // Total Verifications
    const verificationsRef = getCollection(db, "verifications");
    let verificationsQuery = buildQuery(verificationsRef);
    // org filter removed
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
    // org filter removed
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
    // org filter removed
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
  } catch (error: unknown) {
    console.error("Get analytics error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    console.error("Error details:", {
      message: errorObj.message,
      name: errorObj instanceof Error ? errorObj.name : undefined,
      stack: errorObj instanceof Error ? errorObj.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

