/**
 * Predictive Analytics Service
 * Fraud risk scoring using ML-based analysis
 */

interface FraudFeatures {
  // Product features
  productAge: number; // Days since registration
  verificationCount: number;
  suspiciousVerificationRate: number;
  
  // Supplier features
  supplierReputation: number; // 0-100
  supplierVerificationCount: number;
  supplierFraudHistory: number; // Count of fraud incidents
  
  // Location features
  verificationLocations: number; // Number of unique locations
  distanceFromOrigin: number; // Geographic distance
  
  // Temporal features
  verificationsLast7Days: number;
  verificationsLast30Days: number;
  
  // Pattern features
  repeatedScansSameUser: number;
  multipleUsersSameProduct: number;
}

interface FraudRiskResult {
  riskScore: number; // 0-100 (higher = more risky)
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  factors: string[];
  prediction: number; // ML model prediction
}

/**
 * Simple fraud risk model using feature engineering
 * In production, replace with trained ML model
 */
export async function calculateFraudRisk(
  features: Partial<FraudFeatures>
): Promise<FraudRiskResult> {
  const factors: string[] = [];
  let riskScore = 0;

  // Feature 1: Product verification frequency
  const verificationRate = features.suspiciousVerificationRate || 0;
  if (verificationRate > 0.3) {
    riskScore += 25;
    factors.push(`High suspicious verification rate (${(verificationRate * 100).toFixed(0)}%) - HIGH RISK`);
  } else if (verificationRate > 0.1) {
    riskScore += 10;
    factors.push(`Moderate suspicious verification rate (${(verificationRate * 100).toFixed(0)}%) - MEDIUM RISK`);
  } else {
    factors.push(`Low verification rate (${(verificationRate * 100).toFixed(0)}%) - LOW RISK`);
  }

  // Feature 2: Supplier reputation
  const supplierReputation = features.supplierReputation ?? 50;
  if (supplierReputation < 30) {
    riskScore += 30;
    factors.push(`Low supplier reputation (${supplierReputation}/100) - HIGH RISK`);
  } else if (supplierReputation < 60) {
    riskScore += 15;
    factors.push(`Moderate supplier reputation (${supplierReputation}/100) - MEDIUM RISK`);
  } else {
    factors.push(`Good supplier reputation (${supplierReputation}/100) - LOW RISK`);
  }

  // Feature 3: Supplier fraud history
  const fraudHistory = features.supplierFraudHistory || 0;
  if (fraudHistory > 5) {
    riskScore += 35;
    factors.push(`High supplier fraud history (${fraudHistory} incidents) - CRITICAL RISK`);
  } else if (fraudHistory > 2) {
    riskScore += 20;
    factors.push(`Moderate supplier fraud history (${fraudHistory} incidents) - HIGH RISK`);
  } else if (fraudHistory > 0) {
    riskScore += 10;
    factors.push(`Some supplier fraud history (${fraudHistory} incidents) - MEDIUM RISK`);
  }

  // Feature 4: Location anomalies
  const locationCount = features.verificationLocations || 0;
  if (locationCount > 10) {
    riskScore += 20;
    factors.push(`Product verified in ${locationCount} different locations - MEDIUM RISK`);
  } else if (locationCount > 5) {
    riskScore += 10;
    factors.push(`Product verified in ${locationCount} locations - LOW-MEDIUM RISK`);
  }

  // Feature 5: Temporal patterns
  const recentVerifications = features.verificationsLast7Days || 0;
  if (recentVerifications > 20) {
    riskScore += 15;
    factors.push(`High recent verification activity (${recentVerifications} in 7 days) - MEDIUM RISK`);
  }

  // Feature 6: User behavior patterns
  const multiUserPattern = features.multipleUsersSameProduct || 0;
  if (multiUserPattern > 5) {
    riskScore += 15;
    factors.push(`Multiple users scanning same product (${multiUserPattern} users) - MEDIUM RISK`);
  }

  // Normalize risk score
  riskScore = Math.min(100, riskScore);

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore < 25) {
    riskLevel = "low";
  } else if (riskScore < 50) {
    riskLevel = "medium";
  } else if (riskScore < 75) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  // Calculate confidence based on available features
  const availableFeatures = Object.values(features).filter((v) => v !== undefined && v !== null).length;
  const confidence = Math.min(100, (availableFeatures / 8) * 100);

  // ML prediction (simplified - in production use trained model)
  const prediction = riskScore / 100;

  return {
    riskScore,
    riskLevel,
    confidence,
    factors,
    prediction,
  };
}

/**
 * Train simple anomaly detection model (Isolation Forest-like)
 * This is a placeholder - in production, use proper ML training
 */
export async function trainAnomalyModel(
  trainingData: FraudFeatures[]
): Promise<void> {
  // In production: Train actual model
  // For now, just a placeholder
  console.log(`Training model with ${trainingData.length} samples`);
  
  // Example: Create simple threshold-based model
  // Real implementation would use TensorFlow.js to train Isolation Forest or similar
}

/**
 * Predict anomaly using trained model
 */
export async function predictAnomaly(
  features: FraudFeatures
): Promise<number> {
  // In production: Use actual trained model
  // For now, use rule-based prediction
  const riskResult = await calculateFraudRisk(features);
  return riskResult.prediction;
}

/**
 * Trend detection for hotspots
 */
export function detectHotspots(
  supplierData: Array<{ supplierId: string; fraudCount: number; location: string }>
): Array<{ location: string; riskScore: number; incidents: number }> {
  const locationMap = new Map<string, { incidents: number; fraudCount: number }>();

  supplierData.forEach((data) => {
    const existing = locationMap.get(data.location) || { incidents: 0, fraudCount: 0 };
    locationMap.set(data.location, {
      incidents: existing.incidents + 1,
      fraudCount: existing.fraudCount + data.fraudCount,
    });
  });

  const hotspots = Array.from(locationMap.entries()).map(([location, data]) => ({
    location,
    riskScore: Math.min(100, (data.fraudCount / data.incidents) * 100),
    incidents: data.incidents,
  }));

  return hotspots.sort((a, b) => b.riskScore - a.riskScore);
}

