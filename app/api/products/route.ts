export const runtime = 'nodejs';
/**
 * API Route: Product Registration
 * POST /api/products - Register a single product
 * GET /api/products - List products with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { uploadImageToCloudinarySigned } from "@/lib/utils/cloudinary";
import { generateProductQRCode } from "@/lib/utils/qr/generator";
import { createProductRegisterTransaction } from "@/lib/utils/transactions";
import type { ProductCategory, ProductStatus, ProductFilters, ProductListResponse, ProductDocument } from "@/lib/types/products";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";
import { getAdminFirestore } from "@/lib/firebase/admin";

const QR_AES_SECRET = process.env.QR_AES_SECRET || "default-secret-key-change-in-production";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
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
    const uid = decodedToken.uid;
    const email = decodedToken.email as string | undefined;

    // Get user document to verify role
    const userDoc = await getUserDocumentServer(uid, email);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 }
      );
    }

    // Only company/SME users (or admin) can create products
    if (userDoc.role !== "company" && userDoc.role !== "sme" && userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "Only company, SME, or admin users can create products" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      sku,
      category,
      image, // Can be base64 data URL or { url: string }
      metadata,
    } = body;

    // Validate required fields
    if (!name || !sku || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, sku, category" },
        { status: 400 }
      );
    }

    // Validate category - check if it's a default category or a custom category
    const defaultCategories: ProductCategory[] = [
      "electronics",
      "automotive",
      "pharmaceuticals",
      "food",
      "textiles",
      "machinery",
      "chemicals",
      "other",
    ];
    
    // Get Firestore instance for category validation and product creation
    const adminDb = getAdminFirestore();
    
    // Check if it's a default category
    if (defaultCategories.includes(category as ProductCategory)) {
      // Valid default category
    } else {
      // Check if it's a custom category
      const customCategory = await adminDb.collection("categories")
        .where("name", "==", category)
        .limit(1)
        .get();
      
      if (customCategory.empty) {
        return NextResponse.json(
          { error: `Invalid category. Category "${category}" does not exist.` },
          { status: 400 }
        );
      }
    }

    let imgUrl: string | undefined;

    // Accept direct URL (preferred)
    if (image && typeof image === "object" && typeof image.url === "string") {
      imgUrl = image.url;
    }

    // Fallback: upload base64 to Cloudinary if provided
    if (!imgUrl && image && typeof image === "string" && image.startsWith("data:image")) {
      try {
        const base64Data = image.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const result = await uploadImageToCloudinarySigned(buffer, "products");
        imgUrl = result.secureUrl;
      } catch (error) {
        console.error("Failed to upload image to Cloudinary:", error);
        // If Cloudinary is not configured, allow product creation without image
        // Don't fail the entire request - just log the error and continue without image
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("configuration") || errorMessage.includes("API key") || errorMessage.includes("Unknown API key")) {
          console.warn("Cloudinary not configured - creating product without image");
          // Continue without image - imgUrl remains undefined
        } else {
          // For other errors, still allow product creation without image
          console.warn("Image upload failed - creating product without image");
        }
      }
    }

    // Create product document (Admin Firestore)
    // Build document data, excluding undefined values (Firestore doesn't allow undefined)
    const productData: any = {
      name,
      sku,
      category: category as ProductCategory,
      qrHash: "", // Will be set after QR generation
      status: "active" as ProductStatus,
      manufacturerId: uid,
      manufacturerName: userDoc.displayName || userDoc.email,
      metadata: metadata || {},
      createdAt: Date.now(),
    };
    
    // Only include optional fields if they have values
    if (description) {
      productData.description = description;
    }
    
    if (imgUrl) {
      productData.imgUrl = imgUrl;
    }
    
    const productRef = await adminDb.collection("products").add(productData);

    const productId = productRef.id;

    // Generate encrypted QR code (use global scope since there's no orgId)
    const qrResult = await generateProductQRCode(
      productId,
      uid,
      "global",
      QR_AES_SECRET,
      { size: 400 }
    );

    // Update product with QR hash (Admin)
    const updateData: any = {
      qrHash: qrResult.encrypted,
    };
    
    // Only include qrDataUrl if it exists (Firestore doesn't allow undefined)
    if (qrResult.dataUrl) {
      updateData.qrDataUrl = qrResult.dataUrl;
    }
    
    await productRef.update(updateData);

    // Create immutable PRODUCT_REGISTER transaction (orgId omitted)
    const transaction = await createProductRegisterTransaction(
      productId,
      undefined,
      uid,
      {
        productName: name,
        sku,
        category,
      }
    );

    return NextResponse.json(
      {
        productId,
        qr: {
          encrypted: qrResult.encrypted,
          pngDataUrl: qrResult.dataUrl,
        },
        transaction: {
          txHash: transaction.txHash,
          blockNumber: transaction.blockNumber,
          status: transaction.status,
          type: transaction.type,
          timestamp: transaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Product registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
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
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email as string | undefined;

    // Get user document
    const userDoc = await getUserDocumentServer(uid, email);
    if (!userDoc) {
      // Gracefully handle users without a Firestore document yet
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "1");
      const pageSize = parseInt(searchParams.get("pageSize") || "20");
      return NextResponse.json(
        { items: [], total: 0, page, pageSize },
        { status: 200 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const batchId = searchParams.get("batchId");

    // Build filters (non-admin users can only see their own products)
    const filters: ProductFilters = {
      page,
      pageSize,
    };

    if (category) {
      filters.category = category as ProductCategory;
    }
    if (status) {
      filters.status = status as any;
    }
    if (search) {
      filters.search = search;
    }
    if (batchId) {
      filters.batchId = batchId;
    }
    // Admin can query by manufacturerId; non-admins see their own
    const manufacturerId = searchParams.get("manufacturerId");
    if (userDoc.role === "admin") {
      if (manufacturerId) {
        filters.manufacturerId = manufacturerId;
      }
    } else {
      filters.manufacturerId = uid;
    }

    // Use Admin Firestore for server-side product listing
    const db = getAdminFirestore();
    let productsQuery: any = db.collection("products");
    
    // Apply filters - Firestore Admin SDK uses where() method
    // Note: We avoid orderBy() with where() to prevent index requirements
    if (filters.manufacturerId) {
      productsQuery = productsQuery.where("manufacturerId", "==", filters.manufacturerId);
    }
    if (filters.category) {
      productsQuery = productsQuery.where("category", "==", filters.category);
    }
    if (filters.status) {
      productsQuery = productsQuery.where("status", "==", filters.status);
    }
    if (filters.batchId) {
      productsQuery = productsQuery.where("batchId", "==", filters.batchId);
    }
    
    // Get all matching documents (without orderBy to avoid index requirement)
    // We'll sort in memory instead
    const snapshot = await productsQuery.get();
    let items = snapshot.docs.map((doc: any) => ({
      productId: doc.id,
      ...doc.data(),
    })) as ProductDocument[];
    
    // Sort by creation date (newest first) in memory
    items.sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime; // Descending order
    });
    
    // Apply search filter if provided (client-side filtering)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.sku?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination (client-side after filtering and sorting)
    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    const result: ProductListResponse = {
      items: paginatedItems,
      total,
      page,
      pageSize,
      hasMore: endIndex < total,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

