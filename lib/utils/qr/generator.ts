/**
 * QR Code generation and encryption utilities
 */

import QRCode from "qrcode";
import CryptoJS from "crypto-js";

/**
 * QR payload structure
 */
export interface QRPayload {
  productId: string;
  manufacturerId: string;
  orgId: string;
  ts: number; // Timestamp
}

/**
 * Encrypt QR payload using AES-256
 */
export function encryptQRPayload(payload: QRPayload, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(payloadString, secret).toString();
  return encrypted;
}

/**
 * Decrypt QR payload
 */
export function decryptQRPayload(encrypted: string, secret: string): QRPayload | null {
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, secret);
    const payloadString = decrypted.toString(CryptoJS.enc.Utf8);
    if (!payloadString) {
      return null;
    }
    return JSON.parse(payloadString) as QRPayload;
  } catch (error) {
    console.error("Failed to decrypt QR payload:", error);
    return null;
  }
}

/**
 * Generate QR code image as data URL
 */
export async function generateQRCodeDataUrl(
  data: string,
  options?: {
    size?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const defaultOptions = {
    width: options?.size || 400,
    margin: options?.margin || 2,
    color: {
      dark: options?.color?.dark || "#000000",
      light: options?.color?.light || "#FFFFFF",
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(data, defaultOptions);
    return dataUrl;
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code for a product
 */
export async function generateProductQRCode(
  productId: string,
  manufacturerId: string,
  orgId: string,
  secret: string,
  options?: Parameters<typeof generateQRCodeDataUrl>[1]
): Promise<{
  encrypted: string;
  dataUrl: string;
  payload: QRPayload;
}> {
  const payload: QRPayload = {
    productId,
    manufacturerId,
    orgId,
    ts: Date.now(),
  };

  const encrypted = encryptQRPayload(payload, secret);
  const dataUrl = await generateQRCodeDataUrl(encrypted, options);

  return {
    encrypted,
    dataUrl,
    payload,
  };
}

/**
 * Download QR code as PNG
 */
export function downloadQRCode(dataUrl: string, filename: string = "qr-code.png"): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

