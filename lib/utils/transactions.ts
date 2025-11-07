/**
 * Transaction utilities for creating simulated blockchain-style transfer records
 * Note: This is a simulation - not a real blockchain network
 */

import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

/**
 * Get Firebase app - server-side compatible
 */
async function getFirebaseAppServer(): Promise<FirebaseApp | null> {
  try {
    // Try to get existing app first
    const { getApps } = await import("firebase/app");
    const apps = getApps();
    if (apps.length > 0) {
      return apps[0];
    }
    
    // Initialize new app
    const { initializeApp } = await import("firebase/app");
    const { firebaseConfig } = await import("@/lib/firebase/config");
    
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return null;
    }
    
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Error getting Firebase app:", error);
    return null;
  }
}

/**
 * Get the latest block number from transactions
 * Falls back to timestamp-based ordering if blockNumber index is not available
 */
async function getLatestBlockNumber(app?: FirebaseApp): Promise<number> {
  const firebaseApp = app || await getFirebaseAppServer();
  if (!firebaseApp) {
    return 1000; // Starting block number
  }

  try {
    const db = getFirestore(firebaseApp);
    const transactionsRef = collection(db, "transactions");
    
    // Try to get latest by blockNumber first
    try {
      const q = query(transactionsRef, orderBy("blockNumber", "desc"), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const latestTx = querySnapshot.docs[0]!.data();
        const blockNum = latestTx.blockNumber as number;
        if (blockNum && blockNum > 0) {
          return blockNum;
        }
      }
    } catch {
      // If blockNumber index doesn't exist, try by createdAt and find max blockNumber
      console.warn("BlockNumber index may not exist, falling back to createdAt ordering");
      const q = query(transactionsRef, orderBy("createdAt", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      
      let maxBlock = 1000;
      querySnapshot.docs.forEach((doc) => {
        const tx = doc.data();
        const blockNum = tx.blockNumber as number;
        if (blockNum && blockNum > maxBlock) {
          maxBlock = blockNum;
        }
      });
      
      return maxBlock;
    }

    return 1000; // Starting block number
  } catch (error) {
    console.error("Error fetching latest block number:", error);
    return 1000; // Fallback to starting block
  }
}

export type TransactionType = "PRODUCT_REGISTER" | "VERIFY" | "MOVEMENT" | "TRANSFER" | "QC_LOG";

export interface TransactionDocument {
  txHash: string;                    // Unique transaction hash
  type: TransactionType;              // Transaction type
  status: "pending" | "confirmed" | "failed";
  blockNumber?: number;               // Block number (simulated)
  refType: "product" | "movement" | "verification" | "batch";
  refId: string;                      // Reference ID (productId, movementId, etc.)
  orgId?: string;                     // Organization ID (optional)
  createdBy: string;                  // User ID who created the transaction
  payload?: Record<string, unknown>;  // Additional payload data
  createdAt: number;                  // Timestamp
  confirmedAt?: number;               // Confirmation timestamp
  // Common attributes for unique pair identification
  movementId?: string;                 // Movement ID (for MOVEMENT transactions) - links to movement
  productId?: string;                 // Product ID (for product-related transactions) - links to product
}

/**
 * Generate a unique transaction hash (browser-compatible)
 */
async function generateTransactionHash(
  type: TransactionType,
  refId: string,
  timestamp: number,
  orgId?: string
): Promise<string> {
  const data = `${type}:${refId}:${timestamp}:${orgId || "global"}`;
  
  // Use Web Crypto API for browser compatibility
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `0x${hashHex.substring(0, 40)}`; // Ethereum-style hash format
}

/**
 * Create an immutable PRODUCT_REGISTER transaction
 */
export async function createProductRegisterTransaction(
  productId: string,
  orgId: string | undefined,
  createdBy: string,
  payload?: Record<string, unknown>,
  app?: FirebaseApp
): Promise<TransactionDocument> {
  const firebaseApp = app || await getFirebaseAppServer();
  if (!firebaseApp) {
    throw new Error("Firebase app not initialized");
  }

  const db = getFirestore(firebaseApp);
  const timestamp = Date.now();

  // Generate transaction hash
  const txHash = await generateTransactionHash("PRODUCT_REGISTER", productId, timestamp, orgId);

  // Get latest block number and increment (sequential block numbers)
  const latestBlock = await getLatestBlockNumber(firebaseApp);
  const blockNumber = latestBlock + 1;

  const transaction: Omit<TransactionDocument, "txHash"> = {
    type: "PRODUCT_REGISTER",
    status: "confirmed", // In real blockchain, this would be pending initially
    blockNumber,
    refType: "product",
    refId: productId,
    ...(orgId ? { orgId } : {}),
    createdBy,
    payload: payload || {},
    createdAt: timestamp,
    confirmedAt: timestamp,
    // Common attributes for unique pair identification
    productId, // Direct link to product
  };

  try {
    // Add transaction to Firestore
    await addDoc(collection(db, "transactions"), {
      ...transaction,
      txHash, // Include hash in document
    });

    return {
      ...transaction,
      txHash,
    };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    throw new Error("Failed to create transaction");
  }
}

/**
 * Create a transaction for any type
 */
export async function createTransaction(
  type: TransactionType,
  refType: TransactionDocument["refType"],
  refId: string,
  orgId: string | undefined,
  createdBy: string,
  payload?: Record<string, unknown>,
  app?: FirebaseApp
): Promise<TransactionDocument> {
  const firebaseApp = app || await getFirebaseAppServer();
  if (!firebaseApp) {
    throw new Error("Firebase app not initialized");
  }

  const db = getFirestore(firebaseApp);
  const timestamp = Date.now();

  // Generate transaction hash
  const txHash = await generateTransactionHash(type, refId, timestamp, orgId);

  // Get latest block number and increment (sequential block numbers)
  const latestBlock = await getLatestBlockNumber(firebaseApp);
  const blockNumber = latestBlock + 1;

  // Extract common attributes from payload for unique pair identification
  const productId = payload?.productId as string | undefined;
  const movementId = refType === "movement" ? refId : undefined;

  const transaction: Omit<TransactionDocument, "txHash"> = {
    type,
    status: "confirmed",
    blockNumber,
    refType,
    refId,
    ...(orgId ? { orgId } : {}),
    createdBy,
    payload: payload || {},
    createdAt: timestamp,
    confirmedAt: timestamp,
    // Common attributes for unique pair identification (when available)
    ...(productId && { productId }),
    ...(movementId && { movementId }),
  };

  try {
    await addDoc(collection(db, "transactions"), {
      ...transaction,
      txHash,
    });

    return {
      ...transaction,
      txHash,
    };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    throw new Error("Failed to create transaction");
  }
}

/**
 * Create a MOVEMENT transaction for product movements/shipments
 */
export async function createMovementTransaction(
  movementId: string,
  orgId: string,
  createdBy: string,
  payload?: Record<string, unknown>,
  app?: FirebaseApp
): Promise<TransactionDocument> {
  const firebaseApp = app || await getFirebaseAppServer();
  if (!firebaseApp) {
    throw new Error("Firebase app not initialized");
  }

  const db = getFirestore(firebaseApp);
  const timestamp = Date.now();

  // Generate transaction hash
  const txHash = await generateTransactionHash("MOVEMENT", movementId, timestamp, orgId);

  // Get latest block number and increment (sequential block numbers)
  const latestBlock = await getLatestBlockNumber(firebaseApp);
  const blockNumber = latestBlock + 1;

  // Extract productId from payload for common attribute linkage
  const productId = payload?.productId as string | undefined;

  const transaction: Omit<TransactionDocument, "txHash"> = {
    type: "MOVEMENT",
    status: "confirmed",
    blockNumber,
    refType: "movement",
    refId: movementId,
    orgId,
    createdBy,
    payload: payload || {},
    createdAt: timestamp,
    confirmedAt: timestamp,
    // Common attributes for unique pair identification with movements
    movementId, // Direct link to movement document
    productId, // Direct link to product (extracted from payload)
  };

  try {
    await addDoc(collection(db, "transactions"), {
      ...transaction,
      txHash,
    });

    return {
      ...transaction,
      txHash,
    };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    throw new Error("Failed to create transaction");
  }
}

/**
 * Get transaction by hash
 */
export async function getTransaction(txHash: string, app?: FirebaseApp): Promise<TransactionDocument | null> {
  const firebaseApp = app || await getFirebaseAppServer();
  if (!firebaseApp) {
    return null;
  }

  const db = getFirestore(firebaseApp);
  const { collection: getCollection, query, where, getDocs } = await import("firebase/firestore");
  
  try {
    const transactionsRef = getCollection(db, "transactions");
    const q = query(transactionsRef, where("txHash", "==", txHash));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    return querySnapshot.docs[0]!.data() as TransactionDocument;
  } catch (error) {
    console.error("Failed to get transaction:", error);
    return null;
  }
}

