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
import { signInWithEmailAndPassword, signInWithPopup, getRedirectResult, onAuthStateChanged } from "firebase/auth";
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
import LoadingScreen from "@/components/loading/LoadingScreen";

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
  const [redirecting, setRedirecting] = useState(false);
  const [isGoogleSignInInProgress, setIsGoogleSignInInProgress] = useState(false);
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
      
      // Set flag immediately to prevent duplicate processing
      redirectHandled = true;
      // Remove sessionStorage flag since we're processing
      sessionStorage.removeItem('google_auth_redirect');
      console.log("🔄 Handling Google auth success for:", firebaseUser.email);
      console.log("📝 Firebase user details:", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      });
      
      try {
        setLoading(true);
        console.log("🔄 Step 1: Starting Google auth success handling...");
        
        // Get the current user from Firebase Auth directly to ensure we have all info
        const auth = getFirebaseAuth();
        if (!auth || !isMounted) {
          console.log("⚠️ Auth not available or component unmounted, returning");
          return;
        }
        
        // Use auth.currentUser directly - it has the most up-to-date information
        const authUser = auth.currentUser;
        if (!authUser) {
          console.log("⚠️ auth.currentUser is null, cannot proceed");
          setError("User authentication failed. Please try again.");
          setLoading(false);
          return;
        }
        
        console.log("🔄 Step 2: Got auth.currentUser:", {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
          providerData: authUser.providerData.map(p => p.providerId)
        });
        
        // Check if user was invited (has pending document)
        // Wrap in try-catch in case of permission errors (user might not be invited)
        if (authUser.email) {
          try {
            const linkedUser = await linkUserToInvitation(authUser.uid, authUser.email);
            if (linkedUser) {
              // User was invited, use their existing role and org
              await createOrUpdateUserDocument(authUser.uid, {
                email: authUser.email || "",
                displayName: authUser.displayName,
                photoURL: authUser.photoURL,
                role: linkedUser.role,
                orgId: linkedUser.orgId,
                orgName: linkedUser.orgName,
                status: "active",
                mfaEnabled: false,
              });
              // User was successfully linked, skip the rest and redirect
              const userDoc = await getUserDocument(authUser.uid);
              if (userDoc && isMounted) {
                setRedirecting(true);
                setLoading(false);
                  if (userDoc.role === "admin") {
                  setTimeout(() => {
                    router.push("/dashboard");
                  }, 500);
                    return;
                  } else if (userDoc.status === "pending" && !userDoc.orgId) {
                  setTimeout(() => {
                    router.push("/register-company");
                  }, 500);
                    return;
                  } else {
                  setTimeout(() => {
                    router.push("/dashboard");
                  }, 500);
                    return;
                }
              }
            }
          } catch (invitationError) {
            // If invitation check fails (permission error or no invitation), continue with normal flow
            const errorMessage = invitationError instanceof Error ? invitationError.message : String(invitationError);
            console.log("No invitation found or permission error (this is OK for new users):", errorMessage);
            // Continue to create user document normally
          }
        }

        console.log("🔄 Step 3: Waiting for Firestore operations...");
        // Wait a moment for Firestore operations to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Re-check authUser in case it changed
        const currentAuthUser = auth.currentUser;
        if (!currentAuthUser || !isMounted) {
          console.log("⚠️ auth.currentUser is null after wait, cannot proceed");
          setError("User authentication failed. Please try again.");
          setLoading(false);
          return;
        }
        
        console.log("🔄 Step 4: Fetching user document...");
        let userDoc = await getUserDocument(currentAuthUser.uid);
          
          // Check if this is admin user (Google login)
        const isAdminUser = currentAuthUser.email === "admin@originx.com";
        console.log("🔄 Step 5: User document status:", {
          exists: !!userDoc,
          isAdminUser,
          email: currentAuthUser.email,
          actualEmail: currentAuthUser.email,
          providerData: currentAuthUser.providerData.map(p => ({ providerId: p.providerId, email: p.email }))
        });
          
          // If user doc doesn't exist, create it
          if (!userDoc) {
            try {
              if (isAdminUser) {
              console.log("🔄 Step 6: Creating admin user document...");
              await createOrUpdateUserDocument(currentAuthUser.uid, {
                email: currentAuthUser.email || "",
                displayName: currentAuthUser.displayName || "Admin",
                photoURL: currentAuthUser.photoURL,
                  role: "admin",
                  status: "active",
                  mfaEnabled: false,
                });
              userDoc = await getUserDocument(currentAuthUser.uid);
              console.log("✅ Admin user document created successfully");
              } else {
              console.log("🔄 Step 6: Creating non-admin user document for:", currentAuthUser.email);
              await createOrUpdateUserDocument(currentAuthUser.uid, {
                email: currentAuthUser.email || "",
                displayName: currentAuthUser.displayName,
                photoURL: currentAuthUser.photoURL,
                  role: "sme",
                  status: "pending", // Will be activated after company registration
                  mfaEnabled: false,
                });
                // Wait a moment for Firestore write to complete
                await new Promise(resolve => setTimeout(resolve, 300));
              userDoc = await getUserDocument(currentAuthUser.uid);
              console.log("✅ Non-admin user document created:", userDoc ? "Document exists" : "Document still missing");
              }
            } catch (createError) {
            console.error("❌ Error creating user document:", createError);
              const error = createError as { code?: string; message?: string };
            console.error("❌ Error code:", error.code);
            console.error("❌ Error message:", error.message);
              if (isMounted) {
                setError(`Failed to create user account: ${getFirebaseAuthErrorMessage(error)}`);
                setLoading(false);
              }
              return;
            }
          } else if (isAdminUser) {
            // If user doc exists but admin user, force update to admin role and active status
          console.log("🔄 Step 6: Updating existing admin user document...");
          await createOrUpdateUserDocument(currentAuthUser.uid, {
              role: "admin",
              status: "active",
            displayName: currentAuthUser.displayName || "Admin",
            email: currentAuthUser.email || "",
            photoURL: currentAuthUser.photoURL,
            });
          userDoc = await getUserDocument(currentAuthUser.uid);
          console.log("✅ Admin user document updated");
        }

        console.log("🔄 Step 7: Checking redirect logic...");
        console.log("📋 User doc status:", {
          exists: !!userDoc,
          role: userDoc?.role,
          status: userDoc?.status,
          orgId: userDoc?.orgId,
          isAdminUser,
          email: currentAuthUser.email,
          providerIds: currentAuthUser.providerData.map(p => p.providerId)
        });

          // CRITICAL: Admin users skip all checks and go directly to dashboard
        // IMPORTANT: Do redirect IMMEDIATELY, before any unmount checks
        // router.push will work even if component unmounts during navigation
          if (isAdminUser || userDoc?.role === "admin") {
            // Admin bypasses MFA and company registration - go straight to dashboard
          console.log("✅ Admin user detected, redirecting to dashboard...");
          console.log("🚀 Executing router.push('/dashboard') NOW (no delay)...");
          
          // Set state first (but don't wait for it)
          try {
            setRedirecting(true);
            setLoading(false);
          } catch {
            // Ignore errors if component unmounted - redirect will still work
          }
          
          // Redirect immediately - don't use setTimeout, just redirect now
          router.push("/dashboard");
          
          // Use window.location as backup if router.push doesn't work
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location.pathname !== "/dashboard") {
              console.log("🚀 Router.push didn't redirect, using window.location as backup...");
              window.location.href = "/dashboard";
            }
          }, 1000);
          
          return;
        }
        
        // For non-admin users, check if component is still mounted before showing UI
        if (!isMounted) {
          console.log("⚠️ Component unmounted for non-admin user, redirecting to dashboard as fallback");
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
          userDoc = await getUserDocument(currentAuthUser.uid);
          
          console.log("🔄 Step 8: User doc after Google login:", {
            status: userDoc?.status,
            orgId: userDoc?.orgId,
            role: userDoc?.role,
            email: userDoc?.email
          });

          setRedirecting(true);
          setLoading(false);

          if (userDoc?.status === "pending" && !userDoc?.orgId) {
            // User needs to register company
            console.log("✅ Redirecting to register-company");
            setTimeout(() => {
            router.push("/register-company");
            }, 500);
            return;
          } else if (userDoc?.orgId && userDoc.status === "active" && userDoc.role === "sme") {
            // User has been approved but still has default "sme" role
            // They need to select their specific role
            console.log("✅ Redirecting to select-role");
            setTimeout(() => {
            router.push("/select-role");
            }, 500);
            return;
          } else {
            // User is fully set up, go to dashboard
            console.log("✅ Redirecting to dashboard");
            setTimeout(() => {
            router.push("/dashboard");
            }, 500);
            return;
        }
      } catch (err) {
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

        // IMPORTANT: Check hash immediately - Next.js router might clear it during navigation
        // Capture hash before any other operations
        const hashOnPageLoad = window.location.hash;
        const urlOnPageLoad = window.location.href;

        // Check URL parameters to see if we're actually returning from Google
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        console.log("🔍 URL on page load:", urlOnPageLoad.substring(0, 500));
        console.log("🔍 Hash on page load:", hashOnPageLoad.substring(0, 200), "length:", hashOnPageLoad.length);
        console.log("🔍 URL params:", Object.fromEntries(urlParams.entries()));
        console.log("🔍 URL hash length (current):", hash.length);
        console.log("🔍 URL hash (first 200 chars):", hash.substring(0, 200));
        console.log("🔍 Full URL (first 500 chars):", window.location.href.substring(0, 500));
        
        // Check if hash was present but got cleared
        if (hashOnPageLoad.length > 0 && hash.length === 0) {
          console.warn("⚠️ WARNING: Hash was present on page load but is now empty! Next.js might have cleared it.");
          console.warn("⚠️ Original hash:", hashOnPageLoad.substring(0, 500));
        }
        
        // Check if hash contains Firebase auth tokens
        const hasAuthToken = hash.includes('access_token') || hash.includes('id_token') || hash.includes('auth');
        console.log("🔍 Hash contains auth tokens:", hasAuthToken);
        
        // Check if URL indicates we're returning from Google OAuth
        const wasRedirecting = sessionStorage.getItem('google_auth_redirect') === 'true';
        
        // CRITICAL: If URL hash is empty but we have redirect flag, this means Firebase didn't redirect back properly
        // This usually happens when the domain/IP isn't authorized in Firebase Console or on Vercel
        if (!hasAuthToken && wasRedirecting && hash.length === 0 && !urlParams.has('error')) {
          const currentHostname = window.location.hostname;
          const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);
          const isVercelDeployment = currentHostname.includes('.vercel.app') || 
                                      currentHostname.includes('vercel.app');
          
          if (isIpAddress) {
            console.error("❌ Empty redirect - IP address likely not authorized in Firebase");
            console.error("❌ Current hostname:", currentHostname);
            if (isMounted) {
              setError(
                `Unauthorized IP address: ${currentHostname}\n\n` +
                `Firebase requires IP addresses to be explicitly authorized.\n\n` +
                `SOLUTION:\n` +
                `1. Go to Firebase Console → Authentication → Settings → Authorized domains\n` +
                `2. Click "Add domain"\n` +
                `3. Enter: ${currentHostname} (without port number)\n` +
                `4. Save and wait 2-3 minutes for changes to propagate\n` +
                `5. Clear browser cache (Ctrl+Shift+R) and try again\n\n` +
                `QUICK TEST: Try using localhost:3000 instead - it should work immediately`
              );
              setLoading(false);
              sessionStorage.removeItem('google_auth_redirect');
              sessionStorage.removeItem('google_auth_redirect_url');
            }
            return;
          } else if (isVercelDeployment) {
            console.error("❌ Empty redirect on Vercel - redirects are unreliable on Vercel");
            console.error("❌ Current hostname:", currentHostname);
            if (isMounted) {
              setError(
                `Google sign-in redirect failed on Vercel.\n\n` +
                `Redirects are unreliable on Vercel due to Next.js router interference.\n\n` +
                `The app should automatically use popup method on Vercel.\n` +
                `If you see this error, please try:\n` +
                `1. Refresh the page and try signing in again\n` +
                `2. The popup method should be used automatically\n` +
                `3. If popup is blocked, allow popups for this site and try again`
              );
              setLoading(false);
              sessionStorage.removeItem('google_auth_redirect');
              sessionStorage.removeItem('google_auth_redirect_url');
            }
            return;
          }
        }
        
        const hasOAuthParams = urlParams.has('mode') || 
                              urlParams.has('apiKey') || 
                              hash.includes('access_token') ||
                              hash.includes('id_token') ||
                              sessionStorage.getItem('google_auth_redirect') === 'true';
        
        console.log("🔍 Has OAuth params:", hasOAuthParams);
        console.log("🔍 SessionStorage redirect flag:", wasRedirecting);
        
        // IMPORTANT: getRedirectResult must be called to process the redirect
        // It can only be called once per redirect, so we need to call it IMMEDIATELY
        // before any other component might consume it
        // Call it even if we don't see OAuth params, as they might be in hash or already processed
        console.log("🔍 Checking for redirect result (calling getRedirectResult)...");
        const result = await getRedirectResult(auth);
        
        // If no redirect result and no indicators, skip further processing
        if (!result && !hasOAuthParams && !wasRedirecting) {
          console.log("ℹ️ No redirect result and no OAuth indicators, skipping redirect handling");
          return;
        }
        
        if (result) {
          console.log("✅ Redirect result received:", result.user.email);
          console.log("Result details:", {
            providerId: result.providerId,
            operationType: result.operationType,
            user: result.user.email
          });
          if (isMounted) {
            // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
            setLoading(true);
            await handleGoogleAuthSuccess(result.user);
            return;
          }
        } else {
          console.log("⚠️ No redirect result found on first check");
          if (hasOAuthParams || wasRedirecting) {
            console.log("⚠️ WARNING: OAuth indicators present, but getRedirectResult returned null");
            console.log("⚠️ This might mean the redirect result was already consumed or Firebase hasn't processed it yet");
            console.log("⚠️ Will check auth.currentUser as fallback...");
            
            // Check if user is authenticated even though getRedirectResult returned null
            const currentUser = auth.currentUser;
            if (currentUser) {
              const isGoogleProvider = currentUser.providerData.some(p => p.providerId === 'google.com');
              if ((isGoogleProvider || wasRedirecting) && !redirectHandled && isMounted) {
                console.log("✅ Found authenticated user despite null redirect result:", currentUser.email);
                // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
                setLoading(true);
                await handleGoogleAuthSuccess(currentUser);
                return;
              }
            }
          }
        }
        
        // If we have redirect flag or OAuth params but no result, wait and check auth state
        // Note: getRedirectResult can only be called once, so if it returned null,
        // we need to rely on auth.currentUser instead
        if (wasRedirecting || hasOAuthParams) {
          // Wait a moment for Firebase to process the redirect
          console.log("⏳ Waiting 500ms for Firebase to process redirect...");
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check auth.currentUser directly (getRedirectResult can only be called once)
          const currentUser = auth.currentUser;
          if (currentUser && !redirectHandled) {
            const isGoogleProvider = currentUser.providerData.some(p => p.providerId === 'google.com');
            if (isGoogleProvider || wasRedirecting) {
              console.log("✅ Found authenticated user after wait:", currentUser.email);
              // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
            setLoading(true);
              await handleGoogleAuthSuccess(currentUser);
            return;
          }
        }

          // If still no user, wait longer and check again
        console.log("⏳ Waiting 1000ms more for Firebase...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
          const delayedUser = auth.currentUser;
          if (delayedUser && !redirectHandled) {
            const isGoogleProvider = delayedUser.providerData.some(p => p.providerId === 'google.com');
            if (isGoogleProvider || wasRedirecting) {
              console.log("✅ Found authenticated user after longer wait:", delayedUser.email);
              // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
            setLoading(true);
              await handleGoogleAuthSuccess(delayedUser);
            return;
          }
          }
        }

        // Check if user is already authenticated (might be set by AuthListener)
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log("✅ User already authenticated when checking redirect, user:", currentUser.email);
          console.log("User provider data:", currentUser.providerData.map(p => p.providerId));
          
          // Check if this is from Google login
          const isGoogleProvider = currentUser.providerData.some(p => p.providerId === 'google.com');
          const wasRedirectingCheck = sessionStorage.getItem('google_auth_redirect') === 'true';
          if ((isGoogleProvider || wasRedirectingCheck) && !redirectHandled && isMounted) {
            console.log("✅ Detected Google provider, processing auth success");
            // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
            setLoading(true);
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
          
          const listenerSetupTime = Date.now();
          let hasSeenUser = false;
          
          authStateUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            const timeSinceSetup = Date.now() - listenerSetupTime;
            console.log("🔔 Auth state changed event fired, user:", firebaseUser?.email || "null", "initialCheck:", initialCheck, "timeSinceSetup:", timeSinceSetup + "ms", "hasSeenUser:", hasSeenUser);
            
            // Skip the initial null state - we only want to handle actual auth changes
            if (initialCheck) {
              initialCheck = false;
              // If user is already authenticated on first check, handle it
              if (firebaseUser) {
                hasSeenUser = true;
                console.log("✅ User authenticated on initial listener check:", firebaseUser.email);
                const isGoogleProvider = firebaseUser.providerData.some(p => p.providerId === 'google.com');
                const wasRedirecting = sessionStorage.getItem('google_auth_redirect') === 'true';
                console.log("Provider check - isGoogleProvider:", isGoogleProvider, "providerIds:", firebaseUser.providerData.map(p => p.providerId), "wasRedirecting:", wasRedirecting);
                
                if ((isGoogleProvider || wasRedirecting) && !redirectHandled && isMounted) {
                  console.log("✅ Processing authenticated user from initial listener check");
                  // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
                  setLoading(true);
                  await handleGoogleAuthSuccess(firebaseUser);
                  return;
                }
              } else {
                console.log("⚠️ Initial state is null - no user authenticated yet");
              }
              return; // Don't process the initial null state
            }
            
            // Handle subsequent auth state changes (this is when redirect completes)
            if (firebaseUser) {
              hasSeenUser = true;
              if (!redirectHandled && isMounted) {
              const isGoogleProvider = firebaseUser.providerData.some(p => p.providerId === 'google.com');
                const wasRedirecting = sessionStorage.getItem('google_auth_redirect') === 'true';
                console.log("🔔 Auth state change - isGoogleProvider:", isGoogleProvider, "wasRedirecting:", wasRedirecting, "redirectHandled:", redirectHandled, "user:", firebaseUser.email, "providers:", firebaseUser.providerData.map(p => p.providerId));
                
                // Process if it's a Google provider OR if we have the redirect flag set
                if (isGoogleProvider || wasRedirecting) {
                console.log("✅ Auth state changed - Google user authenticated:", firebaseUser.email);
                  // redirectHandled and sessionStorage cleanup will be handled in handleGoogleAuthSuccess
                setLoading(true);
                await handleGoogleAuthSuccess(firebaseUser);
                } else {
                  console.log("⚠️ User authenticated but not via Google and no redirect flag");
                }
              }
            } else if (!hasSeenUser && timeSinceSetup > 5000) {
              // If we've been waiting more than 5 seconds and still no user, something went wrong
              const wasRedirecting = sessionStorage.getItem('google_auth_redirect') === 'true';
              if (wasRedirecting) {
                console.error("❌ Google redirect appears to have failed - no user after 5 seconds");
                sessionStorage.removeItem('google_auth_redirect');
                if (isMounted) {
                  setError("Google sign-in failed. Please try signing in again.");
                  setLoading(false);
                }
              }
            }
          });
          
          // Set a timeout to check if auth completes within 15 seconds
          setTimeout(() => {
            if (!redirectHandled && sessionStorage.getItem('google_auth_redirect') === 'true') {
              const currentUser = auth.currentUser;
              if (!currentUser) {
                console.error("❌ Google redirect timeout - no user authenticated after 15 seconds");
                sessionStorage.removeItem('google_auth_redirect');
                if (isMounted) {
                  setError("Google sign-in timed out. The redirect may have been cancelled. Please try again.");
                  setLoading(false);
                }
              }
            }
          }, 15000);
        }
      } catch (err) {
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
      // Don't remove the flag yet - keep it until we successfully authenticate
      
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
              // redirectHandled will be set inside handleGoogleAuthSuccess
              setLoading(true);
              await handleGoogleAuthSuccess(currentUser);
              return;
            }
          } else {
            console.log(`⚠️ User still not authenticated after ${delay}ms (attempt ${attempt})`);
          }
          
          // Also check Redux state - AuthListener might have updated it
          if (authState.user && !redirectHandled && isMounted) {
            const user = authState.user;
            const auth = getFirebaseAuth();
            if (auth?.currentUser) {
              const isGoogleProvider = auth.currentUser.providerData.some(p => p.providerId === 'google.com');
              if (isGoogleProvider) {
                console.log("✅ User found in Redux state during auth check, processing:", user.email);
                // redirectHandled will be set inside handleGoogleAuthSuccess
                setLoading(true);
                await handleGoogleAuthSuccess(auth.currentUser);
                return;
              }
            }
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
  }, [router, authState.user]);
  
  // Separate effect to handle Redux auth state changes (AuthListener updates)
  useEffect(() => {
    if (!authState.user || redirecting) return;
    
    const wasRedirecting = sessionStorage.getItem('google_auth_redirect') === 'true';
    if (!wasRedirecting) return;
    
    // User was authenticated via Google redirect and now Redux state has updated
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    
    const isGoogleProvider = auth.currentUser.providerData.some(p => p.providerId === 'google.com');
    if (!isGoogleProvider) return;
    
    console.log("✅ User authenticated via Google (detected via Redux state):", authState.user.email);
    sessionStorage.removeItem('google_auth_redirect');
    setRedirecting(true);
    setLoading(false);
    
    const user = authState.user;
    // Fetch full user document to get orgId (ExtendedAuthUser doesn't include orgId)
    getUserDocument(user.uid).then((userDoc) => {
      if (user.role === "admin") {
        setTimeout(() => router.push("/dashboard"), 500);
      } else if (user.status === "pending" && !userDoc?.orgId) {
        setTimeout(() => router.push("/register-company"), 500);
      } else if (userDoc?.orgId && user.status === "active" && user.role === "sme") {
        setTimeout(() => router.push("/select-role"), 500);
      } else {
        setTimeout(() => router.push("/dashboard"), 500);
      }
    }).catch((error) => {
      console.error("Error fetching user document:", error);
      // Fallback to dashboard if user document fetch fails
      setTimeout(() => router.push("/dashboard"), 500);
    });
  }, [authState.user, redirecting, router]);

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
        } catch (createErr) {
          // If account already exists, try to sign in with static password
          const createError = createErr as { code?: string; message?: string };
          if (createError.code === "auth/email-already-in-use") {
            try {
              await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
            } catch (signInErr) {
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
        } catch (err) {
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
          setRedirecting(true);
          setLoading(false);
          setTimeout(() => {
          router.push("/dashboard");
          }, 500);
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

        setRedirecting(true);
        setLoading(false);

        if (userDoc?.status === "pending" && !userDoc?.orgId) {
          // User needs to register company
          console.log("✅ Redirecting to register-company (email login)");
          setTimeout(() => {
          router.push("/register-company");
          }, 500);
          return;
        } else if (userDoc?.orgId && userDoc.status === "active" && userDoc.role === "sme") {
          // User has been approved but still has default "sme" role
          // They need to select their specific role
          console.log("✅ Redirecting to select-role (email login)");
          setTimeout(() => {
          router.push("/select-role");
          }, 500);
          return;
        } else {
          // User is fully set up, go to dashboard
          console.log("✅ Redirecting to dashboard (email login)");
          setTimeout(() => {
          router.push("/dashboard");
          }, 500);
          return;
        }
      }
    } catch (err) {
      setError(getFirebaseAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    // Prevent multiple simultaneous sign-in attempts
    if (isGoogleSignInInProgress || loading || redirecting) {
      console.log("⚠️ Google sign-in already in progress, ignoring click");
      return;
    }

    setError(null);
    setLoading(true);
    setIsGoogleSignInInProgress(true);
    
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured. Please check your environment variables and restart the dev server.");
        setLoading(false);
        setIsGoogleSignInInProgress(false);
        return;
      }

      // Validate Google provider is configured
      if (!googleProvider) {
        setError("Google authentication provider is not configured.");
        setLoading(false);
        setIsGoogleSignInInProgress(false);
        return;
      }

      const currentUrl = window.location.href;
      const currentOrigin = window.location.origin;
      const currentHostname = window.location.hostname;
      const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(currentHostname);
      // Vercel deployments often have issues with redirects - use popup instead
      const isVercelDeployment = currentHostname.includes('.vercel.app') || 
                                  currentHostname.includes('vercel.app');
      
      console.log("🔄 Initiating Google sign-in from:", currentUrl);
      console.log("🔄 Current origin:", currentOrigin);
      console.log("🔄 Current hostname:", currentHostname);
      console.log("🔄 Is IP address:", isIpAddress);
      console.log("🔄 Is Vercel deployment:", isVercelDeployment);
      console.log("🔄 Firebase auth domain:", auth.config?.authDomain);
      console.log("🔄 Full Firebase config:", {
        apiKey: auth.config?.apiKey?.substring(0, 10) + "...",
        authDomain: auth.config?.authDomain
      });
      
      // Set additional scopes if needed
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      
      // Always use popup to avoid redirect timing issues in Next.js
      console.log("🔄 Using popup method for Google sign-in (default)");
      sessionStorage.setItem('google_auth_popup', 'true');
          
          try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log("✅ Google popup sign-in successful:", result.user.email);
            sessionStorage.removeItem('google_auth_popup');
            
            // Process the authentication immediately
            const firebaseUser = result.user;
            
            // Process popup authentication similar to redirect
            // Check if user was invited
            if (firebaseUser.email) {
              try {
                const linkedUser = await linkUserToInvitation(firebaseUser.uid, firebaseUser.email);
                if (linkedUser) {
                  await createOrUpdateUserDocument(firebaseUser.uid, {
                    email: firebaseUser.email || "",
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    role: linkedUser.role,
                    orgId: linkedUser.orgId,
                    orgName: linkedUser.orgName,
                    status: "active",
                    mfaEnabled: false,
                  });
                  const userDoc = await getUserDocument(firebaseUser.uid);
                  if (userDoc) {
                    setRedirecting(true);
                    setLoading(false);
                    setIsGoogleSignInInProgress(false); // Reset the flag on successful sign-in
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
              } catch {
                console.log("No invitation found, continuing normal flow");
              }
            }
            
            // Get or create user document
            let userDoc = await getUserDocument(firebaseUser.uid);
            const isAdminUser = firebaseUser.email === "admin@originx.com";
            
            if (!userDoc) {
              if (isAdminUser) {
                await createOrUpdateUserDocument(firebaseUser.uid, {
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName || "Admin",
                  photoURL: firebaseUser.photoURL,
                  role: "admin",
                  status: "active",
                  mfaEnabled: false,
                });
                userDoc = await getUserDocument(firebaseUser.uid);
              } else {
                // Non-admin users start as pending until they register company
                await createOrUpdateUserDocument(firebaseUser.uid, {
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  role: "sme",
                  status: "pending", // MUST be pending until company registration
                  mfaEnabled: false,
                });
                await new Promise(resolve => setTimeout(resolve, 300));
                userDoc = await getUserDocument(firebaseUser.uid);
              }
            } else if (isAdminUser) {
              // Ensure admin users are always admin and active
              await createOrUpdateUserDocument(firebaseUser.uid, {
                role: "admin",
                status: "active",
                displayName: firebaseUser.displayName || "Admin",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL,
              });
              userDoc = await getUserDocument(firebaseUser.uid);
            } else {
              // CRITICAL: Non-admin users without orgId MUST be pending
              // Fix any incorrectly set status
              if (!userDoc.orgId && userDoc.status === "active") {
                console.log("⚠️ Fixing incorrect user status: non-admin user without orgId should be pending");
                await createOrUpdateUserDocument(firebaseUser.uid, {
                  status: "pending", // Force to pending if no orgId
                  role: "sme", // Ensure role is sme if not set
                });
                userDoc = await getUserDocument(firebaseUser.uid);
              }
            }
            
            // Redirect based on user status
            setRedirecting(true);
            setLoading(false);
            
            console.log("🔄 Popup auth - User doc status:", {
              role: userDoc?.role,
              status: userDoc?.status,
              orgId: userDoc?.orgId,
              isAdminUser,
              email: firebaseUser.email
            });
            
            // CRITICAL: Admin users skip all checks and go directly to dashboard
            if (isAdminUser || userDoc?.role === "admin") {
              console.log("✅ Admin user - redirecting to dashboard");
              router.push("/dashboard");
              return;
            }
            
            // Non-admin users: Check MFA first
            if (userDoc?.mfaEnabled && userDoc?.mfaConfig?.method) {
              console.log("🔐 MFA required - showing MFA verification");
              setMfaMethod(userDoc.mfaConfig.method);
              setShowMFA(true);
              setLoading(false);
              return;
            }
            
            // Non-admin flow: Check if user needs to register company
            if (userDoc?.status === "pending" && !userDoc?.orgId) {
              console.log("📝 New user - redirecting to register-company");
              router.push("/register-company");
              return;
            }
            
            // Non-admin flow: User has org but needs to select role
            if (userDoc?.orgId && userDoc.status === "active" && userDoc.role === "sme") {
              console.log("👤 User needs to select role - redirecting to select-role");
              router.push("/select-role");
              return;
            }
            
            // Non-admin users with active status but no orgId shouldn't reach dashboard
            // Redirect them to register-company
            if (userDoc?.status === "active" && !userDoc?.orgId) {
              console.log("⚠️ Active user without orgId - redirecting to register-company");
              router.push("/register-company");
              return;
            }
            
            // Final fallback: Only allow dashboard for users with complete setup
            if (userDoc?.orgId && userDoc.status === "active" && userDoc.role && userDoc.role !== "sme") {
              console.log("✅ User fully set up - redirecting to dashboard");
              router.push("/dashboard");
              return;
            }
            
            // Default: Redirect to register-company for incomplete setup
            console.log("⚠️ User setup incomplete - redirecting to register-company");
            router.push("/register-company");
          } catch (popupError) {
            sessionStorage.removeItem('google_auth_popup');
            const error = popupError as { code?: string; message?: string };
            
            if (error.code === "auth/popup-blocked") {
              setError("Popup was blocked by your browser. Please allow popups and try again, or use localhost:3000 instead.");
            } else if (error.code === "auth/popup-closed-by-user") {
              setError("Sign-in popup was closed. Please try again.");
            } else if (error.code === "auth/cancelled-popup-request") {
              // This happens when multiple popup requests are made simultaneously
              // Don't show an error, just reset the state - user can try again
              console.log("⚠️ Popup request was cancelled (likely due to multiple clicks). User can try again.");
              setError(null); // Don't show error for cancelled popup
            } else {
              throw popupError; // Re-throw to be caught by outer catch
            }
            setLoading(false);
            setIsGoogleSignInInProgress(false);
            return;
        }
      }


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleMFAVerify(_code: string) {
    // MFA verified (code validated in MFAVerification component), proceed to dashboard
    setRedirecting(true);
    setShowMFA(false);
    setTimeout(() => {
    router.push("/dashboard");
    }, 500);
  }

  // Show loading screen when redirecting
  if (redirecting) {
    return <LoadingScreen message="Preparing your dashboard..." />;
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
            variant="outline"
            size="lg"
            disabled={loading}
            className={cn(
              "w-full font-semibold h-12",
              "border-2 border-border/50 bg-gradient-to-br from-background/50 to-background/30",
              "hover:border-primary hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10",
              "hover:text-primary hover:shadow-lg hover:shadow-primary/20",
              "transition-all duration-300 ease-out",
              "hover:scale-[1.03] hover:-translate-y-0.5",
              "active:scale-[0.98] active:translate-y-0",
              "backdrop-blur-sm relative overflow-hidden group",
              "hover:ring-2 hover:ring-primary/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
            )}
          >
            {/* Shine effect on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Button content */}
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
            disabled={loading || isGoogleSignInInProgress || redirecting}
            className={cn(
              "w-full font-medium h-12",
              "border-2 border-border/50 bg-gradient-to-br from-background/50 to-background/30",
              "hover:border-primary hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10",
              "hover:text-primary hover:shadow-lg hover:shadow-primary/20",
              "transition-all duration-300 ease-out",
              "hover:scale-[1.03] hover:-translate-y-0.5",
              "active:scale-[0.98] active:translate-y-0",
              "backdrop-blur-sm relative overflow-hidden group",
              "hover:ring-2 hover:ring-primary/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
            )}
          >
            {/* Shine effect on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FcGoogle size={20} className="transition-transform duration-300 group-hover:scale-110" />
              {loading || isGoogleSignInInProgress ? "Connecting..." : "Continue with Google"}
            </span>
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
