/**
 * API Route: Batch Product Import
 * POST /api/batches/import - Upload CSV/XLS file and create batch
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { createBatch } from "@/lib/firebase/products";
import { getUserDocument } from "@/lib/firebase/firestore";
import { createProduct } from "@/lib/firebase/products";
import { generateProductQRCode } from "@/lib/utils/qr/generator";
import { createProductRegisterTransaction } from "@/lib/utils/transactions";
import type { ProductCategory, ProductStatus } from "@/lib/types/products";
// Dynamic import for xlsx (optional dependency)
type XLSXModule = typeof import("xlsx");
let XLSX: XLSXModule | null = null;
async function getXLSX(): Promise<XLSXModule> {
  if (!XLSX) {
    XLSX = await import("xlsx");
  }
  return XLSX;
}

const QR_AES_SECRET = process.env.QR_AES_SECRET || "default-secret-key-change-in-production";

interface ProductRow {
  name: string;
  sku: string;
  category: ProductCategory;
  description?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  imageUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    if (!decodedToken || !decodedToken.uid) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    const uid = decodedToken.uid;

    // Get user document to verify orgId
    const userDoc = await getUserDocument(uid);
    if (!userDoc || !userDoc.orgId) {
      return NextResponse.json(
        { error: "User must be associated with an organization" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const batchName = formData.get("name") as string || `Batch-${Date.now()}`;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !["csv", "xlsx", "xls"].includes(fileExtension)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV, XLS, and XLSX files are allowed." },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse file based on extension
    let rows: ProductRow[] = [];
    
    if (fileExtension === "csv") {
      // Parse CSV
      const csvText = buffer.toString("utf-8");
      const lines = csvText.split("\n").filter(line => line.trim());
      const headers = lines[0]!.split(",").map(h => h.trim().toLowerCase());
      
      rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        return {
          name: row.name || "",
          sku: row.sku || "",
          category: (row.category || "other").toLowerCase() as ProductCategory,
          description: row.description,
          brand: row.brand,
          model: row.model,
          serialNumber: row.serialnumber || row["serial number"],
          manufacturingDate: row.manufacturingdate || row["manufacturing date"],
          expiryDate: row.expirydate || row["expiry date"],
          imageUrl: row.imageurl || row["image url"],
        } as ProductRow;
      });
    } else {
      // Parse XLS/XLSX - requires xlsx library
      try {
        const xlsxLib = await getXLSX();
        const workbook = xlsxLib.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsxLib.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;
        
        rows = jsonData.map((row) => ({
          name: (row.name || row.Name || row.NAME || "") as string,
          sku: (row.sku || row.SKU || "") as string,
          category: ((row.category || row.Category || row.CATEGORY || "other") as string).toLowerCase() as ProductCategory,
          description: (row.description || row.Description || row.DESCRIPTION) as string | undefined,
          brand: (row.brand || row.Brand || row.BRAND) as string | undefined,
          model: (row.model || row.Model || row.MODEL) as string | undefined,
          serialNumber: (row.serialNumber || row["Serial Number"] || row["SERIAL NUMBER"]) as string | undefined,
          manufacturingDate: (row.manufacturingDate || row["Manufacturing Date"] || row["MANUFACTURING DATE"]) as string | undefined,
          expiryDate: (row.expiryDate || row["Expiry Date"] || row["EXPIRY DATE"]) as string | undefined,
          imageUrl: (row.imageUrl || row["Image URL"] || row["IMAGE URL"]) as string | undefined,
        }));
      } catch {
        return NextResponse.json(
          { error: "XLS/XLSX parsing requires the 'xlsx' library. Please install it: npm install xlsx" },
          { status: 500 }
        );
      }
    }

    // Validate rows
    const validRows = rows.filter(row => row.name && row.sku && row.category);
    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid products found in file. Required columns: name, sku, category" },
        { status: 400 }
      );
    }

    // Create batch document
    const batchId = await createBatch({
      orgId: userDoc.orgId,
      name: batchName,
      status: "processing",
      totalCount: validRows.length,
      processedCount: 0,
      failedCount: 0,
      productIds: [],
      createdBy: uid,
    });

    // Process products asynchronously (in production, use a queue/worker)
    const productIds: string[] = [];
    const errors: string[] = [];

    // Process products sequentially (for now - in production, use batch processing)
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]!;
      try {
        // Validate category - check if it's a default category or a custom category
        const defaultCategories: ProductCategory[] = [
          "electronics",
          "automotive",
          "pharmaceuticals",
          "food",
          "textiles",
          "machinery",
          "chemicals",
          "other",
        ];
        
        let category = row.category.toLowerCase().replace(/\s+/g, "_") as ProductCategory;
        
        // Check if it's a default category
        if (!defaultCategories.includes(category)) {
          // Check if it's a custom category (using admin Firestore)
          const { getAdminFirestore } = await import("@/lib/firebase/admin");
          const adminDb = getAdminFirestore();
          const customCategory = await adminDb.collection("categories")
            .where("name", "==", category)
            .limit(1)
            .get();
          
          if (customCategory.empty) {
            // Default to "other" if category doesn't exist
            category = "other";
          }
        }

        // Prepare product data
        const productData = {
          orgId: userDoc.orgId,
          name: row.name,
          description: row.description || undefined,
          sku: row.sku,
          category,
          batchId,
          imgUrl: row.imageUrl || undefined,
          qrHash: "", // Will be set after QR generation
          qrDataUrl: undefined,
          status: "active" as ProductStatus,
          manufacturerId: uid,
          manufacturerName: userDoc.displayName || userDoc.email,
          metadata: {
            brand: row.brand,
            model: row.model,
            serialNumber: row.serialNumber,
            manufacturingDate: row.manufacturingDate ? new Date(row.manufacturingDate).getTime() : undefined,
            expiryDate: row.expiryDate ? new Date(row.expiryDate).getTime() : undefined,
          },
        };

        // Create product
        const productId = await createProduct(productData);

        // Generate QR code with public URL (new approach)
        const qrSecret = QR_AES_SECRET;
        const qrResult = await generateProductQRCode(
          productId,
          uid,
          userDoc.orgId,
          qrSecret,
          { size: 400 }
        );

        // Update product with QR hash, URL, and data URL
        const { updateDoc, doc, getFirestore } = await import("firebase/firestore");
        const { getFirebaseApp } = await import("@/lib/firebase/client");
        const app = getFirebaseApp();
        if (app) {
          const db = getFirestore(app);
          const productRef = doc(db, "products", productId);
          await updateDoc(productRef, {
            qrHash: qrResult.encrypted,  // Encrypted payload (for verification)
            qrUrl: qrResult.qrUrl,       // Public URL (new field)
            qrDataUrl: qrResult.dataUrl, // QR code image
          });
        }

        // Create transaction
        await createProductRegisterTransaction(
          productId,
          userDoc.orgId,
          uid,
          {
            productName: row.name,
            sku: row.sku,
            category,
            batchId,
          }
        );

        productIds.push(productId);
      } catch (error) {
        console.error(`Failed to process product ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Update batch status
    const { updateDoc, doc, getFirestore } = await import("firebase/firestore");
    const { getFirebaseApp } = await import("@/lib/firebase/client");
    const app = getFirebaseApp();
    if (app) {
      const db = getFirestore(app);
      const batchRef = doc(db, "batches", batchId);
      await updateDoc(batchRef, {
        status: errors.length === validRows.length ? "failed" : "completed",
        processedCount: productIds.length,
        failedCount: errors.length,
        productIds,
        completedAt: Date.now(),
        errorMessage: errors.length > 0 ? errors.slice(0, 10).join("; ") : undefined,
      });
    }

    return NextResponse.json(
      {
        batchId,
        status: errors.length === validRows.length ? "failed" : "completed",
        totalCount: validRows.length,
        processedCount: productIds.length,
        failedCount: errors.length,
        productIds,
        errors: errors.slice(0, 10), // Return first 10 errors
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Batch import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

