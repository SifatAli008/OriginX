export const runtime = 'nodejs';
/**
 * Public API Route: QR Code Product Information
 * GET /api/qr/[productId] - Get product info, transactions, and movements (PUBLIC - no auth required)
 * 
 * This endpoint is designed for public QR code scanning.
 * Anyone scanning a product QR code can access this information.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { ProductDocument } from "@/lib/types/products";

interface PublicProductResponse {
  product: ProductDocument | null;
  transactions: Array<{
    txHash: string;
    type: string;
    status: string;
    blockNumber?: number;
    createdAt: number;
    payload?: Record<string, unknown>;
  }>;
  movements: Array<{
    id: string;
    type: string;
    from: string;
    to: string;
    status: string;
    quantity: number;
    trackingNumber?: string;
    createdAt: number;
    txHash?: string;
  }>;
  verifications: Array<{
    id: string;
    verdict: string;
    aiScore: number;
    confidence: number;
    createdAt: number;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // 1. Fetch product
    const productRef = db.collection("products").doc(productId);
    const productSnap = await productRef.get();
    
    let product: ProductDocument | null = null;
    if (productSnap.exists) {
      product = {
        productId: productSnap.id,
        ...productSnap.data(),
      } as ProductDocument;
    }

    // If product doesn't exist, return 404
    if (!product) {
      return NextResponse.json(
        { 
          error: "Product not found",
          product: null,
          transactions: [],
          movements: [],
          verifications: [],
        },
        { status: 404 }
      );
    }

    // 2. Fetch all transactions for this product (using productId field)
    // Note: We fetch without orderBy to avoid index requirements, then sort in memory
    let transactions: PublicProductResponse["transactions"] = [];
    try {
      const transactionsSnap = await db.collection("transactions")
        .where("productId", "==", productId)
        .limit(100)
        .get();
      
      transactions = transactionsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          txHash: data.txHash || doc.id,
          type: data.type || "UNKNOWN",
          status: data.status || "pending",
          blockNumber: data.blockNumber,
          createdAt: data.createdAt || Date.now(),
          payload: data.payload,
        };
      });
      
      // Sort by creation date (newest first) in memory
      transactions.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("[QR API] Error fetching transactions:", error);
      // Continue without transactions - don't fail the request
    }

    // 3. Fetch all movements for this product
    // Note: We fetch without orderBy to avoid index requirements, then sort in memory
    let movements: PublicProductResponse["movements"] = [];
    try {
      const movementsSnap = await db.collection("movements")
        .where("productId", "==", productId)
        .limit(100)
        .get();
      
      movements = movementsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || "transfer",
          from: data.from || "Unknown",
          to: data.to || "Unknown",
          status: data.status || "pending",
          quantity: typeof data.quantity === "number" ? data.quantity : 1,
          trackingNumber: data.trackingNumber,
          createdAt: data.createdAt || Date.now(),
          txHash: data.txHash,
        };
      });
      
      // Sort by creation date (newest first) in memory
      movements.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("[QR API] Error fetching movements:", error);
      // Continue without movements - don't fail the request
    }

    // 4. Fetch recent verifications for this product
    // Note: We fetch without orderBy to avoid index requirements, then sort in memory
    let verifications: PublicProductResponse["verifications"] = [];
    try {
      const verificationsSnap = await db.collection("verifications")
        .where("productId", "==", productId)
        .limit(20)
        .get();
      
      verifications = verificationsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          verdict: data.verdict || "UNKNOWN",
          aiScore: typeof data.aiScore === "number" ? data.aiScore : 0,
          confidence: typeof data.confidence === "number" ? data.confidence : 0,
          createdAt: data.createdAt || Date.now(),
        };
      });
      
      // Sort by creation date (newest first) in memory
      verifications.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("[QR API] Error fetching verifications:", error);
      // Continue without verifications - don't fail the request
    }

    const response: PublicProductResponse = {
      product,
      transactions,
      movements,
      verifications,
    };

    // Add cache headers for public data (5 minutes cache)
    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*", // Allow CORS for public access
      },
    });
  } catch (error) {
    console.error("[QR API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        product: null,
        transactions: [],
        movements: [],
        verifications: [],
      },
      { status: 500 }
    );
  }
}

