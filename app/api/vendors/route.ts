/**
 * API Route: Vendors Aggregation
 * GET /api/vendors - List vendors (auditor, warehouse, sme, supplier) with stats
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
import type { ProductDocument } from "@/lib/types/products";

// In the simplified RBAC, vendors are SMEs and Companies
const VENDOR_ROLES = new Set(["sme", "company"]);

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

    // Admin only (with fallback for admin email)
    const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
    const adminEmail = (decoded.email || '').toLowerCase();
    let adminDoc = await getUserDocumentServer(decoded.uid, decoded.email || undefined);
    if (!adminDoc && adminEmail === 'admin@originx.com') {
      // Create a temporary admin profile for development if missing
      adminDoc = {
        uid: decoded.uid,
        email: decoded.email || 'admin@originx.com',
        displayName: 'Admin',
        photoURL: null,
        role: 'admin',
        orgId: null,
        orgName: undefined,
        mfaEnabled: false,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as UserDocument;
    }
    if (!adminDoc || adminDoc.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Load Firebase config
    const { firebaseConfig } = await import("@/lib/firebase/config");
    if (!firebaseConfig.projectId) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    }

    const projectId = firebaseConfig.projectId;

    // Fetch users via Firestore REST API
    const usersResp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=1000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!usersResp.ok) {
      const err = await usersResp.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || "Failed to load users" }, { status: 500 });
    }
    const usersData = await usersResp.json();

    interface FirestoreDocument {
      name: string;
      fields?: Record<string, { stringValue?: string; integerValue?: string; booleanValue?: boolean } | string | number | boolean>;
    }

    const allUsers: UserDocument[] = (usersData.documents || []).map((doc: FirestoreDocument) => {
      const f = doc.fields || {};
      return {
        uid: doc.name.split("/").pop() || "",
        email: (typeof f.email === "object" && f.email?.stringValue) || (typeof f.email === "string" ? f.email : "") || "",
        displayName: (typeof f.displayName === "object" && f.displayName?.stringValue) ?? (typeof f.displayName === "string" ? f.displayName : null) ?? null,
        photoURL: (typeof f.photoURL === "object" && f.photoURL?.stringValue) ?? (typeof f.photoURL === "string" ? f.photoURL : null) ?? null,
        role: (typeof f.role === "object" && f.role?.stringValue) || (typeof f.role === "string" ? f.role : "sme") || "sme",
        orgId: (typeof f.orgId === "object" && f.orgId?.stringValue) ?? (typeof f.orgId === "string" ? f.orgId : null) ?? null,
        orgName: (typeof f.orgName === "object" && f.orgName?.stringValue) ?? (typeof f.orgName === "string" ? f.orgName : undefined) ?? undefined,
        mfaEnabled: !!(typeof f.mfaEnabled === "object" && f.mfaEnabled?.booleanValue ?? (typeof f.mfaEnabled === "boolean" ? f.mfaEnabled : false) ?? false),
        status: (typeof f.status === "object" && f.status?.stringValue) || (typeof f.status === "string" ? f.status : "pending") || "pending",
        createdAt: (typeof f.createdAt === "object" && f.createdAt?.integerValue ? parseInt(f.createdAt.integerValue) : Date.now()),
        updatedAt: (typeof f.updatedAt === "object" && f.updatedAt?.integerValue ? parseInt(f.updatedAt.integerValue) : Date.now()),
      } as UserDocument;
    });

    const vendors = allUsers.filter(u => VENDOR_ROLES.has(u.role));
    const vendorIds = new Set(vendors.map(v => v.uid));

    // Fetch products via REST API and aggregate
    const productsResp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?pageSize=1000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!productsResp.ok) {
      const err = await productsResp.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || "Failed to load products" }, { status: 500 });
    }
    const productsData = await productsResp.json();

    interface FirestoreProductDocument {
      name: string;
      fields?: Record<string, { stringValue?: string; integerValue?: string; mapValue?: { fields?: Record<string, unknown> } } | string | number | Record<string, unknown>>;
    }

    // Helper function to extract string value from Firestore field
    const getStringValue = (field: unknown): string | undefined => {
      if (typeof field === "object" && field !== null && "stringValue" in field) {
        return (field as { stringValue?: string }).stringValue;
      }
      if (typeof field === "string") {
        return field;
      }
      return undefined;
    };

    // Helper function to extract integer value from Firestore field
    const getIntegerValue = (field: unknown): number | undefined => {
      if (typeof field === "object" && field !== null && "integerValue" in field) {
        const value = (field as { integerValue?: string }).integerValue;
        return value ? parseInt(value) : undefined;
      }
      if (typeof field === "number") {
        return field;
      }
      return undefined;
    };

    const products: ProductDocument[] = (productsData.documents || []).map((doc: FirestoreProductDocument) => {
      const f = doc.fields || {};
      return {
        productId: doc.name.split("/").pop() || "",
        orgId: getStringValue(f.orgId) || "",
        name: getStringValue(f.name) || "",
        description: getStringValue(f.description) || undefined,
        sku: getStringValue(f.sku) || "",
        category: getStringValue(f.category) || "other",
        imgUrl: getStringValue(f.imgUrl) || undefined,
        qrHash: getStringValue(f.qrHash) || "",
        qrDataUrl: getStringValue(f.qrDataUrl) || undefined,
        status: getStringValue(f.status) || "active",
        manufacturerId: getStringValue(f.manufacturerId) || "",
        manufacturerName: getStringValue(f.manufacturerName) || undefined,
        metadata: undefined,
        createdAt: getIntegerValue(f.createdAt) || Date.now(),
        updatedAt: getIntegerValue(f.updatedAt) || undefined,
      } as ProductDocument;
    });

    const vendorProducts = products.filter(p => vendorIds.has(p.manufacturerId));

    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.status === "active").length;
    const totalProducts = vendorProducts.length;
    // Placeholder: no rating field in users/products; return 0.0
    const avgRating = 0.0;

    // Basic details for list
    const vendorList = vendors.map(v => ({
      uid: v.uid,
      email: v.email,
      displayName: v.displayName,
      role: v.role,
      status: v.status,
      orgId: v.orgId,
      orgName: v.orgName,
      createdAt: v.createdAt,
      products: vendorProducts.filter(p => p.manufacturerId === v.uid).length,
      // Placeholder fields until ratings/returns are tracked per vendor
      rating: 0,
      returns: 0,
    }));

    return NextResponse.json({
      stats: {
        total: totalVendors,
        active: activeVendors,
        totalProducts,
        avgRating,
      },
      vendors: vendorList,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Vendors API] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}


