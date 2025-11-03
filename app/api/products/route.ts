/**
 * API Route: Product Registration
 * POST /api/products - Register a single product
 * GET /api/products - List products with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { createProduct } from "@/lib/firebase/products";
import { uploadImageToCloudinarySigned } from "@/lib/utils/cloudinary";
import { generateProductQRCode } from "@/lib/utils/qr/generator";
import { createProductRegisterTransaction } from "@/lib/utils/transactions";
import type { ProductCategory, ProductStatus, ProductFilters } from "@/lib/types/products";
import { getUserDocument } from "@/lib/firebase/firestore";

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

    // Get user document to verify orgId
    const userDoc = await getUserDocument(uid);
    if (!userDoc || !userDoc.orgId) {
      return NextResponse.json(
        { error: "User must be associated with an organization" },
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
      image, // Can be File (base64) or URL
      metadata,
    } = body;

    // Validate required fields
    if (!name || !sku || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, sku, category" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories: ProductCategory[] = [
      "electronics",
      "automotive",
      "pharmaceuticals",
      "food",
      "textiles",
      "machinery",
      "chemicals",
      "other",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    let imgUrl: string | undefined;

    // Upload image to Cloudinary if provided
    if (image) {
      try {
        // Handle base64 image
        if (typeof image === "string" && image.startsWith("data:image")) {
          // Convert base64 to Buffer
          const base64Data = image.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const result = await uploadImageToCloudinarySigned(buffer, "products");
          imgUrl = result.secureUrl;
        } else if (typeof image === "object" && image.url) {
          // If image is already uploaded and URL provided
          imgUrl = image.url;
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
        return NextResponse.json(
          { error: "Failed to upload image to Cloudinary" },
          { status: 500 }
        );
      }
    }

    // Create product document
    const productData = {
      orgId: userDoc.orgId,
      name,
      description: description || undefined,
      sku,
      category: category as ProductCategory,
      imgUrl,
      qrHash: "", // Will be set after QR generation
      qrDataUrl: undefined,
      status: "active" as ProductStatus,
      manufacturerId: uid,
      manufacturerName: userDoc.displayName || userDoc.email,
      metadata: metadata || {},
    };

    // Create product in Firestore (will generate productId)
    const productId = await createProduct(productData);

    // Generate encrypted QR code
    const qrSecret = QR_AES_SECRET;
    const qrResult = await generateProductQRCode(
      productId,
      uid,
      userDoc.orgId,
      qrSecret,
      { size: 400 }
    );

    // Update product with QR hash
    const { updateDoc, doc, getFirestore } = await import("firebase/firestore");
    const { getFirebaseApp } = await import("@/lib/firebase/client");
    const app = getFirebaseApp();
    if (app) {
      const db = getFirestore(app);
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, {
        qrHash: qrResult.encrypted,
        qrDataUrl: qrResult.dataUrl,
      });
    }

    // Create immutable PRODUCT_REGISTER transaction
    const transaction = await createProductRegisterTransaction(
      productId,
      userDoc.orgId,
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

    // Get user document
    const userDoc = await getUserDocument(uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
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

    // Build filters (non-admin users can only see their org's products)
    const filters: ProductFilters = {
      orgId: userDoc.orgId || undefined,
      page,
      pageSize,
    };

    if (category) {
      filters.category = category as ProductCategory;
    }
    if (status) {
      filters.status = status as ProductStatus;
    }
    if (search) {
      filters.search = search;
    }
    if (batchId) {
      filters.batchId = batchId;
    }
    if (userDoc.role === "admin") {
      // Admin can see all products
      const manufacturerId = searchParams.get("manufacturerId");
      if (manufacturerId) {
        filters.manufacturerId = manufacturerId;
      }
      // Admin can see cross-org, so remove orgId filter
      delete filters.orgId;
    }

    // Get products
    const { getProducts } = await import("@/lib/firebase/products");
    const result = await getProducts(filters);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

