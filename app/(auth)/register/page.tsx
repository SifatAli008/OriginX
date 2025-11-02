"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { createUserWithEmailAndPassword, updateProfile, signInWithRedirect, getRedirectResult } from "firebase/auth";
import AuthCard from "../AuthCard";
import { FcGoogle } from "react-icons/fc";
import { useAppSelector } from "@/lib/store";
import { Eye, EyeOff, Loader2, User, Mail, Lock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getFirebaseAuthErrorMessage } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createOrUpdateUserDocument, getUserDocument } from "@/lib/firebase/firestore";
import LoadingScreen from "@/components/loading/LoadingScreen";

function getPasswordStrength(password: string): { strength: number; label: string; color: string } {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;
  
  if (strength <= 2) return { strength, label: "Weak", color: "bg-destructive" };
  if (strength <= 3) return { strength, label: "Fair", color: "bg-orange-500" };
  if (strength <= 4) return { strength, label: "Good", color: "bg-yellow-500" };
  return { strength, label: "Strong", color: "bg-green-500" };
}

const passwordRequirements = [
  { text: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { text: "Contains uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { text: "Contains lowercase letter", check: (p: string) => /[a-z]/.test(p) },
  { text: "Contains number", check: (p: string) => /\d/.test(p) },
  { text: "Contains special character", check: (p: string) => /[^a-zA-Z\d]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const authState = useAppSelector((s) => s.auth);
  const user = authState.user;

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Handle redirect result for Google sign-in
  useEffect(() => {
    let isMounted = true;
    
    const handleRedirectResult = async () => {
      try {
        const auth = getFirebaseAuth();
        if (!auth) {
          console.log("Firebase auth not initialized");
          return;
        }

        // Check for redirect result immediately
        const result = await getRedirectResult(auth);
        if (result && isMounted) {
          console.log("Google redirect result received:", result.user.email);
          setRedirecting(true);
          
          // Wait for AuthListener to create user document
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check user document and redirect accordingly
          const userDoc = await getUserDocument(result.user.uid);
          const isAdmin = result.user.email === "admin@originx.com";
          
            if (isMounted) {
            if (isAdmin || userDoc?.role === "admin") {
              router.push("/dashboard");
            } else if (userDoc?.status === "pending" && !userDoc?.orgId) {
              router.push("/register-company");
            } else {
              router.push("/dashboard");
            }
          }
        }
      } catch (err: unknown) {
        console.error("Error handling redirect result:", err);
        if (isMounted) {
          const errorMessage = getFirebaseAuthErrorMessage(err);
          setError(errorMessage);
          setRedirecting(false);
        }
      }
    };

    // Check immediately to catch redirect result
    handleRedirectResult();

    return () => {
      isMounted = false;
    };
  }, [router]);
  
  // Show loading screen when redirecting
  if (redirecting) {
    return <LoadingScreen message="Setting up your account..." />;
  }

  async function handleRegister(e: React.FormEvent) {
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
      
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Update display name if provided
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      
      // Create user document in Firestore
      const isAdmin = email.trim().toLowerCase() === "admin@originx.com";
      await createOrUpdateUserDocument(cred.user.uid, {
        email: email.trim(),
        displayName: name.trim() || null,
        photoURL: null,
        role: isAdmin ? "admin" : "sme",
        status: isAdmin ? "active" : "pending",
        mfaEnabled: false,
      });
      
      // Wait for user document to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check user document and redirect accordingly
      const userDoc = await getUserDocument(cred.user.uid);
      
      setRedirecting(true);
      setLoading(false);
      
      if (isAdmin || userDoc?.role === "admin") {
        // Admin goes directly to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      } else if (userDoc?.status === "pending" && !userDoc?.orgId) {
        // Non-admin users need to register company
        setTimeout(() => {
          router.push("/register-company");
        }, 500);
      } else {
        // Otherwise go to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      }
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        setError("Firebase is not configured. Please contact support.");
        setLoading(false);
        return;
      }
      
      console.log("Initiating Google sign-in redirect from:", window.location.href);
      // Use redirect instead of popup to avoid COOP issues
      await signInWithRedirect(auth, googleProvider);
      // The redirect will navigate away immediately
      // The result will be handled in the useEffect when the page loads after redirect
    } catch (err: unknown) {
      console.error("Error initiating Google sign-in:", err);
      const errorMessage = getFirebaseAuthErrorMessage(err);
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your OriginX account" subtitle="Join the platform">
      <form onSubmit={handleRegister} className="flex flex-col gap-6">
        {/* Name Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={loading}
            placeholder="John Doe"
            className={cn(
              "h-12 transition-all duration-200",
              "focus:ring-2 focus:ring-primary/20",
              "hover:border-primary/50"
            )}
          />
        </motion.div>

        {/* Email Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
            disabled={loading}
            className={cn(
              "h-12 transition-all duration-200",
              "focus:ring-2 focus:ring-primary/20",
              "hover:border-primary/50"
            )}
          />
        </motion.div>

        {/* Password Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
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
              onChange={(e) => {
                setPassword(e.target.value);
                setShowRequirements(true);
              }}
              onFocus={() => setShowRequirements(true)}
              autoComplete="new-password"
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

          {/* Password Strength Indicator */}
          {password && showRequirements && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password strength:</span>
                <span className={cn(
                  "font-medium",
                  passwordStrength.strength <= 2 && "text-destructive",
                  passwordStrength.strength === 3 && "text-orange-500",
                  passwordStrength.strength === 4 && "text-yellow-500",
                  passwordStrength.strength >= 5 && "text-green-500"
                )}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn("h-full", passwordStrength.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Password Requirements */}
              <div className="space-y-1.5 pt-2">
                {passwordRequirements.map((req, idx) => {
                  const isValid = req.check(password);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        isValid ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5 transition-all",
                          isValid ? "opacity-100 scale-100" : "opacity-30 scale-90"
                        )}
                      />
                      <span>{req.text}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
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

        {/* Create Account Button */}
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
              "transition-all duration-200",
              "hover:bg-accent hover:border-primary/50",
              "hover:scale-[1.02] active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account..." : "Create account"}
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

        {/* Sign In Link */}
        <motion.p
          className="text-sm text-muted-foreground text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline transition-all hover:text-primary/80"
          >
            Sign in
          </Link>
        </motion.p>
      </form>
    </AuthCard>
  );
}


