/**
 * Security Utilities
 * Enhanced encryption, hashing, and security functions
 */

import CryptoJS from "crypto-js";
import { createHash, randomBytes } from "crypto";

/**
 * Enhanced AES-256 encryption with proper key derivation
 * Uses PBKDF2 for key derivation (more secure than plain secret)
 */
export function encryptAES256(
  data: string,
  secret: string,
  salt?: string
): { encrypted: string; salt: string } {
  // Generate salt if not provided
  const encryptionSalt = salt || randomBytes(16).toString("hex");

  // Derive key using PBKDF2 (10000 iterations)
  const key = CryptoJS.PBKDF2(secret, encryptionSalt, {
    keySize: 256 / 32, // 256 bits = 8 words
    iterations: 10000,
  });

  // Encrypt with AES-256
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  return {
    encrypted,
    salt: encryptionSalt,
  };
}

/**
 * Decrypt AES-256 encrypted data
 */
export function decryptAES256(
  encrypted: string,
  secret: string,
  salt: string
): string {
  try {
    // Derive key using same PBKDF2 parameters
    const key = CryptoJS.PBKDF2(secret, salt, {
      keySize: 256 / 32,
      iterations: 10000,
    });

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
      throw new Error("Decryption failed - empty result");
    }

    return plaintext;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash sensitive data using SHA-256
 * Used for passwords, tokens, etc. (one-way hash)
 */
export function hashData(data: string, salt?: string): { hash: string; salt: string } {
  const hashSalt = salt || randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(data + hashSalt)
    .digest("hex");

  return {
    hash,
    salt: hashSalt,
  };
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const computedHash = createHash("sha256")
    .update(data + salt)
    .digest("hex");

  return computedHash === hash;
}

/**
 * Hash password using bcrypt-like approach (SHA-256 with salt)
 * For production, consider using bcrypt or argon2
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  return hashData(password, salt);
}

/**
 * Verify password hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  return verifyHash(password, hash, salt);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Mask sensitive data for logging (e.g., email, phone)
 */
export function maskSensitiveData(data: string, type: "email" | "phone" | "default"): string {
  if (type === "email") {
    const [local, domain] = data.split("@");
    if (!local || !domain) return "***@***.***";
    const maskedLocal = local.length > 2 
      ? `${local.substring(0, 2)}***` 
      : "***";
    return `${maskedLocal}@${domain}`;
  }

  if (type === "phone") {
    if (data.length < 4) return "***";
    return `***${data.slice(-4)}`;
  }

  // Default: mask middle portion
  if (data.length <= 4) return "***";
  const visible = Math.min(2, Math.floor(data.length / 4));
  return `${data.substring(0, visible)}***${data.substring(data.length - visible)}`;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

