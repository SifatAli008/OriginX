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
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

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
      quantity,
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
    const productData: Record<string, unknown> = {
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
    // Quantity: only include if valid number (>=0)
    if (typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 0) {
      productData.quantity = Math.floor(quantity);
    }
    
    const productRef = await adminDb.collection("products").add(productData);

    const productId = productRef.id;

    // Generate QR code with public URL (new approach)
    // QR code will contain: https://domain.com/qr/[productId]
    const qrResult = await generateProductQRCode(
      productId,
      uid,
      "global",
      QR_AES_SECRET,
      { size: 400 }
    );

    // Update product with QR hash and data URL (Admin)
    // Store both encrypted hash (for verification) and QR image (for display)
    const updateData: Record<string, unknown> = {
      qrHash: qrResult.encrypted, // Encrypted payload (for backward compatibility)
      qrUrl: qrResult.qrUrl,     // Public URL (new field)
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
          encrypted: qrResult.encrypted,      // Encrypted payload (for verification)
          pngDataUrl: qrResult.dataUrl,       // QR code image
          url: qrResult.qrUrl,                // Public URL (what's encoded in QR)
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

    // Build filters (non-admin users can only see relevant products)
    const filters: ProductFilters = {
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
    // Admin can query by manufacturerId; company users see their own; SMEs will be resolved later
    const manufacturerId = searchParams.get("manufacturerId");
    if (userDoc.role === "admin") {
      if (manufacturerId) {
        filters.manufacturerId = manufacturerId;
      }
    } else if (userDoc.role === "company") {
      filters.manufacturerId = uid;
    }

    // Use Admin Firestore for server-side product listing
    const db = getAdminFirestore();
    let productsQuery = db.collection("products");
    
    // Apply filters - Firestore Admin SDK uses where() method
    // Note: We avoid orderBy() with where() to prevent index requirements
    if (filters.manufacturerId) {
      productsQuery = productsQuery.where("manufacturerId", "==", filters.manufacturerId) as typeof productsQuery;
    }
    if (filters.category) {
      productsQuery = productsQuery.where("category", "==", filters.category) as typeof productsQuery;
    }
    if (filters.status) {
      productsQuery = productsQuery.where("status", "==", filters.status) as typeof productsQuery;
    }
    if (filters.batchId) {
      productsQuery = productsQuery.where("batchId", "==", filters.batchId) as typeof productsQuery;
    }
    
    // Get all matching documents (without orderBy to avoid index requirement)
    // We'll sort in memory instead
    const snapshot = await productsQuery.get();
    let items = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      productId: doc.id,
      ...doc.data(),
    })) as ProductDocument[];

    // SME visibility: include products transferred TO this SME (by name or email) or created by SME
    if (userDoc.role === "sme") {
      try {
        // Identify SME by name and email
        const toValues = [userDoc.displayName, userDoc.email].filter(Boolean) as string[];
        const fromValues = toValues;

        // 1) Movements TO this SME - calculate net quantity received
        interface MovementDoc {
          data: () => { productId?: string; createdAt?: number; quantity?: number };
        }
        const toSnap = toValues.length > 0
          ? await db.collection("movements").where("to", "in", toValues).get()
          : { docs: [] as MovementDoc[] };
        const netQuantityByProduct = new Map<string, number>();
        const lastToByProduct = new Map<string, number>();
        toSnap.docs.forEach((m: MovementDoc) => {
          const d = m.data() as { productId?: string; createdAt?: number; quantity?: number };
          if (!d.productId) return;
          const qty = typeof d.quantity === "number" && d.quantity > 0 ? d.quantity : 1;
          const current = netQuantityByProduct.get(d.productId) || 0;
          netQuantityByProduct.set(d.productId, current + qty);
          const ts = typeof d.createdAt === "number" ? d.createdAt : 0;
          lastToByProduct.set(d.productId, Math.max(lastToByProduct.get(d.productId) || 0, ts));
        });

        // 2) Movements FROM this SME (transferred out) - subtract from net quantity
        const fromSnap = fromValues.length > 0
          ? await db.collection("movements").where("from", "in", fromValues).get()
          : { docs: [] as MovementDoc[] };
        const lastFromByProduct = new Map<string, number>();
        fromSnap.docs.forEach((m: MovementDoc) => {
          const d = m.data() as { productId?: string; createdAt?: number; quantity?: number };
          if (!d.productId) return;
          const qty = typeof d.quantity === "number" && d.quantity > 0 ? d.quantity : 1;
          const current = netQuantityByProduct.get(d.productId) || 0;
          netQuantityByProduct.set(d.productId, Math.max(0, current - qty));
          const ts = typeof d.createdAt === "number" ? d.createdAt : 0;
          lastFromByProduct.set(d.productId, Math.max(lastFromByProduct.get(d.productId) || 0, ts));
        });

        // 3) Current ownership logic - show products if:
        //    - Created by SME, OR
        //    - Has net quantity > 0 (received more than transferred out), OR
        //    - Last movement was TO the SME (even if quantity is 0, for visibility of recent transfers)
        items = items.filter((p) => {
          // Products originally created by the SME always visible
          if (p.manufacturerId === uid) return true;
          const netQty = netQuantityByProduct.get(p.productId) || 0;
          // If net quantity > 0, SME still owns some of this product
          if (netQty > 0) return true;
          // Otherwise, show if last movement was TO the SME (for visibility of recent transfers)
          const lastTo = lastToByProduct.get(p.productId) || 0;
          const lastFrom = lastFromByProduct.get(p.productId) || 0;
          return lastTo > 0 && lastTo >= lastFrom;
        });
      } catch {
        // Fallback: only show products created by the SME
        items = items.filter((p) => p.manufacturerId === uid);
      }
    }
    
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

