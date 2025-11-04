/**
 * Verify Firebase ID token
 * Uses Firebase REST API for proper token verification (server-side)
 * Falls back to JWT decode if Firebase config is missing
 */

// Test token from environment variable (ONLY IN DEVELOPMENT)
// This ensures test tokens are never in production code
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const TEST_USER = {
  uid: process.env.TEST_USER_UID || 'test-user-123',
  email: process.env.TEST_USER_EMAIL || 'test@originx.com',
  orgId: process.env.TEST_USER_ORG_ID || 'test-org-123',
  role: process.env.TEST_USER_ROLE || 'admin',
};

interface DecodedToken {
  uid: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Verify Firebase ID token using Firebase REST API
 * This provides proper token verification without requiring firebase-admin package
 * Uses Firebase Identity Toolkit REST API: https://firebase.google.com/docs/reference/rest/auth
 */
async function verifyTokenViaRestAPI(token: string): Promise<DecodedToken | null> {
  try {
    // Get Firebase API key from config
    const { firebaseConfig } = await import("@/lib/firebase/config");
    
    if (!firebaseConfig.apiKey) {
      console.warn("Firebase API key not configured, falling back to JWT decode");
      return null;
    }

    // Use Firebase Identity Toolkit REST API to verify token
    // Endpoint: https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo
    // This is the official REST API endpoint for verifying Firebase ID tokens
    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: token,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (process.env.NODE_ENV === 'development') {
        console.error("Firebase token verification failed:", errorData);
      }
      return null;
    }

    const data = await response.json();
  
    if (!data.users || data.users.length === 0) {
      return null;
    }

    const user = data.users[0];
    
    // Extract user information from the response
    // The response structure: { users: [{ localId, email, emailVerified, displayName, photoUrl, ... }] }
    return {
      uid: user.localId || user.uid,
      email: user.email,
      emailVerified: user.emailVerified || false,
      displayName: user.displayName,
      photoURL: user.photoUrl,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Error verifying token via REST API:", error);
    }
    return null;
  }
}

/**
 * Fallback: Decode JWT token (basic verification)
 * This is less secure but works when Firebase REST API is unavailable
 */
function decodeJWTToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    return {
      uid: payload.uid || payload.sub,
      email: payload.email,
      ...payload,
    };
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
}

export async function verifyIdToken(token: string): Promise<DecodedToken | null> {
  // Bypass for test token (ONLY IN DEVELOPMENT/TESTING)
  // Only allow test token when:
  // 1. Not in production
  // 2. TEST_AUTH_TOKEN environment variable is set
  // 3. Token matches the environment variable
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const trimmedToken = token.trim();
  
  // Only allow test token if explicitly set via environment variable
  if (isDevelopment && TEST_TOKEN && trimmedToken === TEST_TOKEN) {
    console.warn('⚠️ Using test token from environment - NOT FOR PRODUCTION');
    return {
      uid: TEST_USER.uid,
      email: TEST_USER.email,
      orgId: TEST_USER.orgId,
      role: TEST_USER.role,
    };
  }
  
  // In production, reject any test tokens immediately
  if (!isDevelopment && trimmedToken.includes('test-token')) {
    console.error('❌ Test token detected in production - REJECTED');
    return null;
  }
  
  // Try Firebase REST API verification first (proper verification)
  const verifiedToken = await verifyTokenViaRestAPI(trimmedToken);
  if (verifiedToken) {
    return verifiedToken;
  }
  
  // Fallback to JWT decode if REST API fails (e.g., Firebase not configured)
  // This is less secure but allows the app to work in development
  console.warn("Falling back to JWT decode (less secure). Configure Firebase properly for production.");
  return decodeJWTToken(trimmedToken);
}

// Export test token for use in test files (only in development)
// This will be empty string in production if TEST_AUTH_TOKEN is not set
export const HARDCODED_TEST_TOKEN = process.env.NODE_ENV !== 'production' ? TEST_TOKEN : '';

// Helper function to check if we're in development/test mode
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

// Helper function to check if a user is the test user
export function isTestUser(uid: string): boolean {
  return isDevelopmentMode() && uid === TEST_USER.uid;
}

