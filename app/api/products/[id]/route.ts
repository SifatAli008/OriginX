export const runtime = 'nodejs';
/**
 * API Route: Update Product
 * PATCH /api/products/[id] - Update a product
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { uploadImageToCloudinarySigned } from "@/lib/utils/cloudinary";
import type { ProductCategory } from "@/lib/types/products";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const awaited = await params;
    const productId = awaited.id;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Get user document
    const userDoc = await getUserDocumentServer(decoded.uid, decoded.email || undefined);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, sku, category, description, image, metadata } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    if (!sku || typeof sku !== "string" || sku.trim().length === 0) {
      return NextResponse.json({ error: "SKU is required" }, { status: 400 });
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    // Validate category
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

    // Check if product exists and user has permission
    const productDoc = await adminDb.collection("products").doc(productId).get();
    if (!productDoc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productData = productDoc.data();
    
    // Check if user is the manufacturer or has admin role
    if (productData?.manufacturerId !== decoded.uid && userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "You don't have permission to edit this product" },
        { status: 403 }
      );
    }

    let imgUrl: string | undefined = productData?.imgUrl;

    // Handle image update
    if (image) {
      // Accept direct URL (preferred)
      if (typeof image === "object" && typeof image.url === "string") {
        imgUrl = image.url;
      }
      // Upload base64 to Cloudinary if provided
      else if (typeof image === "string" && image.startsWith("data:image")) {
        try {
          const base64Data = image.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const result = await uploadImageToCloudinarySigned(buffer, "products");
          imgUrl = result.secureUrl;
        } catch (error) {
          console.error("Failed to upload image to Cloudinary:", error);
          // If Cloudinary is not configured, allow product update without image change
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("configuration") || errorMessage.includes("API key") || errorMessage.includes("Unknown API key")) {
            console.warn("Cloudinary not configured - updating product without image change");
            // Keep existing image - imgUrl remains unchanged
          } else {
            console.warn("Image upload failed - updating product without image change");
          }
        }
      }
    }

    // Build update data, excluding undefined values
    const updateData: Record<string, unknown> = {
      name,
      sku,
      category: category as ProductCategory,
      updatedAt: Date.now(),
    };

    // Only include optional fields if they have values
    if (description !== undefined) {
      updateData.description = description || undefined;
    }

    if (imgUrl) {
      updateData.imgUrl = imgUrl;
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    // Update product document
    await adminDb.collection("products").doc(productId).update(updateData);

    return NextResponse.json(
      { message: "Product updated successfully", productId },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Products API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

