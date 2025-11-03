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
import { verifyImage } from "@/lib/services/ml/image-verification";
import { detectQRAnomalies } from "@/lib/services/ml/qr-anomaly-detection";
import { calculateFraudRisk } from "@/lib/services/ml/predictive-analytics";
// Dynamic imports for Firestore
async function getFirestoreUtils() {
  const { 
    collection, 
    addDoc, 
    getFirestore, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs 
  } = await import("firebase/firestore");
  const { getFirebaseApp } = await import("@/lib/firebase/client");
  return { 
    collection, 
    addDoc, 
    getFirestore, 
    getFirebaseApp,
    query,
    where,
    orderBy,
    limit,
    getDocs
  };
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
 * AI-powered counterfeit scoring
 * 
 * MVP Phase: Deterministic score via metadata checks
 * Phase 2: Real ML model (CNN + OCR) for hologram/logo verification
 * 
 * Current implementation (MVP):
 * - Product metadata consistency checks
 * - QR code integrity validation
 * - Timestamp validity checks
 * - Basic risk scoring
 * 
 * Future implementation (Phase 2):
 * - CNN model for product image analysis
 * - OCR for hologram/logo verification
 * - Deep learning for tampering detection
 */
async function calculateCounterfeitScore(
  product: { productId: string; name?: string; status?: string; manufacturerId?: string; orgId?: string } | null,
  qrPayload: QRPayload,
  imageUrl?: string,
  precomputedImageVerification?: { logoMatch: number; tamperingScore: number; textExtracted: boolean; serialNumberMatch: boolean; overallScore: number; factors: string[] } | null
): Promise<{ score: number; confidence: number; factors: string[]; riskLevel: "low" | "medium" | "high" | "critical" }> {
  const factors: string[] = [];
  let score = 50; // Start with neutral score
  let confidence = 50;
  let riskScore = 0; // Risk score (lower is better)

  // ========== MVP Phase: Deterministic Metadata Checks ==========

  // Factor 1: QR code timestamp validity
  const qrAge = Date.now() - qrPayload.ts;
  const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
  if (qrAge < 0) {
    score -= 30; // Future timestamp is suspicious
    riskScore += 30;
    factors.push("Future timestamp in QR code - HIGH RISK");
  } else if (qrAge > maxAge) {
    score -= 20; // Very old QR code
    riskScore += 20;
    factors.push("QR code timestamp is very old - MEDIUM RISK");
  } else if (qrAge < 7 * 24 * 60 * 60 * 1000) {
    score += 10; // Recent QR code
    riskScore -= 5;
    factors.push("Recent QR code timestamp - LOW RISK");
  } else {
    riskScore += 5;
    factors.push("QR code age is normal");
  }

  // Factor 2: Product existence and status
  if (product && product.status === "active") {
    score += 20;
    riskScore -= 10;
    factors.push("Product is active in system - LOW RISK");
  } else if (!product) {
    score -= 40; // Product doesn't exist
    riskScore += 40;
    factors.push("Product not found in database - CRITICAL RISK");
  } else {
    score -= 20;
    riskScore += 20;
    factors.push("Product status is not active - MEDIUM RISK");
  }

  // Factor 3: Product metadata consistency
  if (product) {
    if (product.manufacturerId === qrPayload.manufacturerId) {
      score += 15;
      riskScore -= 5;
      factors.push("Manufacturer ID matches - LOW RISK");
    } else {
      score -= 30;
      riskScore += 30;
      factors.push("Manufacturer ID mismatch - HIGH RISK");
    }

    if (product.orgId === qrPayload.orgId) {
      score += 10;
      riskScore -= 5;
      factors.push("Organization ID matches - LOW RISK");
    } else {
      score -= 20;
      riskScore += 20;
      factors.push("Organization ID mismatch - MEDIUM RISK");
    }
  }

  // Factor 4: Image verification with ML models
  if (imageUrl) {
    score += 5;
    riskScore -= 2;
    factors.push("Verification image provided - LOW RISK");
    
    // ========== ML Model Integration ==========
    try {
      // Use precomputed image verification if provided; otherwise compute now
      const imageVerification = precomputedImageVerification || await verifyImage(imageUrl, product?.productId);
      
      // Logo/packaging analysis
      if (imageVerification.logoMatch < 0.7) {
        score -= 20;
        riskScore += 20;
        factors.push(`Logo/packaging match low (${(imageVerification.logoMatch * 100).toFixed(0)}% match) - MEDIUM RISK`);
      } else {
        score += 10;
        riskScore -= 5;
        factors.push(`Logo/packaging verified (${(imageVerification.logoMatch * 100).toFixed(0)}% match) - LOW RISK`);
      }
      
      // Tampering detection
      if (imageVerification.tamperingScore > 0.4) {
        score -= 30;
        riskScore += 30;
        factors.push(`Tampering detected (${(imageVerification.tamperingScore * 100).toFixed(0)}% confidence) - HIGH RISK`);
      } else {
        score += 5;
        riskScore -= 2;
        factors.push("No tampering detected - LOW RISK");
      }
      
      // Serial number verification
      if (imageVerification.serialNumberMatch) {
        score += 15;
        riskScore -= 5;
        factors.push("Serial number matches product ID - LOW RISK");
      } else if (imageVerification.textExtracted) {
        riskScore += 5;
        factors.push("Serial number mismatch or not found - MEDIUM RISK");
      }
      
      // Add all image verification factors
      factors.push(...imageVerification.factors);
      
    } catch (mlError) {
      console.error("ML image analysis failed, using basic check:", mlError);
      factors.push("ML image analysis unavailable - using basic checks only");
    }
  } else {
    riskScore += 5;
    factors.push("No verification image provided - MEDIUM RISK");
  }

  // Factor 5: Historical verification patterns (stubbed for MVP)
  // In Phase 2: Check if this product has been verified unusually frequently
  // which could indicate counterfeiting attempts
  // Example:
  // const verificationCount = await getVerificationCount(productId, { days: 7 });
  // if (verificationCount > 10) {
  //   score -= 10;
  //   riskScore += 10;
  //   factors.push(`Unusual verification frequency (${verificationCount} in 7 days) - MEDIUM RISK`);
  // }

  // Factor 6: Location-based anomalies (stubbed for MVP)
  // In Phase 2: Check if verification location matches expected product location
  // Example:
  // const expectedLocation = await getExpectedProductLocation(productId);
  // const verificationLocation = await getVerificationLocation();
  // if (expectedLocation && verificationLocation && 
  //     !areLocationsCompatible(expectedLocation, verificationLocation)) {
  //   score -= 15;
  //   riskScore += 15;
  //   factors.push(`Location anomaly detected - MEDIUM RISK`);
  // }

  // Normalize score to 0-100 range
  score = Math.max(0, Math.min(100, score));

  // Calculate confidence based on factors and data available
  const positiveFactors = factors.filter(f => f.includes("matches") || f.includes("Recent") || f.includes("active")).length;
  const negativeFactors = factors.filter(f => f.includes("mismatch") || f.includes("not found") || f.includes("CRITICAL")).length;
  confidence = Math.min(100, 50 + (positiveFactors * 10) - (negativeFactors * 5));

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore < 20) {
    riskLevel = "low";
  } else if (riskScore < 40) {
    riskLevel = "medium";
  } else if (riskScore < 60) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  return { score, confidence, factors, riskLevel };
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

    // Decrypt QR payload (synchronous function)
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

    // Get scan history for QR anomaly detection  
    const { collection: getCollection, query: buildQuery, where: buildWhere, orderBy: buildOrderBy, limit: buildLimit, getDocs: fetchDocs, getFirestore, getFirebaseApp } = await getFirestoreUtils();
    const app = getFirebaseApp();
    const scanHistory: Array<{ productId: string; timestamp: number; location?: string; userId?: string }> = [];
    
    if (app) {
      try {
        const db = getFirestore(app);
        const verificationsRef = getCollection(db, "verifications");
        const historyQuery = buildQuery(
          verificationsRef,
          buildWhere("productId", "==", qrPayload.productId),
          buildOrderBy("createdAt", "desc"),
          buildLimit(50)
        );
        const historySnapshot = await fetchDocs(historyQuery);
        scanHistory.push(...historySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            productId: data.productId,
            timestamp: data.createdAt || Date.now(),
            location: data.location?.address,
            userId: data.verifierId,
          };
        }));
      } catch (error) {
        console.error("Failed to fetch scan history:", error);
      }
    }

    // Image Verification (if image provided)
    let imageVerificationResult: { logoMatch: number; tamperingScore: number; textExtracted: boolean; serialNumberMatch: boolean; overallScore: number; factors: string[] } | null = null;
    if (imageUrl) {
      try {
        imageVerificationResult = await verifyImage(imageUrl, qrPayload.productId);
      } catch (error) {
        console.error("Image verification failed:", error);
      }
    }

    // Calculate base AI counterfeit score first (with image verification results)
    const aiResult = await calculateCounterfeitScore(product, qrPayload, imageUrl, imageVerificationResult);

    // QR Anomaly Detection
    let qrAnomalyResult = null;
    try {
      const firestoreUtils = {
        collection: getCollection,
        query: buildQuery,
        where: buildWhere,
        orderBy: buildOrderBy,
        limit: buildLimit,
        getDocs: fetchDocs,
        getFirestore,
        getFirebaseApp,
      };
      qrAnomalyResult = await detectQRAnomalies(
        qrEncrypted,
        qrPayload.productId,
        scanHistory,
        undefined, // location (can be added from request)
        uid,
        firestoreUtils
      );
      
      // Adjust score based on QR anomalies
      if (qrAnomalyResult.isAnomalous) {
        aiResult.factors.push(...qrAnomalyResult.anomalies);
        aiResult.score -= qrAnomalyResult.anomalyScore * 0.5; // Reduce score for anomalies
        // Update risk level based on anomaly score
        if (qrAnomalyResult.anomalyScore > 60) {
          aiResult.riskLevel = "critical";
        } else if (qrAnomalyResult.anomalyScore > 40) {
          aiResult.riskLevel = "high";
        } else if (qrAnomalyResult.anomalyScore > 20) {
          aiResult.riskLevel = "medium";
        }
      }
    } catch (error) {
      console.error("QR anomaly detection failed:", error);
    }

    // Predictive Analytics - Fraud Risk Scoring
    let fraudRiskResult = null;
    try {
      // Calculate fraud risk features
      const fraudFeatures = {
        productAge: product ? (Date.now() - (product.createdAt || Date.now())) / (24 * 60 * 60 * 1000) : 0,
        verificationCount: scanHistory.length,
        suspiciousVerificationRate: scanHistory.filter(() => {
          // Calculate suspicious rate (in real implementation, check verdicts)
          return true; // Placeholder
        }).length / Math.max(1, scanHistory.length),
        verificationLocations: new Set(scanHistory.map((s) => s.location).filter(Boolean)).size,
        verificationsLast7Days: scanHistory.filter((s) => Date.now() - s.timestamp < 7 * 24 * 60 * 60 * 1000).length,
        verificationsLast30Days: scanHistory.filter((s) => Date.now() - s.timestamp < 30 * 24 * 60 * 60 * 1000).length,
        multipleUsersSameProduct: new Set(scanHistory.map((s) => s.userId).filter(Boolean)).size,
      };

      fraudRiskResult = await calculateFraudRisk(fraudFeatures);
      
      // Adjust score based on fraud risk
      if (fraudRiskResult.riskLevel === "critical" || fraudRiskResult.riskLevel === "high") {
        aiResult.score -= fraudRiskResult.riskScore * 0.3;
        // Update risk level
        if (fraudRiskResult.riskLevel === "critical") {
          aiResult.riskLevel = "critical";
        } else if (fraudRiskResult.riskLevel === "high" && aiResult.riskLevel !== "critical") {
          aiResult.riskLevel = "high";
        }
      }
      
      aiResult.factors.push(...fraudRiskResult.factors);
    } catch (error) {
      console.error("Fraud risk calculation failed:", error);
    }

    // Normalize final score
    aiResult.score = Math.max(0, Math.min(100, aiResult.score));
    const verdict = determineVerdict(aiResult.score);

    // Create verification document
    const { collection: getCollection2, addDoc, getFirestore: getFirestore2, getFirebaseApp: getFirebaseApp2 } = await getFirestoreUtils();
    const app2 = getFirebaseApp2();
    if (!app2) {
      throw new Error("Firebase app not initialized");
    }

    const db = getFirestore2(app2);
    const verificationRef = getCollection2(db, "verifications");
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
      riskLevel: aiResult.riskLevel,
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
      riskLevel: aiResult.riskLevel,
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

