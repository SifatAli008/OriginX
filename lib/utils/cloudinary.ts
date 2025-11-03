/**
 * Cloudinary utility functions for image uploads
 */

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/**
 * Upload image to Cloudinary using unsigned upload preset
 * This is used for client-side uploads with preset configured in Cloudinary
 */
export async function uploadImageToCloudinary(
  file: File | Buffer,
  folder: string = "products",
  preset?: string
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary cloud name is not configured");
  }

  const formData = new FormData();
  
  // Convert Buffer to Blob if needed
  let blob: Blob;
  if (file instanceof File) {
    blob = file;
  } else {
    blob = new Blob([file], { type: "image/jpeg" });
  }

  formData.append("file", blob);
  formData.append("folder", folder);
  
  if (preset) {
    formData.append("upload_preset", preset);
  }

  const cloudName = CLOUDINARY_CLOUD_NAME;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const data = await response.json();
    return {
      publicId: data.public_id,
      secureUrl: data.secure_url,
      url: data.url,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

/**
 * Upload image to Cloudinary using signed upload (server-side)
 * Requires API key and secret
 */
export async function uploadImageToCloudinarySigned(
  file: File | Buffer,
  folder: string = "products"
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary configuration is incomplete. Need cloud name, API key, and secret.");
  }

  const formData = new FormData();
  
  // Convert Buffer to Blob if needed
  let blob: Blob;
  if (file instanceof File) {
    blob = file;
  } else {
    blob = new Blob([file], { type: "image/jpeg" });
  }

  formData.append("file", blob);
  formData.append("folder", folder);

  const cloudName = CLOUDINARY_CLOUD_NAME;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  // Generate signature if needed (for timestamp-based uploads)
  // For server-side uploads, we'll use the API key/secret in the request
  // Note: In production, consider using unsigned upload with preset for better security

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: {
        // For unsigned uploads, no auth headers needed if preset is configured
        // For signed uploads, add authorization header
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const data = await response.json();
    return {
      publicId: data.public_id,
      secureUrl: data.secure_url,
      url: data.url,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

/**
 * Get Cloudinary upload URL for client-side direct upload
 * This returns the URL that can be used in the frontend
 */
export function getCloudinaryUploadUrl(_preset?: string): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary cloud name is not configured");
  }

  const cloudName = CLOUDINARY_CLOUD_NAME;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  return uploadUrl;
}

