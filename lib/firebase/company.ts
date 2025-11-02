"use client";

import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
} from "firebase/firestore";
import { getFirestore } from "./client";
import type { CompanyRegistrationRequest } from "@/lib/types/company";

/**
 * Create a company registration request
 */
export async function createCompanyRegistrationRequest(
  userId: string,
  userEmail: string,
  userName: string | undefined,
  companyData: {
    companyName: string;
    companyType?: string;
    description?: string;
    address?: string;
    phone?: string;
  }
): Promise<string> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const requestsRef = collection(db, "companyRegistrationRequests");
  const requestData: Omit<CompanyRegistrationRequest, "requestId"> = {
    userId,
    userEmail,
    userName,
    ...companyData,
    status: "pending",
    requestedAt: Date.now(),
  };

  const docRef = await addDoc(requestsRef, requestData);
  return docRef.id;
}

/**
 * Get a registration request by ID
 */
export async function getRegistrationRequest(requestId: string): Promise<CompanyRegistrationRequest | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  const requestRef = doc(db, "companyRegistrationRequests", requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    return null;
  }

  return {
    requestId: requestSnap.id,
    ...requestSnap.data(),
  } as CompanyRegistrationRequest;
}

/**
 * Get all pending registration requests (admin only)
 */
export async function getPendingRegistrationRequests(): Promise<CompanyRegistrationRequest[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const requestsRef = collection(db, "companyRegistrationRequests");
  const q = query(requestsRef, where("status", "==", "pending"));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    requestId: doc.id,
    ...doc.data(),
  } as CompanyRegistrationRequest));
}

/**
 * Get registration requests by user ID
 */
export async function getRegistrationRequestsByUser(userId: string): Promise<CompanyRegistrationRequest[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const requestsRef = collection(db, "companyRegistrationRequests");
  const q = query(requestsRef, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    requestId: doc.id,
    ...doc.data(),
  } as CompanyRegistrationRequest));
}

/**
 * Approve a registration request (admin only)
 */
export async function approveRegistrationRequest(
  requestId: string,
  adminId: string,
  orgId: string
): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const requestRef = doc(db, "companyRegistrationRequests", requestId);
  await updateDoc(requestRef, {
    status: "approved",
    reviewedAt: Date.now(),
    reviewedBy: adminId,
    orgId,
  });
}

/**
 * Reject a registration request (admin only)
 */
export async function rejectRegistrationRequest(
  requestId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const requestRef = doc(db, "companyRegistrationRequests", requestId);
  await updateDoc(requestRef, {
    status: "rejected",
    reviewedAt: Date.now(),
    reviewedBy: adminId,
    rejectionReason: reason || "No reason provided",
  });
}

/**
 * Create an organization
 */
export async function createOrganization(
  orgData: {
    name: string;
    type?: string;
    description?: string;
    address?: string;
    phone?: string;
  }
): Promise<string> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const orgsRef = collection(db, "orgs");
  const orgDoc = await addDoc(orgsRef, {
    ...orgData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return orgDoc.id;
}

/**
 * Get all organizations (admin only)
 */
export async function getAllOrganizations(): Promise<Array<{ id: string; name: string; type?: string }>> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const orgsRef = collection(db, "orgs");
  const querySnapshot = await getDocs(orgsRef);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    type: doc.data().type,
  }));
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<{ id: string; name: string; [key: string]: unknown } | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  const orgRef = doc(db, "orgs", orgId);
  const orgSnap = await getDoc(orgRef);
  
  if (!orgSnap.exists()) {
    return null;
  }

  const data = orgSnap.data();
  return {
    id: orgSnap.id,
    name: data?.name || "",
    ...data,
  };
}

