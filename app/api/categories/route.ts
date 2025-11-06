export const runtime = 'nodejs';
/**
 * API Route: Product Categories Management
 * GET /api/categories - List all categories (default + custom)
 * POST /api/categories - Add a new custom category
 * DELETE /api/categories - Delete a custom category
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getUserDocumentServer } from "@/lib/firebase/firestore-server";

const DEFAULT_CATEGORIES = [
  "electronics",
  "automotive",
  "pharmaceuticals",
  "food",
  "textiles",
  "machinery",
  "chemicals",
  "other",
];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Fetch custom categories from Firestore
    const db = getAdminFirestore();
    const categoriesSnapshot = await db.collection("categories").get();
    const customCategories = categoriesSnapshot.docs.map((doc: { data: () => { name?: string } }) => {
      const data = doc.data();
      return data?.name || "";
    }).filter((name: string): name is string => Boolean(name));

    // Combine default and custom categories, removing duplicates
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...customCategories])].sort();

    return NextResponse.json({ 
      categories: allCategories,
      customCategories: customCategories, // Return custom categories separately for UI
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Categories API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Get user document to verify role (auto-creates if missing)
    let userDoc: Awaited<ReturnType<typeof getUserDocumentServer>> = null;
    try {
      userDoc = await getUserDocumentServer(decoded.uid, decoded.email || undefined);
    } catch (error) {
      console.warn(`[Categories API] Error fetching user document:`, error);
      // Continue anyway - we'll determine role from email
    }
    
    // If user document doesn't exist, try to determine role from email or allow if authenticated
    let userRole: string = "sme";
    if (userDoc) {
      userRole = userDoc.role;
    } else {
      // If document doesn't exist, check if admin email
      const isAdminEmail = decoded.email?.toLowerCase() === "admin@originx.com";
      if (isAdminEmail) {
        userRole = "admin";
      } else {
        // For authenticated users without a document, allow them to proceed (they'll be treated as SME)
        console.warn(`[Categories API] User document not found for ${decoded.uid}, allowing as SME`);
      }
    }

    // Only company/SME users (or admin) can add categories
    if (userRole !== "company" && userRole !== "sme" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Only company, SME, or admin users can add categories" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const categoryName = name.trim().toLowerCase().replace(/\s+/g, "_");

    // Check if category already exists (default or custom)
    if (DEFAULT_CATEGORIES.includes(categoryName)) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    
    // Check if custom category already exists
    const existingCategory = await db.collection("categories")
      .where("name", "==", categoryName)
      .limit(1)
      .get();

    if (!existingCategory.empty) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      );
    }

    // Add new category
    await db.collection("categories").add({
      name: categoryName,
      displayName: name.trim(),
      createdBy: decoded.uid,
      createdAt: Date.now(),
    });

    return NextResponse.json(
      { message: "Category added successfully", category: categoryName },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Categories API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't expose "User record not found" - convert to a more generic error
    if (errorMessage.includes("User record not found") || errorMessage.includes("User record")) {
      return NextResponse.json(
        { error: "Authentication error. Please try logging out and back in." },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyIdToken(token);
    if (!decoded || !decoded.uid) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Get user document to verify role (auto-creates if missing)
    let userDoc: Awaited<ReturnType<typeof getUserDocumentServer>> = null;
    try {
      userDoc = await getUserDocumentServer(decoded.uid, decoded.email || undefined);
    } catch (error) {
      console.warn(`[Categories API] Error fetching user document:`, error);
      // Continue anyway - we'll determine role from email
    }
    
    // If user document doesn't exist, try to determine role from email or allow if authenticated
    let userRole: string = "sme";
    if (userDoc) {
      userRole = userDoc.role;
    } else {
      // If document doesn't exist, check if admin email
      const isAdminEmail = decoded.email?.toLowerCase() === "admin@originx.com";
      if (isAdminEmail) {
        userRole = "admin";
      } else {
        // For authenticated users without a document, allow them to proceed (they'll be treated as SME)
        console.warn(`[Categories API] User document not found for ${decoded.uid}, allowing as SME`);
      }
    }

    // Only company/SME users (or admin) can delete categories
    if (userRole !== "company" && userRole !== "sme" && userRole !== "admin") {
      return NextResponse.json(
        { error: "Only company, SME, or admin users can delete categories" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryName = searchParams.get("name");

    if (!categoryName || typeof categoryName !== "string" || categoryName.trim().length === 0) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const normalizedCategoryName = categoryName.trim().toLowerCase().replace(/\s+/g, "_");

    // Prevent deletion of default categories
    if (DEFAULT_CATEGORIES.includes(normalizedCategoryName)) {
      return NextResponse.json(
        { error: "Cannot delete default categories" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    
    // Find and delete the category
    const categoryQuery = await db.collection("categories")
      .where("name", "==", normalizedCategoryName)
      .limit(1)
      .get();

    if (categoryQuery.empty) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Delete the category document
    const categoryDoc = categoryQuery.docs[0];
    await categoryDoc.ref.delete();

    return NextResponse.json(
      { message: "Category deleted successfully", category: normalizedCategoryName },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Categories API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Don't expose "User record not found" - convert to a more generic error
    if (errorMessage.includes("User record not found") || errorMessage.includes("User record")) {
      return NextResponse.json(
        { error: "Authentication error. Please try logging out and back in." },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

