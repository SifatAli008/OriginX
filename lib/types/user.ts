/**
 * User roles in the OriginX system
 */
export type UserRole = 
  | "sme"           // Small/Medium Enterprise
  | "company"       // Company (buyer/organization)
  | "admin";        // System Administrator

/**
 * MFA methods available
 */
export type MFAMethod = "email" | "sms" | "totp"; // TOTP = Google Authenticator

/**
 * MFA configuration for a user
 */
export interface MFAConfig {
  enabled: boolean;
  method?: MFAMethod;
  totpSecret?: string; // Only stored on server, never in client
  phoneNumber?: string; // For SMS OTP
  backupCodes?: string[]; // For TOTP recovery
}

/**
 * User status
 */
export type UserStatus = "active" | "inactive" | "suspended" | "pending";

/**
 * Complete user document structure in Firestore
 */
export interface UserDocument {
  uid: string;                    // Firebase Auth UID (document ID)
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  orgId?: string | null;          // Organization ID (for company/SME users)
  orgName?: string;                // Organization name
  mfaEnabled: boolean;
  mfaConfig?: MFAConfig;
  status: UserStatus;
  createdAt: number;              // Timestamp
  updatedAt: number;              // Timestamp
  lastLoginAt?: number;           // Timestamp
  roleSelectedAt?: number;        // Timestamp when user explicitly selected their role
  createdBy?: string;              // UID of user who created this (for admin)
}

/**
 * Extended auth user with Firestore data
 */
export interface ExtendedAuthUser {
  // Firebase Auth data
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Firestore user data
  role: UserRole;
  mfaEnabled: boolean;
  status: UserStatus;
}

/**
 * Role permissions helper type
 */
export type RolePermissions = {
  canReadProducts: boolean;
  canCreateProducts: boolean;
  canReadMovements: boolean;
  canCreateMovements: boolean;
  canReadVerifications: boolean;
  canVerify: boolean;
  canReadTransactions: boolean;
  canReadAnalytics: boolean;
  canManageUsers: boolean;
  canManageSuppliers: boolean;
  canReadReports: boolean;
  canCreateReports: boolean;
};

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  const basePermissions: RolePermissions = {
    canReadProducts: false,
    canCreateProducts: false,
    canReadMovements: false,
    canCreateMovements: false,
    canReadVerifications: false,
    canVerify: false,
    canReadTransactions: false,
    canReadAnalytics: false,
    canManageUsers: false,
    canManageSuppliers: false,
    canReadReports: false,
    canCreateReports: false,
  };

  switch (role) {
    case "sme":
    case "company":
      return {
        ...basePermissions,
        canReadProducts: true,
        canCreateProducts: true,
        canReadMovements: true,
        canCreateMovements: true,
        canReadVerifications: true,
        canVerify: true,
        canReadTransactions: true,
        canReadAnalytics: true,
        canCreateReports: true,
      };
    
    case "admin":
      return {
        canReadProducts: true,
        canCreateProducts: true,
        canReadMovements: true,
        canCreateMovements: true,
        canReadVerifications: true,
        canVerify: true,
        canReadTransactions: true,
        canReadAnalytics: true,
        canManageUsers: true,
        canManageSuppliers: true,
        canReadReports: true,
        canCreateReports: true,
      };
    
    default:
      return basePermissions;
  }
}

