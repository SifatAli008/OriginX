"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, onAuthStateChanged } from "firebase/auth";
import AuthCard from "../AuthCard";
import { FcGoogle } from "react-icons/fc";
import { useAppSelector, RootState } from "@/lib/store";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getFirebaseAuthErrorMessage } from "@/lib/utils";
import { getUserDocument, createOrUpdateUserDocument } from "@/lib/firebase/firestore";
import { linkUserToInvitation } from "@/lib/firebase/firestore";
import MFAVerification from "@/components/mfa/MFAVerification";
import type { MFAMethod } from "@/lib/types/user";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<MFAMethod | null>(null);
  const authState = useAppSelector((s: RootState) => s.auth);

  // Handle redirect result and auth state changes
  useEffect(() => {
    let isMounted = true;
    let authStateUnsubscribe: (() => void) | null = null;
    let redirectHandled = false;
    
    interface FirebaseUser {
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
    }
    
    const handleGoogleAuthSuccess = async (firebaseUser: FirebaseUser) => {
      // Prevent duplicate handling
      if (redirectHandled) {
        console.log("⚠️ Redirect already handled, skipping");
        return;
      }
      if (!isMounted) {
        console.log("⚠️ Component unmounted, skipping");
        return;
      }
      
      redirectHandled = true;
      console.log("🔄 Handling Google auth success for:", firebaseUser.email);
      
      try {
        setLoading(true);
        const user = firebaseUser;
        
        // Check if user was invited (has pending document)
        // Wrap in try-catch in case of permission errors (user might not be invited)
        if (user.email) {
          try {
            const linkedUser = await linkUserToInvitation(user.uid, user.email);
            if (linkedUser) {
              // User was invited, use their existing role and org
              await createOrUpdateUserDocument(user.uid, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: linkedUser.role,
                orgId: linkedUser.orgId,
                orgName: linkedUser.orgName,
                status: "active",
                mfaEnabled: false,
              });
              // User was successfully linked, skip the rest and redirect
              const auth = getFirebaseAuth();
              if (auth?.currentUser && isMounted) {
                const userDoc = await getUserDocument(auth.currentUser.uid);
                if (userDoc) {
                  if (userDoc.role === "admin") {
                    router.push("/dashboard");
                    return;
                  } else if (userDoc.status === "pending" && !userDoc.orgId) {
                    router.push("/register-company");
                    return;
                  } else {
                    router.push("/dashboard");
                    return;
                  }
                }
              }
            }
          } catch (invitationError: unknown) {
            // If invitation check fails (permission error or no invitation), continue with normal flow
            const errorMessage = invitationError instanceof Error ? invitationError.message : String(invitationError);
            console.log("No invitation found or permission error (this is OK for new users):", errorMessage);
            // Continue to create user document normally
          }
        }

        const auth = getFirebaseAuth();
        if (!auth || !isMounted) return;

        // Wait a moment for Firestore operations to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if user has MFA enabled
        const authUser = auth.currentUser;
        if (authUser && isMounted) {
          let userDoc = await getUserDocument(authUser.uid);
          
          // Check if this is admin user (Google login)
          const isAdminUser = authUser.email === "admin@originx.com";
          
          // If user doc doesn't exist, create it
          if (!userDoc) {
            try {
              if (isAdminUser) {
                console.log("Creating admin user document...");
                await createOrUpdateUserDocument(authUser.uid, {
                  email: authUser.email || "",
                  displayName: "Admin",
                  role: "admin",
                  status: "active",
                  mfaEnabled: false,
                });
                userDoc = await getUserDocument(authUser.uid);
                console.log("Admin user document created successfully");
              } else {
                console.log("Creating non-admin user document for:", authUser.email);
                await createOrUpdateUserDocument(authUser.uid, {
                  email: authUser.email || "",
                  displayName: authUser.displayName,
                  photoURL: authUser.photoURL,
                  role: "sme",
                  status: "pending", // Will be activated after company registration
                  mfaEnabled: false,
                });
                // Wait a moment for Firestore write to complete
                await new Promise(resolve => setTimeout(resolve, 300));
                userDoc = await getUserDocument(authUser.uid);
                console.log("Non-admin user document created successfully:", userDoc ? "Document exists" : "Document still missing");
              }
            } catch (createError: unknown) {
              console.error("Error creating user document:", createError);
              const error = createError as { code?: string; message?: string };
              console.error("Error code:", error.code);
              console.error("Error message:", error.message);
              if (isMounted) {
                setError(`Failed to create user account: ${getFirebaseAuthErrorMessage(error)}`);
                setLoading(false);
              }
              return;
            }
          } else if (isAdminUser) {
            // If user doc exists but admin user, force update to admin role and active status
            await createOrUpdateUserDocument(authUser.uid, {
              role: "admin",
              status: "active",
              displayName: "Admin",
            });
            userDoc = await getUserDocument(authUser.uid);
          }

          if (!isMounted) return;

          // CRITICAL: Admin users skip all checks and go directly to dashboard
          if (isAdminUser || userDoc?.role === "admin") {
            // Admin bypasses MFA and company registration - go straight to dashboard
            router.push("/dashboard");
            return;
          }

          if (userDoc?.mfaEnabled && userDoc?.mfaConfig?.method) {
            // Show MFA verification
            setMfaMethod(userDoc.mfaConfig.method);
            setShowMFA(true);
            setLoading(false);
            return;
          }

          // Redirect based on user status (non-admin users only)
          // Re-fetch user doc to ensure we have the latest data
          userDoc = await getUserDocument(authUser.uid);
          
          console.log("User doc after Google login:", {
            status: userDoc?.status,
            orgId: userDoc?.orgId,
            role: userDoc?.role,
            email: userDoc?.email
          });

          if (userDoc?.status === "pending" && !userDoc?.orgId) {
            // User needs to register company
            console.log("✅ Redirecting to register-company");
            // Use router.push for client-side navigation (faster than window.location)
            router.push("/register-company");
            return;
          } else if (userDoc?.orgId && userDoc.status === "active" && userDoc.role === "sme") {
            // User has been approved but still has default "sme" role
            // They need to select their specific role
            console.log("✅ Redirecting to select-role");
            router.push("/select-role");
            return;
          } else {
            // User is fully set up, go to dashboard
            console.log("✅ Redirecting to dashboard");
            router.push("/dashboard");
            return;
          }
        }
      } catch (err: unknown) {
        console.error("❌ Error handling Google auth success:", err);
        if (isMounted) {
          const errorMessage = getFirebaseAuthErrorMessage(err);
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    const handleRedirectResult = async () => {
      try {
        const auth = getFirebaseAuth();
        if (!auth) {
          console.log("⚠️ Firebase auth not initialized");
          return;
        }

        // Check URL parameters to see if we're actually returning from Google
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        console.log("🔍 URL params:", Object.fromEntries(urlParams.entries()));
        console.log("🔍 URL hash:", hash.substring(0, 100)); // First 100 chars to see if there's auth data
        
        // Check if URL indicates we're returning from Google OAuth
        const hasOAuthParams = urlParams.has('mode') || 
                              urlParams.has('apiKey') || 
                              hash.includes('access_token') ||
                              hash.includes('id_token') ||
                              sessionStorage.getItem('google_auth_redirect') === 'true';
        
        console.log("🔍 Has OAuth params:", hasOAuthParams);
        console.log("🔍 Checking for redirect result...");
        
        // IMPORTANT: getRedirectResult must be called to process the redirect
        // It can only be called once per redirect, so we need to call it IMMEDIATELY
        // before any other component might consume it
        let result = await getRedirectResult(auth);
        
        if (result) {
          console.log("✅ Redirect result received:", result.user.email);
          console.log("Result details:", {
            providerId: result.providerId,
            operationType: result.operationType,
            user: result.user.email
          });
          if (isMounted) {
            setLoading(true);
            await handleGoogleAuthSuccess(result.user);
            return;
          }
        } else {
          console.log("⚠️ No redirect result found on first check");
          if (hasOAuthParams) {
            console.log("⚠️ WARNING: URL suggests OAuth redirect, but getRedirectResult returned null");
            console.log("⚠️ This might mean the redirect result was already consumed or Firebase hasn't processed it yet");
          }
        }

        // Wait a moment for Firebase to process the redirect (after checking result)
        console.log("⏳ Waiting 300ms for Firebase to process redirect...");
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check again for redirect result (in case it wasn't ready the first time)
        console.log("🔍 Checking for redirect result again...");
        result = await getRedirectResult(auth);
        
        if (result) {
          console.log("✅ Redirect result received (second check):", result.user.email);
          if (isMounted) {
            setLoading(true);
            await handleGoogleAuthSuccess(result.user);
            return;
          }
        } else {
          console.log("⚠️ No redirect result found on second check either");
        }

        // Wait longer and check one more time
        console.log("⏳ Waiting 1000ms more for Firebase...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        result = await getRedirectResult(auth);
        if (result) {
          console.log("✅ Redirect result received (third check):", result.user.email);
          if (isMounted) {
            setLoading(true);
            await handleGoogleAuthSuccess(result.user);
            return;
          }
        } else {
          console.log("⚠️ No redirect result found on third check");
        }

        // Check if user is already authenticated (might be set by AuthListener)
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log("✅ User already authenticated when checking redirect, user:", currentUser.email);
          console.log("User provider data:", currentUser.providerData.map(p => p.providerId));
          
          // Check if this is from Google login
          const isGoogleProvider = currentUser.providerData.some(p => p.providerId === 'google.com');
          if (isGoogleProvider && !redirectHandled && isMounted) {
            console.log("✅ Detected Google provider, processing auth success");
            await handleGoogleAuthSuccess(currentUser);
            return;
          }
        } else {
          console.log("⚠️ No current user found after checking redirect result");
        }

        // Set up auth state listener as fallback to catch Google authentication
        // This will trigger when Firebase auth state changes (which happens after redirect)
        // NOTE: onAuthStateChanged fires immediately with current state, then again on changes
        if (!redirectHandled) {
          console.log("ℹ️ Setting up auth state listener to catch Google authentication");
          let initialCheck = true; // Track if this is the initial (null) state
          
          authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("🔔 Auth state changed event fired, user:", firebaseUser?.email || "null", "initialCheck:", initialCheck);
            
            // Skip the initial null state - we only want to handle actual auth changes
            if (initialCheck) {
              initialCheck = false;
              // If user is already authenticated on first check, handle it
              if (firebaseUser) {
                console.log("User authenticated on initial listener check");
                const isGoogleProvider = firebaseUser.providerData.some(p => p.providerId === 'google.com');
                if (isGoogleProvider && !redirectHandled && isMounted) {
                  console.log("✅ User already authenticated on initial listener check:", firebaseUser.email);
                  redirectHandled = true;
                  setLoading(true);
                  await handleGoogleAuthSuccess(firebaseUser);
                  return;
                }
              }
              console.log("Skipping initial null state");
              return; // Don't process the initial null state
            }
            
            // Handle subsequent auth state changes (this is when redirect completes)
            if (firebaseUser && !redirectHandled && isMounted) {
              const isGoogleProvider = firebaseUser.providerData.some(p => p.providerId === 'google.com');
              console.log("Auth state change - isGoogleProvider:", isGoogleProvider, "redirectHandled:", redirectHandled);
              if (isGoogleProvider) {
                console.log("✅ Auth state changed - Google user authenticated:", firebaseUser.email);
                redirectHandled = true; // Set flag before processing to prevent duplicate
                setLoading(true);
                await handleGoogleAuthSuccess(firebaseUser);
              }
            }
          });
        }
      } catch (err: unknown) {
        console.error("❌ Error handling redirect result:", err);
        const errorObj = err as { code?: string; message?: string; stack?: string };
        console.error("Error details:", {
          code: errorObj?.code,
          message: errorObj?.message,
          stack: errorObj?.stack
        });
        if (isMounted) {
          const errorMessage = getFirebaseAuthErrorMessage(err);
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    // Check if URL contains redirect parameters (indicates we're returning from Google)
    const urlParams = new URLSearchParams(window.location.search);
    const hasRedirectParams = urlParams.has('mode') || urlParams.has('apiKey') || window.location.hash.includes('access_token');
    
    // Also check if we just came from a redirect by checking sessionStorage
    const wasRedirecting = sessionStorage.getItem('google_auth_redirect') === 'true';
    
    if (hasRedirectParams || wasRedirecting) {
      console.log("🔄 Detected return from Google redirect, handling...");
      sessionStorage.removeItem('google_auth_redirect');
      
      // When returning from redirect, give Firebase more time to process
      // Check auth state at multiple intervals since Firebase might take time
      const checkAuthState = async (delay: number, attempt: number) => {
        setTimeout(async () => {
          if (!isMounted || redirectHandled) return;
          
          const auth = getFirebaseAuth();
          if (!auth) return;
          
          console.log(`🔍 Checking auth state (attempt ${attempt} after ${delay}ms)...`);
          const currentUser = auth.currentUser;
          
          if (currentUser) {
            console.log("✅ Found authenticated user:", currentUser.email);
            const isGoogleProvider = currentUser.providerData.some(p => p.providerId === 'google.com');
            if (isGoogleProvider && !redirectHandled && isMounted) {
              console.log("✅ User authenticated after redirect delay, processing:", currentUser.email);
              redirectHandled = true;
              setLoading(true);
              await handleGoogleAuthSuccess(currentUser);
              return;
            }
          } else {
            console.log(`⚠️ User still not authenticated after ${delay}ms (attempt ${attempt})`);
          }
          
          // If still not authenticated after multiple attempts, try one more time with longer delay
          if (attempt < 3 && !redirectHandled) {
            checkAuthState(1000, attempt + 1);
          }
        }, delay);
      };
      
      // Check at 500ms, 1500ms, and 2500ms
      checkAuthState(500, 1);
    }

    // Check immediately for redirect result
    handleRedirectResult();

    return () => {
      isMounted = false;
      if (authStateUnsubscribe) {
        authStateUnsubscribe();
      }
    };
  }, [router]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured. Please contact support.");
        setLoading(false);
        return;
      }

      // Normalize email input - convert "admin" to proper email format
      let normalizedEmail = email.trim().toLowerCase();
      const isAdminLogin = normalizedEmail === "admin" && password === "admin";
      
      // Firebase requires passwords to be at least 6 characters
      // For admin, we use "admin123" as the static Firebase password
      // User still types "admin" but internally we use "admin123"
      const ADMIN_EMAIL = "admin@originx.com";
      const ADMIN_PASSWORD = "admin123"; // Static password stored in Firebase
      
      if (isAdminLogin) {
        // Convert admin login to proper email
        normalizedEmail = ADMIN_EMAIL;
      } else {
        // Validate email format for non-admin users
        if (!normalizedEmail || !normalizedEmail.includes("@")) {
          setError("Please enter a valid email address");
          setLoading(false);
          return;
        }
        
        // Validate password length (Firebase requires minimum 6 characters)
        if (!password || password.length < 6) {
          setError("Password must be at least 6 characters long");
          setLoading(false);
          return;
        }
      }

      // For admin login, ensure account exists and use static credentials
      if (isAdminLogin) {
        try {
          // First, try to create the admin account (if it doesn't exist)
          const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
          const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          
          // Update profile
          await updateProfile(cred.user, { displayName: "Admin" });
          
          // User is already signed in after createUserWithEmailAndPassword
        } catch (createErr: unknown) {
          // If account already exists, try to sign in with static password
          const createError = createErr as { code?: string; message?: string };
          if (createError.code === "auth/email-already-in-use") {
            try {
              await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
            } catch (signInErr: unknown) {
              const signInError = signInErr as { code?: string; message?: string };
              // Account exists but password doesn't match - try to reset or show error
              if (signInError.code === "auth/invalid-credential" || signInError.code === "auth/wrong-password") {
                setError("Admin account password mismatch. The admin account requires password reset. Please contact system administrator.");
              } else {
                setError(getFirebaseAuthErrorMessage(signInErr));
              }
              setLoading(false);
              return;
            }
          } else {
            // Other creation errors
            setError(createError.message || "Failed to create admin account. Please contact support.");
            setLoading(false);
            return;
          }
        }
      } else {
        // Normal user login
        try {
          // Additional validation
          if (!normalizedEmail || !password) {
            setError("Email and password are required");
            setLoading(false);
            return;
          }
          
          await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (err: unknown) {
          // Enhanced error handling
          const error = err as { code?: string; message?: string };
          if (error.code === "auth/invalid-email") {
            setError("Invalid email address format");
          } else if (error.code === "auth/user-disabled") {
            setError("This account has been disabled");
          } else if (error.code === "auth/user-not-found") {
            setError("No account found with this email. Please check your email or sign up.");
          } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
            setError("Incorrect password. Please try again.");
          } else if (error.code === "auth/too-many-requests") {
            setError("Too many failed attempts. Please try again later.");
          } else if (error.code === "auth/operation-not-allowed") {
            setError("Email/Password authentication is not enabled. Please contact support.");
          } else {
            // For 400 errors, provide more specific message
            const errorMessage = error.message || "Authentication failed";
            if (errorMessage.includes("INVALID_PASSWORD") || errorMessage.includes("INVALID_EMAIL")) {
              setError("Invalid email or password. Please check your credentials.");
            } else {
              setError(getFirebaseAuthErrorMessage(err));
            }
          }
          setLoading(false);
          return;
        }
      }
      
      // Check if user has MFA enabled
      const authUser = auth.currentUser;
      if (authUser) {
        let userDoc = await getUserDocument(authUser.uid);
        
        // For admin login, ensure admin role and active status
        const isAdminUser = isAdminLogin || authUser.email === "admin@originx.com";
        
        // If user doc doesn't exist, create it
        if (!userDoc) {
          if (isAdminUser) {
            await createOrUpdateUserDocument(authUser.uid, {
              email: authUser.email || "",
              displayName: "Admin",
              role: "admin",
              status: "active",
              mfaEnabled: false,
            });
            userDoc = await getUserDocument(authUser.uid);
          } else {
            await createOrUpdateUserDocument(authUser.uid, {
              email: authUser.email || "",
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              role: "sme",
              status: "pending", // Will be activated after company registration
              mfaEnabled: false,
            });
            // Wait a moment for Firestore write to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            userDoc = await getUserDocument(authUser.uid);
          }
        } else if (isAdminUser) {
          // If user doc exists but admin login, force update to admin role and active status
          await createOrUpdateUserDocument(authUser.uid, {
            role: "admin",
            status: "active",
            displayName: "Admin",
          });
          userDoc = await getUserDocument(authUser.uid);
        }

        // CRITICAL: Admin users skip all checks and go directly to dashboard
        if (isAdminUser || userDoc?.role === "admin") {
          // Admin bypasses MFA and company registration - go straight to dashboard
          router.push("/dashboard");
          return;
        }

        if (userDoc?.mfaEnabled && userDoc?.mfaConfig?.method) {
          // Show MFA verification
          setMfaMethod(userDoc.mfaConfig.method);
          setShowMFA(true);
          setLoading(false);
          return;
        }

        // Redirect based on user status (non-admin users only)
        // Re-fetch user doc to ensure we have the latest data
        userDoc = await getUserDocument(authUser.uid);
        
        console.log("User doc after email login:", {
          status: userDoc?.status,
          orgId: userDoc?.orgId,
          role: userDoc?.role,
          email: userDoc?.email
        });

        if (userDoc?.status === "pending" && !userDoc?.orgId) {
          // User needs to register company
          console.log("✅ Redirecting to register-company (email login)");
          router.push("/register-company");
          return;
        } else if (userDoc?.orgId && userDoc.status === "active" && userDoc.role === "sme") {
          // User has been approved but still has default "sme" role
          // They need to select their specific role
          console.log("✅ Redirecting to select-role (email login)");
          router.push("/select-role");
          return;
        } else {
          // User is fully set up, go to dashboard
          console.log("✅ Redirecting to dashboard (email login)");
          router.push("/dashboard");
          return;
        }
      }
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured. Please check your environment variables and restart the dev server.");
        setLoading(false);
        return;
      }

      // Validate Google provider is configured
      if (!googleProvider) {
        setError("Google authentication provider is not configured.");
        setLoading(false);
        return;
      }

      const currentUrl = window.location.href;
      console.log("🔄 Initiating Google sign-in redirect from:", currentUrl);
      console.log("Firebase auth domain:", auth.config?.authDomain);
      
      // Mark that we're initiating a redirect so we can detect return
      sessionStorage.setItem('google_auth_redirect', 'true');
      
      // Set additional scopes if needed
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      
      try {
        // Store the current URL to redirect back after auth
        // Firebase will automatically redirect back to the current page
        await signInWithRedirect(auth, googleProvider);
        
        // The redirect will navigate away immediately - this code won't run
        // The result will be handled in the useEffect when the page loads after redirect
      } catch (redirectErr: unknown) {
        // Enhanced error handling for redirect errors
        console.error("Google sign-in redirect error:", redirectErr);
        const redirectError = redirectErr as { code?: string; message?: string };
        
        if (redirectError.code === "auth/operation-not-allowed") {
          setError("Google sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method → Google.");
        } else if (redirectError.code === "auth/popup-blocked") {
          setError("Popup was blocked. Please allow popups and try again.");
        } else if (redirectError.code === "auth/unauthorized-domain") {
          const currentDomain = window.location.hostname;
          setError(`Unauthorized domain: ${currentDomain}. Add it in Firebase Console → Authentication → Settings → Authorized domains.`);
        } else if (redirectError.code === "auth/redirect-operation-pending") {
          setError("A sign-in operation is already in progress. Please wait for it to complete.");
        } else {
          setError(getFirebaseAuthErrorMessage(redirectErr) || "Failed to initiate Google sign-in. Please try again.");
        }
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error("Unexpected error in Google sign-in:", err);
      const errorMessage = getFirebaseAuthErrorMessage(err);
      setError(errorMessage || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleMFAVerify(_code: string) {
    // MFA verified (code validated in MFAVerification component), proceed to dashboard
    router.push("/dashboard");
  }

  // Show MFA verification if required
  if (showMFA && mfaMethod) {
    return (
      <AuthCard title="Two-Factor Authentication" subtitle="Enter your verification code">
        <MFAVerification
          method={mfaMethod}
          onVerify={handleMFAVerify}
          onCancel={() => {
            setShowMFA(false);
            setMfaMethod(null);
            // Sign out the user
            const auth = getFirebaseAuth();
            auth?.signOut();
          }}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in to OriginX" subtitle="Welcome back">
      <form onSubmit={handleEmailLogin} className="flex flex-col gap-6">
        {/* Email Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="email"
            type={email.trim() === "admin" ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com or admin"
            autoComplete="email"
            required
            disabled={loading}
            pattern={email.trim() === "admin" ? undefined : ".*@.*"}
            className={cn(
              "h-12 transition-all duration-200",
              "focus:ring-2 focus:ring-primary/20",
              "hover:border-primary/50"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Admin: Use &quot;admin&quot; as email and &quot;admin&quot; as password (static credentials)
          </p>
        </motion.div>

        {/* Password Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              className={cn(
                "h-12 pr-12 transition-all duration-200",
                "focus:ring-2 focus:ring-primary/20",
                "hover:border-primary/50"
              )}
            />
            <button
              type="button"
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-muted-foreground hover:text-foreground",
                "transition-all duration-200 p-1 rounded-md",
                "hover:bg-accent active:scale-95"
              )}
              onClick={() => setShowPassword((s) => !s)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>

        {/* Remember & Forgot */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center space-x-2 group">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked === true)}
              disabled={loading}
              className="transition-all group-hover:scale-105"
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors"
            >
              Remember me
            </Label>
          </div>
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-primary transition-all duration-200 hover:underline"
          >
            Forgot password?
          </Link>
        </motion.div>

        {/* Error Messages */}
        <AnimatePresence>
          {(error || authState.error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-md bg-destructive/10 border border-destructive/20 p-3"
            >
              <p className="text-sm text-destructive flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                {error || authState.error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign In Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className={cn(
              "w-full font-semibold h-12",
              "relative overflow-hidden",
              "transition-all duration-300",
              "hover:shadow-lg hover:shadow-primary/25",
              "hover:scale-[1.02] active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/10 before:to-primary/0",
              "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </span>
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          className="flex items-center gap-4 my-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground px-2 font-medium">or</span>
          <Separator className="flex-1" />
        </motion.div>

        {/* Google Sign In */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleGoogle}
            disabled={loading}
            className={cn(
              "w-full font-medium h-12",
              "transition-all duration-200",
              "hover:bg-accent hover:border-primary/50",
              "hover:scale-[1.02] active:scale-[0.98]",
              "disabled:opacity-50"
            )}
          >
            <FcGoogle size={20} className="mr-2" />
            Continue with Google
          </Button>
        </motion.div>

        {/* Sign Up Link */}
        <motion.p
          className="text-sm text-muted-foreground text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          New here?{" "}
          <Link
            href="/register"
            className="text-primary font-medium hover:underline transition-all hover:text-primary/80"
          >
            Create an account
          </Link>
        </motion.p>
      </form>
    </AuthCard>
  );
}
