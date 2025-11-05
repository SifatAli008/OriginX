// Initialize Firebase Admin SDK for server-side operations
// Uses Application Default Credentials or a base64-encoded service account JSON

import type { App } from 'firebase-admin/app';
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

function initAdminApp(): App {
	if (adminApp) return adminApp;
	const existing = getApps();
	if (existing.length > 0) {
		adminApp = existing[0]!;
		return adminApp;
	}

	// Prefer GOOGLE_APPLICATION_CREDENTIALS / ADC
	try {
		adminApp = initializeApp({
			credential: applicationDefault(),
		});
		return adminApp;
	} catch (_) {
		// Fallback to SERVICE_ACCOUNT (base64 JSON) if provided
		const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
		if (!serviceAccountB64) {
			// Last resort: init without explicit credentials (may work on GCP)
			adminApp = initializeApp();
			return adminApp;
		}
		const jsonString = Buffer.from(serviceAccountB64, 'base64').toString('utf8');
		const json = JSON.parse(jsonString);
		adminApp = initializeApp({
			credential: cert(json),
		});
		return adminApp;
	}
}

export function getAdminFirestore() {
	const app = initAdminApp();
	return getFirestore(app);
}
