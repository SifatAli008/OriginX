/**
 * API Route: QR Code Verification
 * POST /api/verify - Verify product authenticity via QR code
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { decryptQRPayload, type QRPayload } from "@/lib/utils/qr/generator";
import { getProduct } from "@/lib/firebase/products";
import { getUserDocument } from "@/lib/firebase/firestore";
import { createTransaction } from "@/lib/utils/transactions";
import { uploadImageToCloudinarySigned } from "@/lib/utils/cloudinary";
// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const { collection, addDoc, getFirestore } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return { collection, addDoc, getFirestore, getFirebaseApp };
}

const QR_AES_SECRET = process.env.QR_AES_SECRET || "default-secret-key-change-in-production";

export type VerificationVerdict = "GENUINE" | "FAKE" | "SUSPICIOUS" | "INVALID";

export interface VerificationDocument {
  verificationId: string;
  productId: string;
  orgId: string;
  verifierId: string; // User ID who performed verification
  verifierName?: string;
  qrEncrypted: string; // Original encrypted QR data
  qrPayload: QRPayload; // Decrypted payload
  verdict: VerificationVerdict;
  aiScore: number; // AI counterfeit score (0-100, higher = more genuine)
  confidence: number; // Confidence level (0-100)
  imageUrl?: string; // Image uploaded during verification
  channel: "web" | "mobile" | "api"; // Verification channel
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: number;
}

/**
 * AI-powered counterfeit scoring (stubbed in MVP)
 * In production, this would use machine learning models to analyze:
 * - Product image features
 * - QR code integrity
 * - Product metadata consistency
 * - Historical verification patterns
 * - Location-based anomalies
 */
async function calculateCounterfeitScore(
  product: { productId: string; name?: string; status?: string; manufacturerId?: string; orgId?: string } | null,
  qrPayload: QRPayload,
  imageUrl?: string
): Promise<{ score: number; confidence: number; factors: string[] }> {
  const factors: string[] = [];
  let score = 50; // Start with neutral score
  let confidence = 50;

  // Factor 1: QR code timestamp validity (check if timestamp is reasonable)
  const qrAge = Date.now() - qrPayload.ts;
  const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
  if (qrAge < 0) {
    score -= 30; // Future timestamp is suspicious
    factors.push("Future timestamp in QR code");
  } else if (qrAge > maxAge) {
    score -= 20; // Very old QR code
    factors.push("QR code timestamp is very old");
  } else if (qrAge < 7 * 24 * 60 * 60 * 1000) {
    score += 10; // Recent QR code
    factors.push("Recent QR code timestamp");
  }

  // Factor 2: Product exists and is active
  if (product && product.status === "active") {
    score += 20;
    factors.push("Product is active in system");
  } else if (!product) {
    score -= 40; // Product doesn't exist
    factors.push("Product not found in database");
  } else {
    score -= 20;
    factors.push("Product status is not active");
  }

  // Factor 3: Product metadata consistency
  if (product) {
    if (product.manufacturerId === qrPayload.manufacturerId) {
      score += 15;
      factors.push("Manufacturer ID matches");
    } else {
      score -= 30;
      factors.push("Manufacturer ID mismatch");
    }

    if (product.orgId === qrPayload.orgId) {
      score += 10;
      factors.push("Organization ID matches");
    } else {
      score -= 20;
      factors.push("Organization ID mismatch");
    }
  }

  // Factor 4: Image analysis (stubbed - in production, use ML model)
  if (imageUrl) {
    score += 5; // Having an image increases confidence
    factors.push("Verification image provided");
    // In production: analyze image with ML model for counterfeit detection
    // - Check packaging authenticity
    // - Verify product features match database
    // - Detect signs of tampering or duplication
  }

  // Factor 5: Verification frequency (stubbed - would check historical data)
  // In production: Check if this product has been verified unusually frequently
  // which could indicate counterfeiting attempts

  // Normalize score to 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence based on factors
  confidence = Math.min(100, 50 + (factors.filter(f => f.includes("matches") || f.includes("Recent")).length * 10));

  return { score, confidence, factors };
}

/**
 * Determine verdict based on AI score
 */
function determineVerdict(score: number): VerificationVerdict {
  if (score >= 80) {
    return "GENUINE";
  } else if (score >= 60) {
    return "SUSPICIOUS";
  } else if (score >= 40) {
    return "FAKE";
  } else {
    return "INVALID";
  }
}

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

    // Get user document
    const userDoc = await getUserDocument(uid);
    if (!userDoc) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { qrEncrypted, image } = body;

    if (!qrEncrypted) {
      return NextResponse.json(
        { error: "Missing required field: qrEncrypted" },
        { status: 400 }
      );
    }

    // Decrypt QR payload
    const qrPayload = decryptQRPayload(qrEncrypted, QR_AES_SECRET);
    if (!qrPayload) {
      // Invalid QR code - return INVALID verdict
      const { collection, addDoc, getFirestore, getFirebaseApp } = await getFirestoreUtils();
      const app = getFirebaseApp();
      if (app) {
        const db = getFirestore(app);
        const verificationRef = collection(db, "verifications");
        const verificationId = await addDoc(verificationRef, {
          productId: "unknown",
          orgId: userDoc.orgId || "unknown",
          verifierId: uid,
          verifierName: userDoc.displayName || userDoc.email,
          qrEncrypted,
          qrPayload: null,
          verdict: "INVALID",
          aiScore: 0,
          confidence: 0,
          imageUrl: image?.url,
          channel: "web",
          metadata: { error: "Failed to decrypt QR code" },
          createdAt: Date.now(),
        });

        // Create transaction
        await createTransaction(
          "VERIFY",
          "verification",
          verificationId.id,
          userDoc.orgId || "unknown",
          uid,
          { verdict: "INVALID", reason: "Failed to decrypt QR code" }
        );
      }

      return NextResponse.json({
        verdict: "INVALID",
        aiScore: 0,
        confidence: 0,
        productId: null,
        error: "Invalid QR code - failed to decrypt",
        transaction: {
          txHash: "pending",
          status: "confirmed",
          type: "VERIFY",
          timestamp: Date.now(),
        },
      });
    }

    // Get product from database
    const product = await getProduct(qrPayload.productId);

    // Upload verification image if provided
    let imageUrl: string | undefined;
    if (image) {
      try {
        if (typeof image === "string" && image.startsWith("data:image")) {
          const base64Data = image.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const result = await uploadImageToCloudinarySigned(buffer, "verifications");
          imageUrl = result.secureUrl;
        } else if (typeof image === "object" && image.url) {
          imageUrl = image.url;
        }
      } catch (error) {
        console.error("Failed to upload verification image:", error);
        // Continue without image
      }
    }

    // Calculate AI counterfeit score
    const aiResult = await calculateCounterfeitScore(product, qrPayload, imageUrl);
    const verdict = determineVerdict(aiResult.score);

    // Create verification document
    const { collection, addDoc, getFirestore, getFirebaseApp } = await getFirestoreUtils();
    const app = getFirebaseApp();
    if (!app) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore(app);
    const verificationRef = collection(db, "verifications");
    const verificationDoc = await addDoc(verificationRef, {
      productId: qrPayload.productId,
      orgId: qrPayload.orgId,
      verifierId: uid,
      verifierName: userDoc.displayName || userDoc.email,
      qrEncrypted,
      qrPayload,
      verdict,
      aiScore: aiResult.score,
      confidence: aiResult.confidence,
      imageUrl,
      channel: "web",
      metadata: {
        factors: aiResult.factors,
        qrAge: Date.now() - qrPayload.ts,
      },
      createdAt: Date.now(),
    });

    // Create immutable VERIFY transaction
    const transaction = await createTransaction(
      "VERIFY",
      "verification",
      verificationDoc.id,
      qrPayload.orgId,
      uid,
      {
        productId: qrPayload.productId,
        verdict,
        aiScore: aiResult.score,
        confidence: aiResult.confidence,
      }
    );

    // Return verification result
    return NextResponse.json({
      verdict,
      aiScore: aiResult.score,
      confidence: aiResult.confidence,
      factors: aiResult.factors,
      product: product
        ? {
            productId: product.productId,
            name: product.name,
            sku: product.sku,
            category: product.category,
            manufacturerId: product.manufacturerId,
            status: product.status,
          }
        : null,
      transaction: {
        txHash: transaction.txHash,
        blockNumber: transaction.blockNumber,
        status: transaction.status,
        type: transaction.type,
        timestamp: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

