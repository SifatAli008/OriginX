/**
 * GDPR Compliance Types
 */

export interface GDPRConsent {
  userId: string;
  orgId?: string;
  consentType: "data_processing" | "marketing" | "analytics" | "cookies";
  consented: boolean;
  consentText: string;
  version: string; // Version of consent text/terms
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  revokedAt?: number;
}

export interface DataExport {
  exportId: string;
  userId: string;
  orgId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: "json" | "csv" | "pdf";
  dataCategories: Array<
    | "profile"
    | "products"
    | "movements"
    | "verifications"
    | "transactions"
    | "tickets"
    | "preferences"
  >;
  fileUrl?: string;
  expiresAt: number; // Download link expiration
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface DataDeletionRequest {
  requestId: string;
  userId: string;
  orgId?: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  reason?: string;
  requestedAt: number;
  processedAt?: number;
  cancelledAt?: number;
  cancelledBy?: string;
}

