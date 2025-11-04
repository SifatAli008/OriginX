/**
 * QR Anomaly Detection Service
 * Detects suspicious QR code patterns and usage anomalies
 */

import jsQR from "jsqr";

interface QRScanRecord {
  productId: string;
  timestamp: number;
  location?: string;
  userId?: string;
}

interface QRAnomalyResult {
  isAnomalous: boolean;
  anomalyScore: number;
  anomalies: string[];
  confidence: number;
}

/**
 * Decode QR code from image data
 */
export function decodeQRCode(
  imageData: ImageData
): { data: string; location: { topLeftCorner: { x: number; y: number } } } | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      return {
        data: code.data,
        location: {
          topLeftCorner: {
            x: code.location.topLeftCorner.x,
            y: code.location.topLeftCorner.y,
          },
        },
      };
    }
    return null;
  } catch (error) {
    console.error("QR decoding failed:", error);
    return null;
  }
}

/**
 * Analyze scan frequency patterns
 */
export function analyzeScanFrequency(
  scanHistory: QRScanRecord[],
  currentTimestamp: number
): {
  frequencyAnomaly: boolean;
  scansInLastHour: number;
  scansInLastDay: number;
  averageInterval: number;
} {
  const oneHourAgo = currentTimestamp - 60 * 60 * 1000;
  const oneDayAgo = currentTimestamp - 24 * 60 * 60 * 1000;

  const scansInLastHour = scanHistory.filter((s) => s.timestamp > oneHourAgo).length;
  const scansInLastDay = scanHistory.filter((s) => s.timestamp > oneDayAgo).length;

  // Calculate average interval between scans
  let averageInterval = 0;
  if (scanHistory.length > 1) {
    const intervals: number[] = [];
    for (let i = 1; i < scanHistory.length; i++) {
      intervals.push(scanHistory[i].timestamp - scanHistory[i - 1].timestamp);
    }
    averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  }

  // Anomaly: Too many scans in short time (possible cloning attempt)
  const frequencyAnomaly = scansInLastHour > 10 || scansInLastDay > 50;

  return {
    frequencyAnomaly,
    scansInLastHour,
    scansInLastDay,
    averageInterval,
  };
}

/**
 * Detect location anomalies
 */
export function detectLocationAnomaly(
  scanHistory: QRScanRecord[],
  currentLocation?: string
): {
  locationAnomaly: boolean;
  uniqueLocations: number;
  distanceFromLastScan?: number;
} {
  if (!currentLocation || scanHistory.length === 0) {
    return {
      locationAnomaly: false,
      uniqueLocations: 0,
    };
  }

  const uniqueLocations = new Set(scanHistory.map((s) => s.location).filter(Boolean)).size;
  
  // If product scanned in many different locations quickly, it's suspicious
  const locationAnomaly = uniqueLocations > 5 && scanHistory.length < 10;

  return {
    locationAnomaly,
    uniqueLocations,
  };
}

/**
 * Detect user behavior anomalies
 */
export function detectUserAnomaly(
  scanHistory: QRScanRecord[],
  currentUserId?: string
): {
  userAnomaly: boolean;
  uniqueUsers: number;
  suspiciousUserPattern: boolean;
} {
  const uniqueUsers = new Set(scanHistory.map((s) => s.userId).filter(Boolean)).size;
  
  // Anomaly: Many different users scanning same product quickly
  const suspiciousUserPattern = uniqueUsers > 3 && scanHistory.length < 15;

  // Check if current user has suspicious pattern
  if (currentUserId) {
    const userScans = scanHistory.filter((s) => s.userId === currentUserId);
    const userScansInLastHour = userScans.filter(
      (s) => Date.now() - s.timestamp < 60 * 60 * 1000
    ).length;
    
    // Same user scanning too frequently
    const userAnomaly = userScansInLastHour > 5 || suspiciousUserPattern;
    
    return {
      userAnomaly,
      uniqueUsers,
      suspiciousUserPattern,
    };
  }

  return {
    userAnomaly: false,
    uniqueUsers,
    suspiciousUserPattern,
  };
}

/**
 * Analyze cryptographic consistency
 */
export function analyzeCryptographicConsistency(
  qrData: string,
  scanHistory: QRScanRecord[]
): {
  cryptoAnomaly: boolean;
  consistentData: boolean;
  dataMatches: number;
} {
  // Check if QR data is consistent across scans (should be same encrypted payload)
  const dataMatches = scanHistory.filter((s) => {
    // In real implementation, compare decrypted payloads
    // For now, check if data structure is similar
    return qrData.length === s.productId.length;
  }).length;

  const consistentData = dataMatches === scanHistory.length;
  
  // Anomaly: QR data changes between scans (possible manipulation)
  const cryptoAnomaly = !consistentData && scanHistory.length > 1;

  return {
    cryptoAnomaly,
    consistentData,
    dataMatches,
  };
}

/**
 * Fetch scan history from Firestore
 */
export async function fetchScanHistory(
  productId: string,
  firestoreUtils?: FirestoreUtils
): Promise<QRScanRecord[]> {
  if (!firestoreUtils) {
    return [];
  }

  try {
    const { collection, query, where, orderBy, limit: limitFn, getDocs, getFirestore, getFirebaseApp } = firestoreUtils;
    if (!getFirebaseApp) {
      return [];
    }
    const app = getFirebaseApp();
    if (!app) return [];

    const db = getFirestore(app);
    const verificationsRef = collection(db, "verifications");
    
    // Get last 100 verifications for this product
    const queryArgs: unknown[] = [
      verificationsRef,
      where("productId", "==", productId),
    ];
    if (orderBy) {
      queryArgs.push(orderBy("createdAt", "desc"));
    }
    if (limitFn) {
      queryArgs.push(limitFn(100));
    }
    const q = query(...queryArgs);

    const snapshot = await getDocs(q);
    const history: QRScanRecord[] = [];

    snapshot.forEach((doc: { data: () => Record<string, unknown> }) => {
      const data = doc.data();
      history.push({
        productId: String(data.productId),
        timestamp: Number((data as { createdAt?: number }).createdAt) || Date.now(),
        location: (data as { metadata?: { location?: string } }).metadata?.location,
        userId: (data as { verifierId?: string }).verifierId,
      });
    });

    return history;
  } catch (error) {
    console.error("Failed to fetch scan history:", error);
    return [];
  }
}

/**
 * Comprehensive QR anomaly detection
 * Now integrated with Firestore for scan history
 */
interface FirestoreUtils {
  collection: (db: unknown, path: string, ...pathSegments: string[]) => unknown;
  query: (...args: unknown[]) => unknown;
  where: (fieldPath: string, opStr: string, value: unknown) => unknown;
  orderBy?: (fieldPath: string, directionStr?: "asc" | "desc") => unknown;
  limit?: (limit: number) => unknown;
  getDocs: (query: unknown) => Promise<{ forEach: (callback: (doc: { data: () => Record<string, unknown> }) => void) => void }>;
  getFirestore: (app: unknown) => unknown;
  app?: unknown;
  getFirebaseApp?: () => unknown;
}

export async function detectQRAnomalies(
  qrData: string,
  productId: string,
  scanHistory: QRScanRecord[],
  currentLocation?: string,
  currentUserId?: string,
  firestoreUtils?: FirestoreUtils
): Promise<QRAnomalyResult> {
  // If scanHistory is empty but we have Firestore access, fetch it
  let actualHistory = scanHistory;
  if (actualHistory.length === 0 && firestoreUtils) {
    actualHistory = await fetchScanHistory(productId, firestoreUtils);
  }
  const anomalies: string[] = [];
  let anomalyScore = 0;
  const currentTimestamp = Date.now();

  // 1. Scan frequency analysis
  const frequencyAnalysis = analyzeScanFrequency(scanHistory, currentTimestamp);
  if (frequencyAnalysis.frequencyAnomaly) {
    anomalyScore += 30;
    anomalies.push(
      `Unusual scan frequency: ${frequencyAnalysis.scansInLastHour} scans in last hour, ${frequencyAnalysis.scansInLastDay} in last day - HIGH RISK`
    );
  } else {
    anomalies.push(`Normal scan frequency (${frequencyAnalysis.scansInLastDay} scans today)`);
  }

  // 2. Location analysis
  const locationAnalysis = detectLocationAnomaly(scanHistory, currentLocation);
  if (locationAnalysis.locationAnomaly) {
    anomalyScore += 25;
    anomalies.push(
      `Location anomaly: Product scanned in ${locationAnalysis.uniqueLocations} different locations - MEDIUM RISK`
    );
  }

  // 3. User behavior analysis
  const userAnalysis = detectUserAnomaly(scanHistory, currentUserId);
  if (userAnalysis.userAnomaly) {
    anomalyScore += 20;
    anomalies.push(
      `User behavior anomaly: ${userAnalysis.uniqueUsers} different users scanned this product - MEDIUM RISK`
    );
  }

  // 4. Cryptographic consistency
  const cryptoAnalysis = analyzeCryptographicConsistency(qrData, scanHistory);
  if (cryptoAnalysis.cryptoAnomaly) {
    anomalyScore += 35;
    anomalies.push(
      "Cryptographic inconsistency detected - QR data changed between scans - CRITICAL RISK"
    );
  }

  // Determine if overall anomalous
  const isAnomalous = anomalyScore > 40;
  const confidence = Math.min(100, anomalyScore);

  return {
    isAnomalous,
    anomalyScore,
    anomalies,
    confidence,
  };
}

