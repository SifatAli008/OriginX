/**
 * User Behavior Analysis Service
 * Detects abnormal scanning behavior (system abuse, insider fraud)
 * Uses anomaly detection on usage logs
 */

interface UserScanBehavior {
  userId: string;
  userRole: string;
  orgId: string;
  scanCount: number;
  scanFrequency: number; // Scans per hour
  uniqueProductsScanned: number;
  suspiciousScans: number;
  verificationFailures: number;
  averageScanInterval: number; // milliseconds
  peakScanHour: number; // 0-23
  locationVariation: number; // Number of unique locations
  timeOfDaySpread: number; // Distribution of scans across day
  abnormalPatterns: string[];
}

interface BehaviorAnomalyResult {
  isAnomalous: boolean;
  anomalyScore: number; // 0-100 (higher = more suspicious)
  riskLevel: "low" | "medium" | "high" | "critical";
  anomalies: string[];
  confidence: number;
  recommendations: string[];
}

/**
 * Analyze user scanning behavior patterns
 */
export async function analyzeUserBehavior(
  userId: string,
  scanHistory: Array<{
    timestamp: number;
    productId: string;
    location?: string;
    verdict?: string;
    aiScore?: number;
  }>,
  userRole?: string,
  orgId?: string
): Promise<BehaviorAnomalyResult> {
  const anomalies: string[] = [];
  const recommendations: string[] = [];
  let anomalyScore = 0;

  if (scanHistory.length === 0) {
    return {
      isAnomalous: false,
      anomalyScore: 0,
      riskLevel: "low",
      anomalies: ["No scan history available"],
      confidence: 0,
      recommendations: [],
    };
  }

  // Calculate behavior metrics
  const timestamps = scanHistory.map((s) => s.timestamp).sort((a, b) => a - b);
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const scansInLastHour = scanHistory.filter((s) => s.timestamp > oneHourAgo).length;
  const scansInLastDay = scanHistory.filter((s) => s.timestamp > oneDayAgo).length;
  const scansInLastWeek = scanHistory.filter((s) => s.timestamp > oneWeekAgo).length;

  const scanFrequency = scansInLastHour; // Scans per hour
  const uniqueProducts = new Set(scanHistory.map((s) => s.productId)).size;
  const suspiciousScans = scanHistory.filter(
    (s) => s.verdict === "FAKE" || s.verdict === "SUSPICIOUS" || (s.aiScore !== undefined && s.aiScore < 50)
  ).length;
  const verificationFailures = scanHistory.filter((s) => s.verdict === "INVALID").length;

  // Calculate average scan interval
  let averageInterval = 0;
  if (timestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i]! - timestamps[i - 1]!);
    }
    averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  }

  // Peak scan hour analysis
  const hourCounts = new Map<number, number>();
  scanHistory.forEach((s) => {
    const hour = new Date(s.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const peakScanHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 12;

  // Location variation
  const uniqueLocations = new Set(scanHistory.map((s) => s.location).filter(Boolean)).size;

  // Time of day spread (should be diverse for normal behavior)
  const timeOfDaySpread = hourCounts.size;

  // ========== Anomaly Detection Rules ==========

  // 1. Excessive scan frequency (possible automation/bot)
  if (scanFrequency > 20) {
    anomalyScore += 40;
    anomalies.push(`Excessive scan frequency: ${scanFrequency} scans in last hour - CRITICAL RISK`);
    recommendations.push("Review user activity for potential bot/automation");
  } else if (scanFrequency > 10) {
    anomalyScore += 20;
    anomalies.push(`High scan frequency: ${scanFrequency} scans in last hour - HIGH RISK`);
    recommendations.push("Monitor user for unusual activity");
  }

  // 2. Unusual scan intervals (too regular = automation)
  if (averageInterval > 0 && averageInterval < 5000 && scanHistory.length > 5) {
    // Very regular intervals (< 5 seconds between scans)
    anomalyScore += 30;
    anomalies.push(`Suspiciously regular scan intervals (${averageInterval}ms average) - HIGH RISK`);
    recommendations.push("Check for automated scanning tools");
  }

  // 3. Low product diversity (scanning same products repeatedly)
  const productDiversity = uniqueProducts / scanHistory.length;
  if (productDiversity < 0.2 && scanHistory.length > 10) {
    anomalyScore += 25;
    anomalies.push(`Low product diversity: ${uniqueProducts} unique products out of ${scanHistory.length} scans - MEDIUM RISK`);
    recommendations.push("Review why same products are scanned repeatedly");
  }

  // 4. High failure rate (possible testing of counterfeits)
  const failureRate = verificationFailures / scanHistory.length;
  if (failureRate > 0.5 && scanHistory.length > 5) {
    anomalyScore += 35;
    anomalies.push(`High verification failure rate: ${(failureRate * 100).toFixed(0)}% - HIGH RISK`);
    recommendations.push("Investigate user's verification patterns");
  }

  // 5. High suspicious scan rate
  const suspiciousRate = suspiciousScans / scanHistory.length;
  if (suspiciousRate > 0.3 && scanHistory.length > 5) {
    anomalyScore += 30;
    anomalies.push(`High suspicious scan rate: ${(suspiciousRate * 100).toFixed(0)}% - HIGH RISK`);
    recommendations.push("Review user's product sources");
  }

  // 6. Unusual location patterns
  if (uniqueLocations > 10 && scanHistory.length < 20) {
    anomalyScore += 20;
    anomalies.push(`Unusual location variation: ${uniqueLocations} different locations - MEDIUM RISK`);
    recommendations.push("Verify user's movement patterns");
  }

  // 7. Unusual time patterns (scanning only at specific hours = script)
  if (timeOfDaySpread < 3 && scanHistory.length > 10) {
    anomalyScore += 15;
    anomalies.push(`Limited time spread: scans concentrated in ${timeOfDaySpread} hour(s) - MEDIUM RISK`);
    recommendations.push("Review for potential automated scanning");
  }

  // 8. Role-based anomalies (SME shouldn't scan too frequently)
  if (userRole === "sme" && scansInLastDay > 50) {
    anomalyScore += 25;
    anomalies.push(`SME user with unusually high scan count: ${scansInLastDay} scans today - MEDIUM RISK`);
    recommendations.push("Verify SME user's scanning needs");
  }

  // Normalize anomaly score
  anomalyScore = Math.min(100, anomalyScore);

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (anomalyScore < 25) {
    riskLevel = "low";
  } else if (anomalyScore < 50) {
    riskLevel = "medium";
  } else if (anomalyScore < 75) {
    riskLevel = "high";
  } else {
    riskLevel = "critical";
  }

  const isAnomalous = anomalyScore > 30;
  const confidence = Math.min(100, (scanHistory.length / 100) * 100); // More data = higher confidence

  return {
    isAnomalous,
    anomalyScore,
    riskLevel,
    anomalies,
    confidence,
    recommendations,
  };
}

/**
 * Get user scan statistics
 */
export function getUserScanStatistics(
  scanHistory: Array<{
    timestamp: number;
    productId: string;
    location?: string;
    verdict?: string;
    aiScore?: number;
  }>
): UserScanBehavior | null {
  if (scanHistory.length === 0) {
    return null;
  }

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const timestamps = scanHistory.map((s) => s.timestamp).sort((a, b) => a - b);

  const scansInLastHour = scanHistory.filter((s) => s.timestamp > oneHourAgo).length;
  const uniqueProducts = new Set(scanHistory.map((s) => s.productId)).size;
  const suspiciousScans = scanHistory.filter(
    (s) => s.verdict === "FAKE" || s.verdict === "SUSPICIOUS" || (s.aiScore !== undefined && s.aiScore < 50)
  ).length;
  const verificationFailures = scanHistory.filter((s) => s.verdict === "INVALID").length;

  let averageInterval = 0;
  if (timestamps.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i]! - timestamps[i - 1]!);
    }
    averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  }

  const hourCounts = new Map<number, number>();
  scanHistory.forEach((s) => {
    const hour = new Date(s.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  const peakScanHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
  const timeOfDaySpread = hourCounts.size;
  const uniqueLocations = new Set(scanHistory.map((s) => s.location).filter(Boolean)).size;

  const abnormalPatterns: string[] = [];
  if (scansInLastHour > 10) abnormalPatterns.push("high_frequency");
  if (averageInterval < 5000 && scanHistory.length > 5) abnormalPatterns.push("regular_intervals");
  if (verificationFailures / scanHistory.length > 0.3) abnormalPatterns.push("high_failure_rate");

  return {
    userId: "", // Will be set by caller
    userRole: "",
    orgId: "",
    scanCount: scanHistory.length,
    scanFrequency: scansInLastHour,
    uniqueProductsScanned: uniqueProducts,
    suspiciousScans,
    verificationFailures,
    averageScanInterval: averageInterval,
    peakScanHour,
    locationVariation: uniqueLocations,
    timeOfDaySpread,
    abnormalPatterns,
  };
}

