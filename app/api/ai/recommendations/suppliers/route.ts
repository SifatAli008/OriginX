/**
 * API Route: Supplier Recommendations
 * GET /api/ai/recommendations/suppliers - Get recommended suppliers
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import { recommendSuppliers } from "@/lib/services/ml/recommendations";

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
    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const location = searchParams.get("location") || undefined;
    const minQualityScore = searchParams.get("minQuality") ? parseFloat(searchParams.get("minQuality")!) : undefined;
    const requiredCertifications = searchParams.get("certifications")?.split(",").filter(Boolean);

    // Fetch all suppliers
    const { collection, query: buildQuery, where: buildWhere, getDocs, getFirestore, getFirebaseApp } = await getFirestoreUtils();
    const app = getFirebaseApp();
    if (!app) {
      return NextResponse.json(
        { error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const usersRef = collection(db, "users");
    const suppliersQuery = buildQuery(usersRef, buildWhere("role", "==", "supplier"));
    const suppliersSnapshot = await getDocs(suppliersQuery);

    // Build supplier profiles
    const verificationsRef = collection(db, "verifications");
    const productsRef = collection(db, "products");
    const suppliers: any[] = [];

    for (const supplierDoc of suppliersSnapshot.docs) {
      const supplierData = supplierDoc.data();
      const supplierId = supplierDoc.id;

      // Get supplier's products
      const productsQuery = buildQuery(
        productsRef,
        buildWhere("manufacturerId", "==", supplierId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productIds = productsSnapshot.docs.map((d) => d.id);

      // Calculate supplier metrics
      let totalVerifications = 0;
      let successCount = 0;
      let fraudCount = 0;
      let suspiciousCount = 0;
      let totalRiskScore = 0;

      if (productIds.length > 0) {
        const verificationsQuery = buildQuery(
          verificationsRef,
          buildWhere("productId", "in", productIds.slice(0, 10))
        );
        const verificationsSnapshot = await getDocs(verificationsQuery);
        
        verificationsSnapshot.forEach((doc) => {
          const data = doc.data();
          totalVerifications++;
          if (data.verdict === "GENUINE") successCount++;
          if (data.verdict === "FAKE") fraudCount++;
          if (data.verdict === "SUSPICIOUS") suspiciousCount++;
          totalRiskScore += data.aiScore || 50;
        });
      }

      const averageRiskScore = totalVerifications > 0 ? totalRiskScore / totalVerifications : 50;
      const successRate = totalVerifications > 0 ? successCount / totalVerifications : 0;
      const averageQualityScore = successRate * 100;

      suppliers.push({
        supplierId,
        orgId: supplierData.orgId || "",
        name: supplierData.displayName || supplierData.email || "Unknown",
        category: category,
        location: location,
        productCount: productsSnapshot.docs.length,
        totalVerifications,
        successRate,
        averageRiskScore,
        fraudCount,
        averageQualityScore,
        certifications: supplierData.certifications || [],
        bstiCertified: supplierData.bstiCertified || false,
        importLicense: supplierData.importLicense || false,
      });
    }

    // Filter by criteria
    const criteria = {
      orgId: userDoc.orgId,
      category,
      location,
      minQualityScore,
      requiredCertifications,
    };

    // Get recommendations
    const recommendations = await recommendSuppliers(criteria, suppliers);

    return NextResponse.json({
      recommendations,
      criteria,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Supplier recommendations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

