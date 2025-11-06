// Initialize Firebase Admin SDK for server-side operations
// Uses Application Default Credentials or a base64-encoded service account JSON

// Note: Avoid static imports of firebase-admin to prevent build-time resolution in edge/client bundles
// We require it lazily at runtime inside Node.js only.

// Force load environment variables from .env.local if needed (for Next.js)
if (typeof process !== 'undefined' && process.env && !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
	try {
		// Try to load dotenv if available (for development)
		const fs = require('fs');
		const path = require('path');
		const envPath = path.join(process.cwd(), '.env.local');
		if (fs.existsSync(envPath)) {
			const envContent = fs.readFileSync(envPath, 'utf8');
			const lines = envContent.split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
					const [key, ...valueParts] = trimmed.split('=');
					const value = valueParts.join('=').trim();
					if (key && value && !process.env[key]) {
						process.env[key] = value;
					}
				}
			}
		}
	} catch (e) {
		// Ignore errors - Next.js should handle env loading
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminApp: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function initAdminApp(): any {
	if (adminApp) return adminApp;

	// Lazy require firebase-admin modules
	let adminAppModule: any;
	try {
		// Use eval('require') to prevent bundlers from resolving at build time
		// eslint-disable-next-line no-eval
		const req = eval('require');
		adminAppModule = req('firebase-admin/app');
	} catch (_e) {
		throw new Error("firebase-admin is not installed. Please add 'firebase-admin' to your dependencies for server routes that need it.");
	}

	const { getApps, initializeApp, applicationDefault, cert } = adminAppModule;

	const existing = getApps();
	if (existing.length > 0) {
		adminApp = existing[0]!;
		return adminApp;
	}

	// Get project ID from environment or config
	const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
	
	if (!projectId) {
		throw new Error(
			"Firebase Project ID is not configured. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable."
		);
	}

	// Check for service account first (preferred for local dev)
	// Try multiple ways to access the env variable (Next.js sometimes needs explicit access)
	let serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
	
	// If not found, try reloading from file (Next.js might not have loaded it)
	if (!serviceAccountB64) {
		try {
			const fs = require('fs');
			const path = require('path');
			const envPath = path.join(process.cwd(), '.env.local');
			if (fs.existsSync(envPath)) {
				const envContent = fs.readFileSync(envPath, 'utf8');
				const lines = envContent.split(/\r?\n/);
				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith('FIREBASE_SERVICE_ACCOUNT_BASE64=')) {
						const equalsIndex = trimmed.indexOf('=');
						if (equalsIndex !== -1) {
							serviceAccountB64 = trimmed.substring(equalsIndex + 1).trim();
							// Remove any quotes if present
							serviceAccountB64 = serviceAccountB64.replace(/^["']|["']$/g, '');
							// Set it in process.env for future use
							process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = serviceAccountB64;
							break;
						}
					}
				}
			}
		} catch (e) {
			console.error('[Firebase Admin] Error loading from .env.local:', e);
		}
	}
	
	// Debug: Log if service account is found (without exposing the full value)
	console.log('[Firebase Admin] Checking credentials...');
	console.log('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_BASE64 exists:', !!serviceAccountB64);
	console.log('[Firebase Admin] Service account length:', serviceAccountB64 ? serviceAccountB64.length : 0);
	if (!serviceAccountB64) {
		console.warn('[Firebase Admin] Service account not found! Checking .env.local...');
		const fs = require('fs');
		const path = require('path');
		const envPath = path.join(process.cwd(), '.env.local');
		if (fs.existsSync(envPath)) {
			console.log('[Firebase Admin] .env.local exists at:', envPath);
			const envContent = fs.readFileSync(envPath, 'utf8');
			const hasVar = envContent.includes('FIREBASE_SERVICE_ACCOUNT_BASE64');
			console.log('[Firebase Admin] .env.local contains FIREBASE_SERVICE_ACCOUNT_BASE64:', hasVar);
		} else {
			console.error('[Firebase Admin] .env.local NOT FOUND at:', envPath);
		}
	}
	
	if (serviceAccountB64) {
		// Use service account from environment variable
		try {
			const jsonString = Buffer.from(serviceAccountB64, 'base64').toString('utf8');
			const json = JSON.parse(jsonString);
			
			// Validate required fields
			if (!json.project_id || !json.private_key || !json.client_email) {
				throw new Error('Service account JSON is missing required fields (project_id, private_key, or client_email)');
			}
			
			// Fix private key: replace literal \n with actual newlines (PEM format requires actual newlines)
			if (json.private_key && typeof json.private_key === 'string') {
				// Replace literal \n (backslash-n) with actual newlines
				// This is necessary because JSON.stringify converts actual newlines to \n escape sequences
				json.private_key = json.private_key.replace(/\\n/g, '\n');
				
				// Verify the key format is correct
				if (!json.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
					throw new Error('Private key does not start with -----BEGIN PRIVATE KEY-----');
				}
				if (!json.private_key.includes('-----END PRIVATE KEY-----')) {
					throw new Error('Private key does not contain -----END PRIVATE KEY-----');
				}
				if (!json.private_key.includes('\n')) {
					throw new Error('Private key does not contain newlines after replacement');
				}
			}
			
			adminApp = initializeApp({
				credential: cert(json),
				projectId: projectId || json.project_id,
			});
			
			console.log('[Firebase Admin] Initialized with service account:', json.client_email);
			return adminApp;
		} catch (certError) {
			const errorMsg = certError instanceof Error ? certError.message : String(certError);
			console.error('[Firebase Admin] Service account initialization failed:', errorMsg);
			console.error('[Firebase Admin] Full error:', certError);
			// Don't fall through - throw immediately so we know the service account failed
			throw new Error(
				`Failed to initialize Firebase Admin with service account: ${errorMsg}. ` +
				`Please check that FIREBASE_SERVICE_ACCOUNT_BASE64 contains valid base64-encoded JSON. ` +
				`Error details: ${errorMsg}`
			);
		}
	} else {
		console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_BASE64 not found, trying other methods...');
		console.warn('[Firebase Admin] This will likely fail unless GOOGLE_APPLICATION_CREDENTIALS is set.');
	}

	// Fallback to GOOGLE_APPLICATION_CREDENTIALS / ADC if service account not provided
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
		try {
			adminApp = initializeApp({
				credential: applicationDefault(),
				projectId: projectId,
			});
			return adminApp;
		} catch (adcError) {
			const errorMsg = adcError instanceof Error ? adcError.message : String(adcError);
			throw new Error(
				`Failed to initialize Firebase Admin with Application Default Credentials: ${errorMsg}. ` +
				`Please check your GOOGLE_APPLICATION_CREDENTIALS environment variable.`
			);
		}
	}

	// Last resort: try without credentials (may work with Firebase emulator)
	try {
		adminApp = initializeApp({
			projectId: projectId,
		});
		return adminApp;
	} catch (initError) {
		const errorMsg = initError instanceof Error ? initError.message : String(initError);
		throw new Error(
			`Firebase Admin initialization failed: ${errorMsg}. ` +
			`Please set up Firebase credentials by either: ` +
			`1) Setting FIREBASE_SERVICE_ACCOUNT_BASE64 with base64-encoded service account JSON (recommended), ` +
			`2) Setting GOOGLE_APPLICATION_CREDENTIALS environment variable, or ` +
			`3) Using Firebase emulator for local development.`
		);
	}
}

export function getAdminFirestore() {
	const app = initAdminApp();
	if (!app) {
		throw new Error('Firebase Admin app not initialized');
	}
	// Lazy require main firebase-admin to avoid subpath resolution issues
	// eslint-disable-next-line no-eval
	const req = eval('require');
	const admin = req('firebase-admin');
	// Use legacy accessor which binds to the default app initialized above
	const firestore = admin.firestore();
	
	// Verify Firestore is properly initialized
	if (!firestore) {
		throw new Error('Failed to get Firestore instance from Firebase Admin');
	}
	
	return firestore;
}
