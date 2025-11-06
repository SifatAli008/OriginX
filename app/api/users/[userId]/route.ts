/**
 * API Route: Individual User Management
 * PUT /api/users/[userId] - Update user (admin only)
 * DELETE /api/users/[userId] - Delete user (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/verify-token";
import type { UserDocument } from "@/lib/types/user";
/**
 * GET /api/users/[userId]
 * Get user details (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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
    const adminInfo = await verifyAdminAccess(token);
    if (!adminInfo) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { firebaseConfig } = await import("@/lib/firebase/config");
    if (!firebaseConfig.projectId) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 500 });
    }
    const projectId = firebaseConfig.projectId;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;
    const resp = await fetch(firestoreUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!resp.ok) {
      if (resp.status === 404) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const err = await resp.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || "Failed to load user" }, { status: 500 });
    }
    const doc = await resp.json();
    const f = doc.fields || {};
    const user: UserDocument = {
      uid: userId,
      email: f.email?.stringValue || f.email || "",
      displayName: f.displayName?.stringValue ?? f.displayName ?? null,
      photoURL: f.photoURL?.stringValue ?? f.photoURL ?? null,
      role: f.role?.stringValue || f.role || "sme",
      orgId: f.orgId?.stringValue ?? f.orgId ?? null,
      orgName: f.orgName?.stringValue ?? f.orgName ?? undefined,
      mfaEnabled: !!(f.mfaEnabled?.booleanValue ?? f.mfaEnabled ?? false),
      status: f.status?.stringValue || f.status || "pending",
      createdAt: f.createdAt?.integerValue ? parseInt(f.createdAt.integerValue) : Date.now(),
      updatedAt: f.updatedAt?.integerValue ? parseInt(f.updatedAt.integerValue) : Date.now(),
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}


/**
 * Helper to verify admin access
 */
async function verifyAdminAccess(token: string): Promise<{ uid: string; email: string } | null> {
  const decodedToken = await verifyIdToken(token);
  if (!decodedToken || !decodedToken.uid) {
    return null;
  }

  const uid = decodedToken.uid;
  const userEmail = decodedToken.email || 'unknown';
  const isAdminEmail = userEmail.toLowerCase() === "admin@originx.com";

  let userDoc: UserDocument | null = null;
  try {
    const { getUserDocumentServer } = await import("@/lib/firebase/firestore-server");
    userDoc = await getUserDocumentServer(uid, userEmail);
  } catch (error) {
    if (isAdminEmail) {
      // Allow admin email even if document fetch fails
      return { uid, email: userEmail };
    }
    return null;
  }

  if (!userDoc && isAdminEmail) {
    return { uid, email: userEmail };
  }

  if (!userDoc || userDoc.role !== "admin") {
    return null;
  }

  return { uid, email: userEmail };
}

/**
 * PUT /api/users/[userId]
 * Update user information (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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
    const adminInfo = await verifyAdminAccess(token);
    if (!adminInfo) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Await params in Next.js 16 App Router
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { role, status, displayName, orgId, orgName } = body;

    // Validate allowed fields
    const allowedFields: Partial<UserDocument> = {};
    if (role !== undefined) {
      const validRoles = ["admin", "sme", "company"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
      allowedFields.role = role;
    }

    if (status !== undefined) {
      const validStatuses = ["active", "inactive", "suspended", "pending"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      allowedFields.status = status;
    }

    if (displayName !== undefined) {
      allowedFields.displayName = displayName;
    }

    if (orgId !== undefined) {
      allowedFields.orgId = orgId;
    }

    if (orgName !== undefined) {
      allowedFields.orgName = orgName;
    }

    // Always update updatedAt
    allowedFields.updatedAt = Date.now();

    // Use Firestore REST API to update user
    const { firebaseConfig } = await import("@/lib/firebase/config");
    if (!firebaseConfig.projectId) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const projectId = firebaseConfig.projectId;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;

    // First, get the current user document to merge updates
    const getResponse = await fetch(firestoreUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getResponse.ok) {
      if (getResponse.status === 404) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const errorData = await getResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to fetch user: ${getResponse.status}`);
    }

    const currentDoc = await getResponse.json();
    const currentFields = currentDoc.fields || {};

    // Convert UserDocument fields to Firestore REST API format
    const updateFields: Record<string, unknown> = {};
    
    // Update only the fields that were provided
    if (role !== undefined) {
      updateFields.role = { stringValue: role };
    }
    if (status !== undefined) {
      updateFields.status = { stringValue: status };
    }
    if (displayName !== undefined) {
      updateFields.displayName = displayName === null 
        ? { nullValue: null }
        : { stringValue: displayName };
    }
    if (orgId !== undefined) {
      updateFields.orgId = orgId === null 
        ? { nullValue: null }
        : { stringValue: orgId };
    }
    if (orgName !== undefined) {
      updateFields.orgName = orgName === undefined || orgName === null
        ? { nullValue: null }
        : { stringValue: orgName };
    }
    
    // Always update updatedAt
    updateFields.updatedAt = { integerValue: Date.now().toString() };

    // Merge with existing fields
    const mergedFields = {
      ...currentFields,
      ...updateFields,
    };

    // Update user document
    const updateResponse = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: mergedFields,
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      console.error("[Users API] Update error:", errorData);
      throw new Error(errorData.error?.message || `Failed to update user: ${updateResponse.status}`);
    }

    const updatedDoc = await updateResponse.json();
    
    // Convert back to UserDocument format
    const updatedFields = updatedDoc.fields;
    const updatedUser: UserDocument = {
      uid: userId,
      email: updatedFields.email?.stringValue || updatedFields.email || '',
      displayName: updatedFields.displayName?.stringValue || updatedFields.displayName || null,
      photoURL: updatedFields.photoURL?.stringValue || updatedFields.photoURL || null,
      role: updatedFields.role?.stringValue || updatedFields.role || 'sme',
      orgId: updatedFields.orgId?.stringValue || updatedFields.orgId || null,
      orgName: updatedFields.orgName?.stringValue || updatedFields.orgName || undefined,
      mfaEnabled: updatedFields.mfaEnabled?.booleanValue || updatedFields.mfaEnabled || false,
      status: updatedFields.status?.stringValue || updatedFields.status || 'pending',
      createdAt: updatedFields.createdAt?.integerValue ? parseInt(updatedFields.createdAt.integerValue) : updatedFields.createdAt || Date.now(),
      updatedAt: updatedFields.updatedAt?.integerValue ? parseInt(updatedFields.updatedAt.integerValue) : updatedFields.updatedAt || Date.now(),
    };

    return NextResponse.json({
      success: true,
      user: updatedUser,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("[Users API] Update user error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[userId]
 * Delete user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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
    const adminInfo = await verifyAdminAccess(token);
    if (!adminInfo) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Await params in Next.js 16 App Router
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === adminInfo.uid) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Use Firestore REST API to delete user
    const { firebaseConfig } = await import("@/lib/firebase/config");
    if (!firebaseConfig.projectId) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const projectId = firebaseConfig.projectId;
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`;

    // Delete user document
    const deleteResponse = await fetch(firestoreUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      if (deleteResponse.status === 404) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const errorData = await deleteResponse.json().catch(() => ({}));
      console.error("[Users API] Delete error:", errorData);
      throw new Error(errorData.error?.message || `Failed to delete user: ${deleteResponse.status}`);
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("[Users API] Delete user error:", error);
    const errorObj = error instanceof Error ? error : { message: String(error) };
    return NextResponse.json(
      { 
        error: errorObj instanceof Error ? errorObj.message : String(errorObj),
        details: process.env.NODE_ENV === 'development' ? (errorObj instanceof Error ? errorObj.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
}

