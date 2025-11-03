/**
 * Data Quality and Model Feedback Service
 * Human-in-the-loop verification and model drift detection
 */

interface FalsePositiveReport {
  reportId: string;
  verificationId: string;
  productId: string;
  userId: string;
  originalVerdict: "FAKE" | "SUSPICIOUS" | "GENUINE" | "INVALID";
  userReportedVerdict: "FAKE" | "SUSPICIOUS" | "GENUINE" | "INVALID";
  aiScore: number;
  userConfidence: "high" | "medium" | "low";
  feedback: string;
  evidenceUrl?: string;
  timestamp: number;
  reviewed: boolean;
  reviewResult?: "confirmed" | "false_positive" | "false_negative" | "resolved";
}

interface ModelPerformance {
  modelId: string;
  modelType: "image_verification" | "qr_anomaly" | "fraud_scoring" | "behavior_analysis";
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  sampleSize: number;
  lastEvaluated: number;
  driftDetected: boolean;
  driftScore: number; // 0-100 (higher = more drift)
}

interface DriftAlert {
  alertId: string;
  modelId: string;
  modelType: string;
  driftScore: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metrics: {
    previousAccuracy: number;
    currentAccuracy: number;
    accuracyDelta: number;
    falsePositiveDelta: number;
  };
  timestamp: number;
  recommendedAction: string;
}

/**
 * Report false positive/negative for model feedback
 */
export async function reportFalsePositive(
  verificationId: string,
  userId: string,
  userReport: {
    productId: string;
    originalVerdict: "FAKE" | "SUSPICIOUS" | "GENUINE" | "INVALID";
    userReportedVerdict: "FAKE" | "SUSPICIOUS" | "GENUINE" | "INVALID";
    aiScore: number;
    userConfidence: "high" | "medium" | "low";
    feedback: string;
    evidenceUrl?: string;
  }
): Promise<FalsePositiveReport> {
  const report: FalsePositiveReport = {
    reportId: `report_${Date.now()}_${verificationId}`,
    verificationId,
    productId: userReport.productId,
    userId,
    originalVerdict: userReport.originalVerdict,
    userReportedVerdict: userReport.userReportedVerdict,
    aiScore: userReport.aiScore,
    userConfidence: userReport.userConfidence,
    feedback: userReport.feedback,
    evidenceUrl: userReport.evidenceUrl,
    timestamp: Date.now(),
    reviewed: false,
  };

  // In production, store in Firestore 'false_positive_reports' collection
  // await storeFalsePositiveReport(report);

  return report;
}

/**
 * Aggregate false positive reports for model retraining
 */
export async function aggregateFalsePositives(
  reports: FalsePositiveReport[]
): Promise<{
  totalReports: number;
  falsePositives: number; // AI said FAKE but was GENUINE
  falseNegatives: number; // AI said GENUINE but was FAKE
  byModel: Record<string, number>;
  accuracyImpact: number;
  recommendedRetraining: boolean;
}> {
  const falsePositives = reports.filter(
    (r) => r.originalVerdict === "FAKE" && r.userReportedVerdict === "GENUINE"
  ).length;
  
  const falseNegatives = reports.filter(
    (r) => r.originalVerdict === "GENUINE" && r.userReportedVerdict === "FAKE"
  ).length;

  // Group by model type (based on verification characteristics)
  const byModel: Record<string, number> = {};
  reports.forEach((r) => {
    const modelType = r.aiScore < 40 ? "fraud_scoring" : "image_verification";
    byModel[modelType] = (byModel[modelType] || 0) + 1;
  });

  const accuracyImpact = (falsePositives + falseNegatives) / reports.length;
  const recommendedRetraining = accuracyImpact > 0.15 && reports.length > 20; // 15% error rate and sufficient data

  return {
    totalReports: reports.length,
    falsePositives,
    falseNegatives,
    byModel,
    accuracyImpact,
    recommendedRetraining,
  };
}

/**
 * Detect model drift by comparing current vs historical performance
 */
export async function detectModelDrift(
  currentPerformance: ModelPerformance,
  historicalPerformance?: ModelPerformance
): Promise<DriftAlert | null> {
  if (!historicalPerformance) {
    // No baseline to compare - mark as initial evaluation
    return null;
  }

  const accuracyDelta = currentPerformance.accuracy - historicalPerformance.accuracy;
  const falsePositiveDelta = currentPerformance.falsePositiveRate - historicalPerformance.falsePositiveRate;
  const falseNegativeDelta = currentPerformance.falseNegativeRate - historicalPerformance.falseNegativeRate;

  // Calculate drift score (0-100)
  let driftScore = 0;
  driftScore += Math.abs(accuracyDelta) * 2; // Accuracy drop weighs heavily
  driftScore += Math.abs(falsePositiveDelta) * 1.5;
  driftScore += Math.abs(falseNegativeDelta) * 1.5;

  driftScore = Math.min(100, driftScore * 10);

  // Determine if drift is significant
  const significantDrift = driftScore > 30 || accuracyDelta < -0.1 || falsePositiveDelta > 0.15;

  if (!significantDrift) {
    return null;
  }

  // Determine severity
  let severity: DriftAlert["severity"];
  if (driftScore > 70 || accuracyDelta < -0.2) {
    severity = "critical";
  } else if (driftScore > 50 || accuracyDelta < -0.15) {
    severity = "high";
  } else if (driftScore > 35 || accuracyDelta < -0.1) {
    severity = "medium";
  } else {
    severity = "low";
  }

  // Generate recommended action
  let recommendedAction = "";
  if (accuracyDelta < -0.1) {
    recommendedAction = `Model accuracy dropped by ${(Math.abs(accuracyDelta) * 100).toFixed(1)}%. Retrain with recent data.`;
  } else if (falsePositiveDelta > 0.15) {
    recommendedAction = `False positive rate increased by ${(falsePositiveDelta * 100).toFixed(1)}%. Review and retrain model.`;
  } else if (falseNegativeDelta > 0.15) {
    recommendedAction = `False negative rate increased by ${(falseNegativeDelta * 100).toFixed(1)}%. Model missing more fraud cases. Retrain urgently.`;
  }

  const alert: DriftAlert = {
    alertId: `drift_${Date.now()}_${currentPerformance.modelId}`,
    modelId: currentPerformance.modelId,
    modelType: currentPerformance.modelType,
    driftScore,
    severity,
    description: `Model drift detected in ${currentPerformance.modelType}. Performance degradation observed.`,
    metrics: {
      previousAccuracy: historicalPerformance.accuracy,
      currentAccuracy: currentPerformance.accuracy,
      accuracyDelta,
      falsePositiveDelta,
    },
    timestamp: Date.now(),
    recommendedAction,
  };

  return alert;
}

/**
 * Evaluate model performance on new data
 */
export async function evaluateModelPerformance(
  modelType: ModelPerformance["modelType"],
  evaluationData: Array<{
    predicted: "FAKE" | "SUSPICIOUS" | "GENUINE" | "INVALID";
    actual: "FAKE" | "SUSPICIOUS" | "GENUINE" | "INVALID";
    confidence: number;
  }>
): Promise<ModelPerformance> {
  const total = evaluationData.length;
  if (total === 0) {
    throw new Error("No evaluation data provided");
  }

  let truePositives = 0; // Correctly predicted FAKE/SUSPICIOUS
  let falsePositives = 0; // Predicted FAKE/SUSPICIOUS but was GENUINE
  let falseNegatives = 0; // Predicted GENUINE but was FAKE/SUSPICIOUS
  let trueNegatives = 0; // Correctly predicted GENUINE

  evaluationData.forEach((data) => {
    const predictedIsFraud = data.predicted === "FAKE" || data.predicted === "SUSPICIOUS";
    const actualIsFraud = data.actual === "FAKE" || data.actual === "SUSPICIOUS";

    if (predictedIsFraud && actualIsFraud) {
      truePositives++;
    } else if (predictedIsFraud && !actualIsFraud) {
      falsePositives++;
    } else if (!predictedIsFraud && actualIsFraud) {
      falseNegatives++;
    } else {
      trueNegatives++;
    }
  });

  // Calculate metrics
  const accuracy = (truePositives + trueNegatives) / total;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = (2 * precision * recall) / (precision + recall) || 0;
  const falsePositiveRate = falsePositives / (falsePositives + trueNegatives) || 0;
  const falseNegativeRate = falseNegatives / (falseNegatives + truePositives) || 0;

  return {
    modelId: `model_${modelType}_${Date.now()}`,
    modelType,
    accuracy,
    precision,
    recall,
    f1Score,
    falsePositiveRate,
    falseNegativeRate,
    sampleSize: total,
    lastEvaluated: Date.now(),
    driftDetected: false, // Will be set by drift detection
    driftScore: 0,
  };
}

/**
 * Trigger model retraining when drift detected
 */
export async function triggerModelRetraining(
  modelId: string,
  alert: DriftAlert
): Promise<{ success: boolean; message: string }> {
  try {
    // In production, this would:
    // 1. Collect recent training data
    // 2. Retrain model with updated data
    // 3. Validate new model performance
    // 4. Deploy if performance is acceptable

    console.log(`Triggering retraining for model ${modelId} due to drift alert ${alert.alertId}`);
    
    return {
      success: true,
      message: `Model retraining triggered for ${modelId}. Alert: ${alert.description}`,
    };
  } catch (error) {
    console.error("Failed to trigger model retraining:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

