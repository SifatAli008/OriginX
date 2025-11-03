/**
 * Verify Firebase ID token
 * Note: For production, use Firebase Admin SDK on server-side
 * This is a client-side verification placeholder
 */

// Hardcoded test token for testing purposes (ONLY IN DEVELOPMENT)
const TEST_TOKEN = 'test-token-originx-12345-hardcoded-for-testing';
const TEST_USER = {
  uid: 'test-user-123',
  email: 'test@originx.com',
  orgId: 'test-org-123',
  role: 'admin',
};

export async function verifyIdToken(token: string) {
  // Bypass for hardcoded test token (ONLY IN DEVELOPMENT)
  if (process.env.NODE_ENV === 'development' && token === TEST_TOKEN) {
    console.warn('⚠️ Using hardcoded test token - NOT FOR PRODUCTION');
    return {
      uid: TEST_USER.uid,
      email: TEST_USER.email,
      orgId: TEST_USER.orgId,
      role: TEST_USER.role,
    };
  }
  
  // For Next.js API routes, we need to verify the token properly
  // In production, use Firebase Admin SDK: admin.auth().verifyIdToken(token)
  // For now, we'll decode it (client should verify on client side)
  
  try {
    // Decode the token (simple JWT decode - not secure verification)
    // In production, use Firebase Admin SDK
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
    console.error("Token verification error:", error);
    return null;
  }
}

// Export test token for use in test files
export const HARDCODED_TEST_TOKEN = TEST_TOKEN;

