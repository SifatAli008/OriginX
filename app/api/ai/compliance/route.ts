/**
 * API Route: Compliance Advisory
 * GET /api/ai/compliance - Get compliance advisory
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocument } from "@/lib/firebase/firestore";
import { generateComplianceAdvisory } from "@/lib/services/ml/recommendations";

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
    const supplierId = searchParams.get("supplierId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const productCategory = searchParams.get("category") || undefined;

    // In production, fetch actual supplier/product data
    const context = {
      orgId: userDoc.orgId || "",
      supplierId,
      productId,
      productCategory,
      originCountry: undefined, // Would fetch from product data
      importStatus: false, // Would check from supplier data
      certifications: [], // Would fetch from supplier/product data
      bstiCertified: false, // Would fetch from supplier data
    };

    const advisory = await generateComplianceAdvisory(context);

    return NextResponse.json({
      advisory,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Compliance advisory error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

