/**
 * Product types and interfaces
 */

/**
 * Product status
 */
export type ProductStatus = "active" | "inactive" | "discontinued" | "suspended";

/**
 * Product category
 */
export type ProductCategory = 
  | "electronics"
  | "automotive"
  | "pharmaceuticals"
  | "food"
  | "textiles"
  | "machinery"
  | "chemicals"
  | "other";

/**
 * Product document structure in Firestore
 */
export interface ProductDocument {
  productId: string;              // Unique product ID (document ID)
  orgId: string;                  // Organization ID
  name: string;                   // Product name
  description?: string;            // Product description
  sku: string;                    // Stock Keeping Unit
  category: ProductCategory;      // Product category
  quantity?: number;              // Available quantity (inventory count)
  batchId?: string;               // Batch ID (if part of a batch)
  imgUrl?: string;                // Product image URL
  qrHash: string;                 // Encrypted QR code hash/data
  qrDataUrl?: string;            // QR code image data URL (for display)
  status: ProductStatus;          // Product status
  manufacturerId: string;         // User ID who created the product
  manufacturerName?: string;      // Denormalized manufacturer name
  metadata?: {                    // Additional metadata
    brand?: string;
    model?: string;
    serialNumber?: string;
    manufacturingDate?: number;    // Timestamp
    expiryDate?: number;          // Timestamp (for perishables)
    [key: string]: unknown;
  };
  createdAt: number;              // Timestamp
  updatedAt?: number;              // Timestamp (rarely updated)
}

/**
 * Batch document structure
 */
export interface BatchDocument {
  batchId: string;               // Unique batch ID (document ID)
  orgId: string;                 // Organization ID
  name: string;                   // Batch name/identifier
  fileUrl?: string;              // CSV/XLS file URL (if uploaded)
  status: "pending" | "processing" | "completed" | "failed";
  totalCount: number;            // Total products in batch
  processedCount: number;        // Number of products processed
  failedCount: number;           // Number of products that failed
  productIds: string[];         // Array of product IDs in this batch
  createdBy: string;             // User ID who created the batch
  createdAt: number;            // Timestamp
  completedAt?: number;          // Timestamp when batch processing completed
  errorMessage?: string;         // Error message if batch failed
}

/**
 * Product registration form data
 */
export interface ProductRegistrationForm {
  name: string;
  description?: string;
  sku: string;
  category: ProductCategory;
  quantity?: number;              // Initial quantity
  image?: File | string;         // Image file or URL
  metadata?: {
    brand?: string;
    model?: string;
    serialNumber?: string;
    manufacturingDate?: string;   // ISO date string
    expiryDate?: string;         // ISO date string
    [key: string]: unknown;
  };
}

/**
 * Batch import form data
 */
export interface BatchImportForm {
  name: string;
  file: File;                    // CSV or XLS file
}

/**
 * Product list filters
 */
export interface ProductFilters {
  category?: ProductCategory;
  status?: ProductStatus;
  search?: string;               // Search by name, SKU, etc.
  manufacturerId?: string;        // Filter by manufacturer (admin only)
  orgId?: string;                // Filter by organization
  batchId?: string;              // Filter by batch
  page?: number;
  pageSize?: number;
}

/**
 * Product list response
 */
export interface ProductListResponse {
  items: ProductDocument[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

