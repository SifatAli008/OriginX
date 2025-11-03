/**
 * Firestore utilities for blockchain transactions
 */

"use client";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { getFirestore } from "./client";
import type { TransactionDocument, TransactionType } from "@/lib/utils/transactions";

export interface TransactionFilters {
  type?: TransactionType;
  refType?: TransactionDocument["refType"];
  refId?: string;
  orgId?: string;
  createdBy?: string;
  productId?: string; // Search by productId in payload
  status?: "pending" | "confirmed" | "failed";
  page?: number;
  pageSize?: number;
  startDate?: number;
  endDate?: number;
}

export interface TransactionListResponse {
  items: TransactionDocument[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Get transactions with filters and pagination
 */
export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  const db = getFirestore();
  if (!db) {
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
  }

  const {
    type,
    refType,
    refId,
    orgId,
    createdBy,
    status,
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
  } = filters;

  const transactionsRef = collection(db, "transactions");
  let q = query(transactionsRef);

  // Apply filters
  if (type) {
    q = query(q, where("type", "==", type));
  }
  if (refType) {
    q = query(q, where("refType", "==", refType));
  }
  if (refId) {
    q = query(q, where("refId", "==", refId));
  }
  if (orgId) {
    q = query(q, where("orgId", "==", orgId));
  }
  if (createdBy) {
    q = query(q, where("createdBy", "==", createdBy));
  }
  if (status) {
    q = query(q, where("status", "==", status));
  }
  if (startDate) {
    q = query(q, where("createdAt", ">=", startDate));
  }
  if (endDate) {
    q = query(q, where("createdAt", "<=", endDate));
  }

  // Order by creation date (newest first)
  q = query(q, orderBy("createdAt", "desc"));

  // Pagination
  const pageLimit = pageSize;
  q = query(q, limit(pageLimit));

  try {
    const querySnapshot = await getDocs(q);
    let items = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
    })) as TransactionDocument[];

    // Filter by productId in payload if provided (client-side since payload is nested)
    if (filters.productId) {
      items = items.filter(
        (tx) => (tx.payload as any)?.productId === filters.productId
      );
    }

    // Get total count (approximate)
    const totalSnapshot = await getDocs(collection(db, "transactions"));
    const total = totalSnapshot.size;

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: items.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
  }
}

/**
 * Get transaction by hash
 */
export async function getTransactionByHash(
  txHash: string
): Promise<TransactionDocument | null> {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  try {
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef, where("txHash", "==", txHash));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0]!.data() as TransactionDocument;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }
}

/**
 * Get transactions by reference ID
 */
export async function getTransactionsByRef(
  refType: TransactionDocument["refType"],
  refId: string
): Promise<TransactionDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  try {
    const transactionsRef = collection(db, "transactions");
    const q = query(
      transactionsRef,
      where("refType", "==", refType),
      where("refId", "==", refId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => doc.data() as TransactionDocument);
  } catch (error) {
    console.error("Error fetching transactions by ref:", error);
    return [];
  }
}

/**
 * Get transactions by organization
 */
export async function getTransactionsByOrg(
  orgId: string,
  limitCount?: number
): Promise<TransactionDocument[]> {
  const db = getFirestore();
  if (!db) {
    return [];
  }

  try {
    const transactionsRef = collection(db, "transactions");
    let q = query(
      transactionsRef,
      where("orgId", "==", orgId),
      orderBy("createdAt", "desc")
    );

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as TransactionDocument);
  } catch (error) {
    console.error("Error fetching transactions by org:", error);
    return [];
  }
}

/**
 * Get latest block number
 */
export async function getLatestBlockNumber(): Promise<number> {
  const db = getFirestore();
  if (!db) {
    return 1000;
  }

  try {
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef, orderBy("blockNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return 1000; // Starting block number
    }

    const latestTx = querySnapshot.docs[0]!.data() as TransactionDocument;
    return latestTx.blockNumber || 1000;
  } catch (error) {
    console.error("Error fetching latest block number:", error);
    return 1000;
  }
}

