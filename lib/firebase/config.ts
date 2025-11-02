// Validate that required Firebase environment variables are set
// Note: In Next.js, process.env.NEXT_PUBLIC_* variables are replaced at build time
// If you see warnings, restart the dev server: Stop (Ctrl+C) and run 'npm run dev' again
function validateFirebaseConfig() {
  // Use Next.js runtime environment variable access
  // In client components, NEXT_PUBLIC_* vars are embedded at build time
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const missing: string[] = [];
  if (!apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!authDomain) missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!storageBucket) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!messagingSenderId) missing.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!appId) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');

  // Only warn in browser, and only once to avoid spam
  if (missing.length > 0 && typeof window !== 'undefined') {
    const warnKey = 'firebase-config-warned';
    if (!sessionStorage.getItem(warnKey)) {
      console.warn('⚠️ Firebase configuration is missing. Missing variables:', missing);
      console.warn('💡 SOLUTION: Stop your dev server (Ctrl+C) and restart it with: npm run dev');
      console.warn('📝 Make sure .env.local exists in the project root with all Firebase variables.');
      sessionStorage.setItem(warnKey, 'true');
    }
  }

  return missing.length === 0;
}

// Firebase config - databaseURL is only for Realtime Database, not Firestore
// Firestore uses projectId automatically
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  // Only include databaseURL if using Realtime Database
  // Firestore doesn't need it and it can cause issues if misconfigured
  ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && { 
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL 
  }),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = validateFirebaseConfig();


