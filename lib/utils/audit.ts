/**
 * Enhanced Audit Logging Utility
 * Provides comprehensive audit trail for all user actions and system events
 */

import type { FirebaseApp } from "firebase/app";

export type AuditAction =
  | "user_login"
  | "user_logout"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "product_create"
  | "product_update"
  | "product_delete"
  | "movement_create"
  | "movement_update"
  | "verification_perform"
  | "ticket_create"
  | "ticket_update"
  | "ticket_reply"
  | "data_export"
  | "data_delete"
  | "settings_update"
  | "role_change"
  | "permission_change"
  | "api_access"
  | "file_upload"
  | "file_download"
  | "system_event";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditLog {
  auditId: string;
  timestamp: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  orgId?: string;
  action: AuditAction;
  resourceType: string; // e.g., "product", "user", "movement"
  resourceId?: string;
  severity: AuditSeverity;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  outcome: "success" | "failure" | "partial";
  errorMessage?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  log: Omit<AuditLog, "auditId" | "timestamp">,
  app?: FirebaseApp
): Promise<void> {
  try {
    const firebaseApp = app || await getFirebaseAppServer();
    if (!firebaseApp) {
      console.warn("Firebase not configured, skipping audit log");
      return;
    }

    const { collection, addDoc, getFirestore } = await import("firebase/firestore");
    const db = getFirestore(firebaseApp);
    const auditRef = collection(db, "audit_logs");

    await addDoc(auditRef, {
      ...log,
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

/**
 * Get Firebase app - server-side compatible
 */
async function getFirebaseAppServer(): Promise<FirebaseApp | null> {
  try {
    const { getApps, initializeApp } = await import("firebase/app");
    const apps = getApps();
    if (apps.length > 0) {
      return apps[0];
    }

    const { firebaseConfig } = await import("@/lib/firebase/config");
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return null;
    }

    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Error getting Firebase app:", error);
    return null;
  }
}

/**
 * Helper to create audit log from request context
 */
export async function auditRequest(
  action: AuditAction,
  resourceType: string,
  options: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    orgId?: string;
    resourceId?: string;
    description: string;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown>;
    outcome: "success" | "failure" | "partial";
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<void> {
  await createAuditLog({
    userId: options.userId,
    userEmail: options.userEmail,
    userName: options.userName,
    orgId: options.orgId,
    action,
    resourceType,
    resourceId: options.resourceId,
    severity: options.severity || "info",
    description: options.description,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    requestId: options.requestId,
    metadata: options.metadata,
    outcome: options.outcome,
    errorMessage: options.errorMessage,
  });
}

/**
 * Mask sensitive data in audit logs
 */
export function maskAuditData(data: unknown): unknown {
  if (typeof data === "string") {
    // Mask emails
    if (data.includes("@")) {
      const [local, domain] = data.split("@");
      return `${local?.substring(0, 2)}***@${domain}`;
    }
    // Mask phone numbers
    if (/^\+?\d{10,}$/.test(data)) {
      return `***${data.slice(-4)}`;
    }
  }

  if (typeof data === "object" && data !== null) {
    const masked: Record<string, unknown> = {};
    const sensitiveKeys = ["password", "secret", "token", "key", "apiKey", "auth"];
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        masked[key] = "***MASKED***";
      } else if (typeof value === "object") {
        masked[key] = maskAuditData(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  return data;
}

