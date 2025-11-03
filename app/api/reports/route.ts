/**
 * API Route: Reports Export
 * GET /api/reports?type=<type>&format=<format> - Generate and download reports
 * 
 * Supported types: products, verifications, movements, analytics
 * Supported formats: csv, excel, pdf
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
    getDocs,
    getFirestore,
  } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getFirestore,
    getFirebaseApp,
  };
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: Array<Record<string, unknown>>, headers: string[]): string {
  if (data.length === 0) {
    return headers.join(",") + "\n";
  }

  const rows = data.map(item =>
    headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) {
        return "";
      }
      // Escape commas and quotes in CSV
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Convert data to Excel format (returns CSV for now, Excel requires xlsx library)
 */
function convertToExcel(data: Array<Record<string, unknown>>, headers: string[]): string {
  // For MVP, Excel export returns CSV
  // In Phase 2, integrate xlsx library for proper Excel format
  return convertToCSV(data, headers);
}

/**
 * Generate PDF content (stubbed for MVP)
 */
function generatePDF(data: Array<Record<string, unknown>>, headers: string[]): string {
  // For MVP, PDF export returns JSON
  // In Phase 2, integrate PDF generation library (e.g., pdfkit, jsPDF)
  return JSON.stringify({ headers, data }, null, 2);
}

/**
 * GET /api/reports
 * Generate and download reports
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
    const reportType = searchParams.get("type") || "verifications";
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("startDate")
      ? parseInt(searchParams.get("startDate")!)
      : null;
    const endDate = searchParams.get("endDate")
      ? parseInt(searchParams.get("endDate")!)
      : null;

    // Validate report type
    const validTypes = ["products", "verifications", "movements", "analytics"];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid report type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ["csv", "excel", "pdf"];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(", ")}` },
        { status: 400 }
      );
    }

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

    let data: Array<Record<string, unknown>> = [];
    let headers: string[] = [];

    // Fetch data based on report type
    if (reportType === "verifications") {
      const verificationsRef = getCollection(db, "verifications");
      let verificationsQuery = buildQuery(verificationsRef, buildOrderBy("createdAt", "desc"));
      
      if (orgFilter) {
        verificationsQuery = buildQuery(verificationsQuery, orgFilter);
      }
      if (startDate) {
        verificationsQuery = buildQuery(verificationsQuery, buildWhere("createdAt", ">=", startDate));
      }
      if (endDate) {
        verificationsQuery = buildQuery(verificationsQuery, buildWhere("createdAt", "<=", endDate));
      }

      const snapshot = await getDocs(verificationsQuery);
      data = snapshot.docs.map(doc => {
        const v = doc.data();
        return {
          id: doc.id,
          productId: v.productId,
          verdict: v.verdict,
          aiScore: v.aiScore,
          confidence: v.confidence,
          verifierName: v.verifierName,
          createdAt: new Date(v.createdAt).toISOString(),
        };
      });
      headers = ["id", "productId", "verdict", "aiScore", "confidence", "verifierName", "createdAt"];

    } else if (reportType === "products") {
      const productsRef = getCollection(db, "products");
      let productsQuery = buildQuery(productsRef, buildOrderBy("createdAt", "desc"));
      
      if (orgFilter) {
        productsQuery = buildQuery(productsQuery, orgFilter);
      }
      if (startDate) {
        productsQuery = buildQuery(productsQuery, buildWhere("createdAt", ">=", startDate));
      }
      if (endDate) {
        productsQuery = buildQuery(productsQuery, buildWhere("createdAt", "<=", endDate));
      }

      const snapshot = await getDocs(productsQuery);
      data = snapshot.docs.map(doc => {
        const p = doc.data();
        return {
          id: doc.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          status: p.status,
          orgId: p.orgId,
          createdAt: new Date(p.createdAt).toISOString(),
        };
      });
      headers = ["id", "name", "sku", "category", "status", "orgId", "createdAt"];

    } else if (reportType === "movements") {
      const movementsRef = getCollection(db, "movements");
      let movementsQuery = buildQuery(movementsRef, buildOrderBy("createdAt", "desc"));
      
      if (orgFilter) {
        movementsQuery = buildQuery(movementsQuery, orgFilter);
      }
      if (startDate) {
        movementsQuery = buildQuery(movementsQuery, buildWhere("createdAt", ">=", startDate));
      }
      if (endDate) {
        movementsQuery = buildQuery(movementsQuery, buildWhere("createdAt", "<=", endDate));
      }

      const snapshot = await getDocs(movementsQuery);
      data = snapshot.docs.map(doc => {
        const m = doc.data();
        return {
          id: doc.id,
          productId: m.productId,
          productName: m.productName,
          type: m.type,
          from: m.from,
          to: m.to,
          status: m.status,
          trackingNumber: m.trackingNumber,
          createdAt: new Date(m.createdAt).toISOString(),
        };
      });
      headers = ["id", "productId", "productName", "type", "from", "to", "status", "trackingNumber", "createdAt"];

    } else if (reportType === "analytics") {
      // For analytics, return summary data
      data = [{
        reportType: "analytics",
        generatedAt: new Date().toISOString(),
        note: "Use /api/analytics endpoint for detailed analytics data",
      }];
      headers = ["reportType", "generatedAt", "note"];
    }

    // Convert to requested format
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === "csv") {
      content = convertToCSV(data, headers);
      contentType = "text/csv";
      filename = `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`;
    } else if (format === "excel") {
      content = convertToExcel(data, headers);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = `${reportType}_report_${new Date().toISOString().split("T")[0]}.xlsx`;
    } else { // pdf
      content = generatePDF(data, headers);
      contentType = "application/pdf";
      filename = `${reportType}_report_${new Date().toISOString().split("T")[0]}.pdf`;
    }

    // Return file with appropriate headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Generate report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

