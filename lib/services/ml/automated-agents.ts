/**
 * Automated Agents Service
 * Implements autonomous monitoring and enforcement agents
 */

import { calculateFraudRisk } from "./predictive-analytics";

export interface SupplyChainAlert {
  alertId: string;
  type: "supplier_anomaly" | "product_flow_anomaly" | "fraud_detected" | "risk_threshold_exceeded";
  severity: "low" | "medium" | "high" | "critical";
  supplierId?: string;
  productId?: string;
  batchId?: string;
  description: string;
  riskScore: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface SmartContractAction {
  actionId: string;
  type: "block_product" | "revoke_registration" | "flag_supplier" | "suspend_account";
  targetType: "product" | "supplier" | "user" | "batch";
  targetId: string;
  reason: string;
  riskScore: number;
  confidence: number;
  timestamp: number;
  executed: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Supply Chain Monitoring Agent
 * Continuously monitors registered suppliers and flags anomalies
 */
export async function monitorSupplyChain(
  supplierData: {
    supplierId: string;
    orgId: string;
    productCount: number;
    fraudCount: number;
    recentVerifications: number;
    verificationFailureRate: number;
    suspiciousProductRate: number;
    averageRiskScore: number;
    lastActivityTimestamp: number;
  }
): Promise<SupplyChainAlert[]> {
  const alerts: SupplyChainAlert[] = [];
  const now = Date.now();
  const daysSinceLastActivity = (now - supplierData.lastActivityTimestamp) / (24 * 60 * 60 * 1000);

  // Calculate overall risk score
  const fraudFeatures = {
    supplierReputation: supplierData.fraudCount === 0 ? 100 : Math.max(0, 100 - supplierData.fraudCount * 10),
    supplierFraudHistory: supplierData.fraudCount,
    suspiciousVerificationRate: supplierData.suspiciousProductRate,
    verificationCount: supplierData.recentVerifications,
  };

  const riskResult = await calculateFraudRisk(fraudFeatures);
  const overallRisk = riskResult.riskScore;

  // Alert 1: High fraud risk
  if (overallRisk > 70) {
    alerts.push({
      alertId: `alert_${Date.now()}_${supplierData.supplierId}`,
      type: "fraud_detected",
      severity: "critical",
      supplierId: supplierData.supplierId,
      description: `Supplier has critical fraud risk score of ${overallRisk.toFixed(0)}/100. Multiple fraud indicators detected.`,
      riskScore: overallRisk,
      timestamp: now,
      metadata: {
        fraudCount: supplierData.fraudCount,
        verificationFailureRate: supplierData.verificationFailureRate,
        suspiciousProductRate: supplierData.suspiciousProductRate,
        factors: riskResult.factors,
      },
    });
  }

  // Alert 2: High failure rate
  if (supplierData.verificationFailureRate > 0.3 && supplierData.recentVerifications > 10) {
    alerts.push({
      alertId: `alert_${Date.now()}_${supplierData.supplierId}_failure`,
      type: "product_flow_anomaly",
      severity: "high",
      supplierId: supplierData.supplierId,
      description: `High verification failure rate: ${(supplierData.verificationFailureRate * 100).toFixed(0)}% of products failing verification.`,
      riskScore: supplierData.verificationFailureRate * 100,
      timestamp: now,
      metadata: {
        verificationFailureRate: supplierData.verificationFailureRate,
        recentVerifications: supplierData.recentVerifications,
      },
    });
  }

  // Alert 3: Suspicious product rate
  if (supplierData.suspiciousProductRate > 0.2 && supplierData.recentVerifications > 5) {
    alerts.push({
      alertId: `alert_${Date.now()}_${supplierData.supplierId}_suspicious`,
      type: "product_flow_anomaly",
      severity: "medium",
      supplierId: supplierData.supplierId,
      description: `High suspicious product rate: ${(supplierData.suspiciousProductRate * 100).toFixed(0)}% of products flagged as suspicious.`,
      riskScore: supplierData.suspiciousProductRate * 100,
      timestamp: now,
      metadata: {
        suspiciousProductRate: supplierData.suspiciousProductRate,
      },
    });
  }

  // Alert 4: Inactivity anomaly (supplier registered but no recent activity)
  if (daysSinceLastActivity > 90 && supplierData.productCount === 0) {
    alerts.push({
      alertId: `alert_${Date.now()}_${supplierData.supplierId}_inactive`,
      type: "supplier_anomaly",
      severity: "low",
      supplierId: supplierData.supplierId,
      description: `Supplier has been inactive for ${Math.floor(daysSinceLastActivity)} days with no products registered.`,
      riskScore: 10,
      timestamp: now,
      metadata: {
        daysSinceLastActivity: Math.floor(daysSinceLastActivity),
      },
    });
  }

  // Alert 5: Sudden spike in product registrations
  // (This would require historical data - placeholder for now)
  if (supplierData.productCount > 100 && supplierData.recentVerifications < 5) {
    alerts.push({
      alertId: `alert_${Date.now()}_${supplierData.supplierId}_spike`,
      type: "product_flow_anomaly",
      severity: "medium",
      supplierId: supplierData.supplierId,
      description: `Supplier has registered ${supplierData.productCount} products but few verifications. Possible bulk counterfeit registration.`,
      riskScore: 40,
      timestamp: now,
      metadata: {
        productCount: supplierData.productCount,
        recentVerifications: supplierData.recentVerifications,
      },
    });
  }

  return alerts;
}

/**
 * Smart Contract Enforcement Agent
 * Automatically blocks counterfeit products or revokes registrations based on ML scoring
 */
export async function enforceSmartContract(
  targetType: "product" | "supplier" | "user" | "batch",
  targetId: string,
  riskData: {
    riskScore: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    fraudCount?: number;
    verificationFailureRate?: number;
    suspiciousRate?: number;
    factors?: string[];
  }
): Promise<SmartContractAction | null> {
  // Only take action for high/critical risk
  if (riskData.riskLevel !== "high" && riskData.riskLevel !== "critical") {
    return null;
  }

  // Determine action type based on target and risk
  let actionType: SmartContractAction["type"];
  let reason: string;

  if (targetType === "product") {
    if (riskData.riskLevel === "critical") {
      actionType = "block_product";
      reason = `Product blocked due to critical fraud risk (score: ${riskData.riskScore.toFixed(0)}/100). ${riskData.factors?.join(", ") || "Multiple risk factors detected"}`;
    } else {
      return null; // High risk products are flagged but not automatically blocked
    }
  } else if (targetType === "supplier") {
    if (riskData.riskLevel === "critical" && (riskData.fraudCount || 0) > 5) {
      actionType = "revoke_registration";
      reason = `Supplier registration revoked due to critical fraud history (${riskData.fraudCount} incidents, risk score: ${riskData.riskScore.toFixed(0)}/100)`;
    } else if (riskData.riskLevel === "high") {
      actionType = "flag_supplier";
      reason = `Supplier flagged for review due to high fraud risk (score: ${riskData.riskScore.toFixed(0)}/100)`;
    } else {
      return null;
    }
  } else if (targetType === "batch") {
    if (riskData.riskLevel === "critical" && (riskData.verificationFailureRate || 0) > 0.5) {
      actionType = "block_product";
      reason = `Batch products blocked due to critical failure rate (${((riskData.verificationFailureRate || 0) * 100).toFixed(0)}% failures)`;
    } else {
      return null;
    }
  } else {
    // user type
    if (riskData.riskLevel === "critical") {
      actionType = "suspend_account";
      reason = `Account suspended due to critical fraud risk (score: ${riskData.riskScore.toFixed(0)}/100)`;
    } else {
      return null;
    }
  }

  const action: SmartContractAction = {
    actionId: `action_${Date.now()}_${targetId}`,
    type: actionType,
    targetType,
    targetId,
    reason,
    riskScore: riskData.riskScore,
    confidence: riskData.riskLevel === "critical" ? 90 : 70,
    timestamp: Date.now(),
    executed: false, // Will be executed by calling function
    metadata: {
      riskLevel: riskData.riskLevel,
      factors: riskData.factors || [],
    },
  };

  return action;
}

/**
 * Execute smart contract action (update target in database)
 */
export async function executeSmartContractAction(
  action: SmartContractAction
): Promise<{ success: boolean; message: string }> {
  try {
    // In production, this would update Firestore collections
    // For now, return success (actual execution happens in API routes)
    
    // Example execution logic:
    // if (action.targetType === "product") {
    //   await updateProductStatus(action.targetId, "blocked");
    // } else if (action.targetType === "supplier") {
    //   await updateSupplierStatus(action.targetId, action.type === "revoke_registration" ? "revoked" : "flagged");
    // }

    return {
      success: true,
      message: `Smart contract action ${action.type} executed for ${action.targetType} ${action.targetId}`,
    };
  } catch (error) {
    console.error("Failed to execute smart contract action:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Aggregate alerts for admin dashboard
 */
export async function aggregateAlerts(
  alerts: SupplyChainAlert[]
): Promise<{
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  byType: Record<string, number>;
  bySupplier: Record<string, number>;
}> {
  const byType: Record<string, number> = {};
  const bySupplier: Record<string, number> = {};
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  alerts.forEach((alert) => {
    // Count by type
    byType[alert.type] = (byType[alert.type] || 0) + 1;

    // Count by supplier
    if (alert.supplierId) {
      bySupplier[alert.supplierId] = (bySupplier[alert.supplierId] || 0) + 1;
    }

    // Count by severity
    if (alert.severity === "critical") critical++;
    else if (alert.severity === "high") high++;
    else if (alert.severity === "medium") medium++;
    else if (alert.severity === "low") low++;
  });

  return {
    totalAlerts: alerts.length,
    criticalAlerts: critical,
    highAlerts: high,
    mediumAlerts: medium,
    lowAlerts: low,
    byType,
    bySupplier,
  };
}

