/**
 * MFA utility functions
 */

import { authenticator } from "otplib";
import QRCode from "qrcode";

/**
 * Generate a TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a TOTP token from a secret
 */
export function generateTOTPToken(secret: string): string {
  authenticator.options = {
    step: 30, // 30 seconds
    window: [1, 1], // Accept tokens from current and previous window
  };
  return authenticator.generate(secret);
}

/**
 * Verify a TOTP token
 */
export function verifyTOTPToken(token: string, secret: string): boolean {
  authenticator.options = {
    step: 30,
    window: [1, 1], // Allow previous and next window for clock skew
  };
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    return false;
  }
}

/**
 * Generate QR code data URL for TOTP setup
 */
export async function generateTOTPQRCode(
  email: string,
  secret: string,
  issuer: string = "OriginX"
): Promise<string> {
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate backup codes for TOTP recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
  return codes;
}

/**
 * Hash a backup code (for storage)
 */
export function hashBackupCode(code: string): string {
  // Simple hash - in production, use proper hashing like bcrypt
  // This is just for demonstration
  return Buffer.from(code).toString("base64");
}

/**
 * Verify a backup code
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): boolean {
  const hashed = hashBackupCode(code);
  return hashedCodes.includes(hashed);
}

