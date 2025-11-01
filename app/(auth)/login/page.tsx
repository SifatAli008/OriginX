"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import AuthCard from "../AuthCard";
import { FcGoogle } from "react-icons/fc";
import { useAppSelector, RootState } from "@/lib/store";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const authState = useAppSelector((s: RootState) => s.auth);

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
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.href = "/";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unable to sign in";
      setError(errorMessage);
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
        setError("Firebase is not configured. Please contact support.");
        setLoading(false);
        return;
      }
      await signInWithPopup(auth, googleProvider);
      window.location.href = "/";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Google sign-in failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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


