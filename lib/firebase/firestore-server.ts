/**
 * Server-side Firestore utilities
 * These functions work in API routes and server components
 */

import type { UserDocument } from "@/lib/types/user";
import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * Get user document from Firestore (server-side)
 * This version works in API routes
 */
export async function getUserDocumentServer(uid: string, email?: string): Promise<UserDocument | null> {
	// Handle hardcoded test user (ONLY IN DEVELOPMENT)
	if (process.env.NODE_ENV === 'development' && uid === 'test-user-123') {
		console.warn('⚠️ Using hardcoded test user - NOT FOR PRODUCTION');
		return {
			uid: 'test-user-123',
			email: 'test@originx.com',
			displayName: 'Test User',
			photoURL: null,
			role: 'admin',
			orgId: 'test-org-123',
			orgName: 'Test Organization',
			mfaEnabled: false,
			status: 'active',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
	}

	try {
		const db = getAdminFirestore();
		const userRef = db.collection('users').doc(uid);
		const userSnap = await userRef.get();

    if (userSnap.exists) {
			const data = userSnap.data() as UserDocument;
			console.log(`[Firestore Server] Found user document for ${uid}, role: ${data.role}`);
			return data;
		}

		console.log(`[Firestore Server] User document not found for ${uid}, email: ${email || 'N/A'}`);

		// If user document doesn't exist and we have email, try to create a basic one
		// This handles cases where user authenticated but document wasn't created yet
		if (email) {
      const isAdmin = email.toLowerCase() === "admin@originx.com";
			const basicUserDoc: UserDocument = {
				uid,
				email,
				displayName: null,
				photoURL: null,
				role: isAdmin ? "admin" : "sme",
				mfaEnabled: false,
				status: isAdmin ? "active" : "pending",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			try {
				await userRef.set(basicUserDoc, { merge: false });
				console.log(`[Firestore Server] Created user document for ${uid} with role: ${basicUserDoc.role}`);
				return basicUserDoc;
			} catch (createError) {
				const errorMsg = createError instanceof Error ? createError.message : String(createError);
				console.error(`[Firestore Server] Could not auto-create user document for ${uid}:`, errorMsg);
				console.error(`[Firestore Server] Full error:`, createError);
				// Don't return null immediately - check if it's a Firebase Admin error
				if (errorMsg.includes('not installed') || 
						errorMsg.includes('Cannot find module') || 
						errorMsg.includes('Could not load the default credentials') ||
						errorMsg.includes('credentials') ||
						errorMsg.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
					console.error(`[Firestore Server] Firebase Admin SDK not properly configured. Please set FIREBASE_SERVICE_ACCOUNT_BASE64 in Vercel environment variables.`);
				}
				return null;
			}
		}

		console.warn(`[Firestore Server] User document not found for ${uid} and no email provided`);
		return null;
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		console.error("[Firestore Server] Error getting user document:", errorMsg);
		console.error("[Firestore Server] Full error:", error);
		
		// Check if it's a Firebase Admin configuration error
		if (errorMsg.includes('not installed') || 
				errorMsg.includes('Cannot find module') || 
				errorMsg.includes('Could not load the default credentials') ||
				errorMsg.includes('credentials') ||
				errorMsg.includes('FIREBASE_SERVICE_ACCOUNT_BASE64')) {
			console.error(`[Firestore Server] Firebase Admin SDK not properly configured. Please set FIREBASE_SERVICE_ACCOUNT_BASE64 in Vercel environment variables.`);
		}
		
		return null;
	}
}

