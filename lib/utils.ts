import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { FirebaseError } from "firebase/app"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts Firebase authentication errors into user-friendly messages
 */
export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/unauthorized-domain": {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(currentDomain);
        const domainType = isIpAddress ? 'IP address' : 'domain';
        return `Unauthorized ${domainType}: ${currentDomain}. Add it in Firebase Console → Authentication → Settings → Authorized domains. Click "Add domain" and enter: ${currentDomain}`;
      }
      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method. Enable 'Email/Password' for email login or 'Google' for Google sign-in.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      case "auth/popup-blocked":
        return "Popup was blocked by your browser. Please allow popups for this site and try again.";
      case "auth/redirect-cancelled-by-user":
        return "Sign-in was cancelled. Please try again.";
      case "auth/redirect-operation-pending":
        return "A sign-in operation is already in progress. Please wait for it to complete.";
      case "auth/auth-domain-config-required":
        return "Authentication domain not configured. Please check Firebase configuration.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection and try again.";
      case "auth/invalid-email":
        return "Invalid email address. Please check and try again.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password is too weak. Please use a stronger password.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      default:
        return error.message || "An authentication error occurred. Please try again.";
    }
  }
  
  // Handle Firestore errors
  if (error instanceof Error) {
    // Check if it's a Firestore permission error
    if (error.message.includes("Missing or insufficient permissions")) {
      return "Permission denied. Please check that Firestore security rules are deployed correctly. The rules should allow users to create their own documents.";
    }
    if (error.message.includes("permission-denied")) {
      return "Permission denied. Please ensure Firestore rules allow users to create their own user documents.";
    }
    return error.message;
  }
  
  return "An unexpected error occurred. Please try again.";
}

