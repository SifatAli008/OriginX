/**
 * Company registration request status
 */
export type RegistrationRequestStatus = "pending" | "approved" | "rejected";

/**
 * Company registration request document structure
 */
export interface CompanyRegistrationRequest {
  requestId: string;              // Document ID
  userId: string;                 // Firebase Auth UID of the requester
  userEmail: string;               // Email of the requester
  userName?: string;               // Display name of the requester
  companyName: string;             // Company name
  companyType?: string;           // Company type/category
  description?: string;            // Company description
  address?: string;                // Company address
  phone?: string;                  // Contact phone
  status: RegistrationRequestStatus;
  requestedAt: number;             // Timestamp
  reviewedAt?: number;             // Timestamp when reviewed
  reviewedBy?: string;             // UID of admin who reviewed
  rejectionReason?: string;        // If rejected, reason
  orgId?: string;                  // Organization ID if approved
}

