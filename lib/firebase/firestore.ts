"use client";

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc
} from "firebase/firestore";
import { getFirestore } from "./client";
import type { UserDocument, UserRole, UserStatus } from "@/lib/types/user";

/**
 * Create or update user document in Firestore
 */
export async function createOrUpdateUserDocument(
  uid: string,
  data: Partial<UserDocument>
): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const userRef = doc(db, "users", uid);
  const existingDoc = await getDoc(userRef);

  const userData: Partial<UserDocument> = {
    ...data,
    uid,
    updatedAt: Date.now(),
  };

  if (!existingDoc.exists()) {
    // Create new document
    await setDoc(userRef, {
      ...userData,
      createdAt: Date.now(),
      status: (data.status as UserStatus) || "active",
      role: data.role || "sme",
      mfaEnabled: data.mfaEnabled || false,
    });
  } else {
    // Update existing document
    await updateDoc(userRef, userData);
  }
}

/**
 * Get user document from Firestore
 */
export async function getUserDocument(uid: string): Promise<UserDocument | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as UserDocument;
}

/**
 * Get user document by email
 */
export async function getUserDocumentByEmail(email: string): Promise<UserDocument | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  return querySnapshot.docs[0]!.data() as UserDocument;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    role,
    roleSelectedAt: Date.now(), // Track when role was explicitly selected
    updatedAt: Date.now(),
  });
}

/**
 * Update user status (admin only)
 */
export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    status,
    updatedAt: Date.now(),
  });
}

/**
 * Update MFA configuration
 */
export async function updateMFAConfig(
  uid: string,
  mfaEnabled: boolean,
  mfaConfig?: Partial<UserDocument["mfaConfig"]>
): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    mfaEnabled,
    mfaConfig: mfaConfig || {},
    updatedAt: Date.now(),
  });
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(uid: string): Promise<void> {
  const db = getFirestore();
  if (!db) {
    return;
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    lastLoginAt: Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const usersRef = collection(db, "users");
  const querySnapshot = await getDocs(usersRef);
  
  return querySnapshot.docs.map(doc => doc.data() as UserDocument);
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<UserDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("role", "==", role));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => doc.data() as UserDocument);
}

/**
 * Get users by organization
 */
export async function getUsersByOrg(orgId: string): Promise<UserDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("orgId", "==", orgId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => doc.data() as UserDocument);
}

/**
 * Create admin user with default credentials
 * This should be called once during initial setup
 */
export async function ensureAdminUser(): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  // Check if admin user document exists
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", "admin@originx.com"));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    // Admin user document will be created when they first login
    // This is just a placeholder check
    console.log("Admin user document will be created on first login");
  }
}

/**
 * Invite a user by email (admin only)
 * Creates an invitation record that the user can access after signing in with Google
 */
export async function inviteUser(
  email: string,
  role: UserRole,
  orgId: string | null,
  orgName?: string
): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  // Check if user already exists by email
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    throw new Error("User with this email already exists");
  }

  // Create invitation document in a separate collection
  // When user signs in, we'll check this collection and create their user document
  const invitationsRef = collection(db, "userInvitations");
  await addDoc(invitationsRef, {
    email,
    role,
    orgId,
    orgName,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Link Google authenticated user to existing invitation
 */
export async function linkUserToInvitation(
  uid: string,
  email: string
): Promise<UserDocument | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  // Find invitation by email
  const invitationsRef = collection(db, "userInvitations");
  const invitationQuery = query(invitationsRef, where("email", "==", email), where("status", "==", "pending"));
  const invitationSnapshot = await getDocs(invitationQuery);
  
  if (invitationSnapshot.empty) {
    return null;
  }

  const invitationDoc = invitationSnapshot.docs[0];
  const invitationData = invitationDoc.data();

  // Create user document with invitation data
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    uid,
    email,
    displayName: null,
    photoURL: null,
    role: invitationData.role,
    orgId: invitationData.orgId || null,
    orgName: invitationData.orgName || undefined,
    status: "active",
    mfaEnabled: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Mark invitation as used
  await updateDoc(doc(db, "userInvitations", invitationDoc.id), {
    status: "accepted",
    acceptedAt: Date.now(),
    acceptedBy: uid,
  });

  return {
    uid,
    email,
    displayName: null,
    photoURL: null,
    role: invitationData.role,
    orgId: invitationData.orgId || null,
    orgName: invitationData.orgName,
    status: "active",
    mfaEnabled: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as UserDocument;
}

