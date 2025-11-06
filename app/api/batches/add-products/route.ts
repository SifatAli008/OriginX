export const runtime = 'nodejs';
/**
 * API Route: Add Products to Batch
 * POST /api/batches/add-products - Add selected products to an existing or new batch
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";
import { getAdminFirestore } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
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

    const userEmail = decoded.email || undefined;
    const userDoc = await getUserDocumentServer(decoded.uid, userEmail);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only company/SME users can add products to batches
    if (userDoc.role !== "company" && userDoc.role !== "sme" && userDoc.role !== "admin") {
      return NextResponse.json(
        { error: "Only company, SME, or admin users can add products to batches" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { productIds, batchId, batchName } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "Product IDs array is required and must not be empty" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    let finalBatchId = batchId;

    // Create new batch if batchId is not provided
    if (!finalBatchId) {
      if (!batchName || typeof batchName !== "string" || batchName.trim().length === 0) {
        return NextResponse.json(
          { error: "Batch name is required when creating a new batch" },
          { status: 400 }
        );
      }

      // Create new batch document
      const newBatchRef = await db.collection("batches").add({
        orgId: userDoc.orgId || null,
        name: batchName.trim(),
        status: "completed",
        totalCount: productIds.length,
        processedCount: productIds.length,
        failedCount: 0,
        productIds: [],
        createdBy: decoded.uid,
        createdAt: Date.now(),
        completedAt: Date.now(),
      });

      finalBatchId = newBatchRef.id;
    } else {
      // Verify existing batch exists and user has permission
      const batchDoc = await db.collection("batches").doc(finalBatchId).get();
      if (!batchDoc.exists) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }

      const batchData = batchDoc.data();
      
      // Check if user has permission (same org or admin)
      if (userDoc.role !== "admin" && batchData?.orgId !== userDoc.orgId) {
        return NextResponse.json(
          { error: "You don't have permission to modify this batch" },
          { status: 403 }
        );
      }
    }

    // Update products with batchId
    const batch = db.batch();
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const productId of productIds) {
      try {
        const productRef = db.collection("products").doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
          notFoundCount++;
          continue;
        }

        const productData = productDoc.data();
        
        // Verify user owns the product or is admin
        if (userDoc.role !== "admin" && productData?.manufacturerId !== decoded.uid) {
          continue;
        }

        // Update product with batchId
        batch.update(productRef, {
          batchId: finalBatchId,
          updatedAt: Date.now(),
        });
        updatedCount++;
      } catch (error) {
        console.error(`Error updating product ${productId}:`, error);
        notFoundCount++;
      }
    }

    // Commit batch update
    await batch.commit();

    // Update batch document with new product IDs
    const batchRef = db.collection("batches").doc(finalBatchId);
    const batchDoc = await batchRef.get();
    const currentBatchData = batchDoc.data();
    const currentProductIds = currentBatchData?.productIds || [];
    
    // Merge new product IDs (avoid duplicates)
    const newProductIds = [...new Set([...currentProductIds, ...productIds])];
    
    await batchRef.update({
      productIds: newProductIds,
      totalCount: newProductIds.length,
      processedCount: newProductIds.length,
      updatedAt: Date.now(),
    });

    return NextResponse.json(
      {
        message: "Products added to batch successfully",
        batchId: finalBatchId,
        updatedCount,
        notFoundCount,
        totalProductsInBatch: newProductIds.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Batches API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

