"use client";

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirestore } from "./client";
import type {
  ProductDocument,
  ProductFilters,
  ProductListResponse,
  BatchDocument,
} from "@/lib/types/products";

/**
 * Create a new product in Firestore
 */
export async function createProduct(
  productData: Omit<ProductDocument, "productId" | "createdAt">
): Promise<string> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const productsRef = collection(db, "products");
  const docRef = await addDoc(productsRef, {
    ...productData,
    createdAt: Date.now(),
  });

  return docRef.id;
}

/**
 * Get a single product by ID
 */
export async function getProduct(productId: string): Promise<ProductDocument | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  const productRef = doc(db, "products", productId);
  const productSnap = await getDoc(productRef);

  if (!productSnap.exists()) {
    return null;
  }

  return {
    productId: productSnap.id,
    ...productSnap.data(),
  } as ProductDocument;
}

/**
 * Get products with filters and pagination
 */
export async function getProducts(
  filters: ProductFilters = {}
): Promise<ProductListResponse> {
  const db = getFirestore();
  if (!db) {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
  }

  const {
    category,
    status,
    search,
    manufacturerId,
    orgId,
    batchId,
    page = 1,
    pageSize = 20,
  } = filters;

  const productsRef = collection(db, "products");
  let q = query(productsRef);

  // Apply filters
  if (orgId) {
    q = query(q, where("orgId", "==", orgId));
  }
  if (category) {
    q = query(q, where("category", "==", category));
  }
  if (status) {
    q = query(q, where("status", "==", status));
  }
  if (manufacturerId) {
    q = query(q, where("manufacturerId", "==", manufacturerId));
  }
  if (batchId) {
    q = query(q, where("batchId", "==", batchId));
  }

  // Order by creation date (newest first)
  q = query(q, orderBy("createdAt", "desc"));

  // Pagination
  const pageLimit = pageSize;
  q = query(q, limit(pageLimit));

  const querySnapshot = await getDocs(q);
  let items = querySnapshot.docs.map((doc) => ({
    productId: doc.id,
    ...doc.data(),
  })) as ProductDocument[];

  // Client-side search filtering (if search term provided)
  if (search) {
    const searchLower = search.toLowerCase();
    items = items.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
    );
  }

  // Get total count (approximate, since we can't easily count with filters)
  const totalSnapshot = await getDocs(collection(db, "products"));
  const total = totalSnapshot.size;

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: items.length === pageSize, // Simple check, not perfect
  };
}

/**
 * Get products by organization
 */
export async function getProductsByOrg(orgId: string): Promise<ProductDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const productsRef = collection(db, "products");
  const q = query(productsRef, where("orgId", "==", orgId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    productId: doc.id,
    ...doc.data(),
  })) as ProductDocument[];
}

/**
 * Get products by batch
 */
export async function getProductsByBatch(batchId: string): Promise<ProductDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const productsRef = collection(db, "products");
  const q = query(productsRef, where("batchId", "==", batchId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    productId: doc.id,
    ...doc.data(),
  })) as ProductDocument[];
}

/**
 * Create a batch document
 */
export async function createBatch(batchData: Omit<BatchDocument, "batchId" | "createdAt">): Promise<string> {
  const db = getFirestore();
  if (!db) {
    throw new Error("Firestore is not initialized");
  }

  const batchesRef = collection(db, "batches");
  const docRef = await addDoc(batchesRef, {
    ...batchData,
    createdAt: Date.now(),
  });

  return docRef.id;
}

/**
 * Get a batch by ID
 */
export async function getBatch(batchId: string): Promise<BatchDocument | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  const batchRef = doc(db, "batches", batchId);
  const batchSnap = await getDoc(batchRef);

  if (!batchSnap.exists()) {
    return null;
  }

  return {
    batchId: batchSnap.id,
    ...batchSnap.data(),
  } as BatchDocument;
}

/**
 * Get batches by organization
 */
export async function getBatchesByOrg(orgId: string): Promise<BatchDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  const batchesRef = collection(db, "batches");
  const q = query(batchesRef, where("orgId", "==", orgId), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    batchId: doc.id,
    ...doc.data(),
  })) as BatchDocument[];
}

