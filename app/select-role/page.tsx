"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/store";
import { setUser } from "@/lib/store/authSlice";
import { updateUserRole, getUserDocument } from "@/lib/firebase/firestore";
import { getRegistrationRequestsByUser } from "@/lib/firebase/company";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { ExtendedAuthUser, UserRole } from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Package, Warehouse, FileCheck, ShieldCheck, LogOut, ArrowRight } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import HeroVectors from "@/components/visuals/HeroVectors";
import Link from "next/link";

const ROLE_OPTIONS: {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "sme",
    label: "SME / Supplier",
    description: "Register products, manage inventory, and track shipments",
    icon: <Building2 className="h-8 w-8" />,
  },
  {
    value: "supplier",
    label: "Supplier",
    description: "Similar to SME - register products and manage your supply chain",
    icon: <Package className="h-8 w-8" />,
  },
  {
    value: "warehouse",
    label: "Warehouse",
    description: "Manage inbound/outbound shipments, QC logs, and inventory",
    icon: <Warehouse className="h-8 w-8" />,
  },
  {
    value: "auditor",
    label: "Auditor",
    description: "View verifications, compliance reports, and audit trails (read-only)",
    icon: <FileCheck className="h-8 w-8" />,
  },
];

export default function SelectRolePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  // Get initial reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mediaQuery.matches);
      const handleChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      const x = (e.clientX / rect.width) - 0.5;
      const y = (e.clientY / rect.height) - 0.5;
      setPointer({ x, y });
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 200,
        y: (e.clientY / window.innerHeight - 0.5) * 200,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    } else if (user) {
      // Admin should never see this page
      if (user.role === "admin") {
        router.push("/dashboard");
        return;
      }
      // User already has a specific role that's not the default sme/supplier
      // If they have warehouse or auditor role, they've already selected and should go to dashboard
      // (Admin case is already handled above)
      if (user.role === "warehouse" || user.role === "auditor") {
        router.push("/dashboard");
        return;
      }
      // Note: sme and supplier are valid roles users can select, but they can also be defaults
      // So we allow them to stay on this page to confirm/change their role if needed
      // User doesn't have an org yet, they need to register
      if (!user.orgId || user.status === "pending") {
        router.push("/register-company");
        return;
      }
      // User has orgId and is active, but still has default role - show role selection
      if (user.orgId && user.status === "active" && (user.role === "sme" || user.role === "supplier")) {
        // Allow them to stay on this page to select role
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
        return;
      }
    }
  }, [authState.status, user, router]);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!user) return;

      try {
        // Fetch the full user document to check roleSelectedAt
        const userDoc = await getUserDocument(user.uid);
        
        if (!userDoc) {
          router.push("/register-company");
          return;
        }

        // If user has already selected a role (roleSelectedAt exists), redirect to dashboard
        // This ensures one-time role selection - once selected, they never see this page again
        if (userDoc.roleSelectedAt) {
          console.log("Select-role - User has already selected role, redirecting to dashboard");
          router.push("/dashboard");
          return;
        }

        // Check if user has a pending or approved registration request
        const requests = await getRegistrationRequestsByUser(user.uid);
        const approvedRequest = requests.find(r => r.status === "approved");
        
        if (!approvedRequest && requests.length > 0) {
          // Has pending request - wait for approval
          setLoading(false);
          return;
        } else if (!approvedRequest) {
          // No request at all
          router.push("/register-company");
          return;
        }

        // User has approved request but hasn't selected role yet - show role selection
        setLoading(false);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error.message || "Failed to check registration status");
        setLoading(false);
      }
    };

    if (user && user.orgId && user.status === "active") {
      checkRegistrationStatus();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, [user, router]);

  const handleRoleSelect = async (role: UserRole) => {
    if (!user) return;

    setSelecting(true);
    setSelectedRole(role);
    setError(null);

    try {
      // Update the role in Firestore
      await updateUserRole(user.uid, role);
      
      // Fetch the updated user document to refresh the auth state
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        const updatedUserDoc = await getUserDocument(user.uid);
        
        if (updatedUserDoc) {
          // Update Redux state immediately with the new role
          // This ensures the dashboard will display the correct role-specific content
          const extendedUser: ExtendedAuthUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: updatedUserDoc.role, // New role (sme, supplier, warehouse, or auditor)
            orgId: updatedUserDoc.orgId,
            orgName: updatedUserDoc.orgName,
            mfaEnabled: updatedUserDoc.mfaEnabled,
            status: updatedUserDoc.status, // Should be "active"
          };
          dispatch(setUser(extendedUser));
          
          // Wait a bit longer to ensure Redux state propagates and dashboard reads the correct role
          // The dashboard will render role-specific content based on this updated role
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Redirect to dashboard - it will show role-specific content (Admin, SME, Warehouse, or Auditor dashboard)
          router.push("/dashboard");
          router.refresh(); // Force refresh to ensure latest state
        } else {
          throw new Error("Failed to fetch updated user data");
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to update role. Please try again.");
      setSelecting(false);
      setSelectedRole(null);
    }
  };

  if (authState.status === "loading" || loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen grid place-items-center px-4 py-12 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, hsl(var(--primary) / 0.05) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.03) 0%, transparent 50%),
          linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--background))),
          linear-gradient(to top left, hsl(var(--background)), hsl(var(--background) / 0.8))
        `,
      }}
    >
      {/* Multi-layer animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Hero Section Vector Effects */}
        <HeroVectors pointer={pointer} reduced={reduced} />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Dotted overlay pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Large animated blobs - Layer 1 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/12 rounded-full blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 60, 0],
            scale: [1, 0.85, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Medium blobs - Layer 2 */}
        <motion.div
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-primary/6 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        <motion.div
          className="absolute bottom-1/3 left-1/3 w-[350px] h-[350px] bg-primary/7 rounded-full blur-3xl"
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Small accent blobs */}
        <motion.div
          className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-primary/10 rounded-full blur-2xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 30, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
        <motion.div
          className="absolute bottom-1/2 left-1/5 w-[180px] h-[180px] bg-primary/8 rounded-full blur-2xl"
          animate={{
            x: [0, -25, 0],
            y: [0, 25, 0],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Cursor-reactive gradient */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl"
          animate={{
            x: `${mousePosition.x * 0.5}px`,
            y: `${mousePosition.y * 0.5}px`,
          }}
          transition={{
            type: "spring",
            stiffness: 50,
            damping: 20,
          }}
        />

        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-primary/8 via-primary/4 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 0.8, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Subtle shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent"
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-6 left-6 z-20"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              const auth = getFirebaseAuth();
              if (auth) {
                await auth.signOut();
              }
              router.push("/login");
            } catch (error) {
              console.error("Sign out error:", error);
            }
          }}
          className={cn(
            "gap-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200",
            "backdrop-blur-sm bg-background/50 border border-border/50",
            "hover:scale-105 active:scale-95"
          )}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </motion.div>

      {/* Main Content Card */}
      <motion.div 
        variants={cardVariants} 
        className="w-full mx-auto relative z-10 max-w-4xl"
      >
        <Card className="shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="pt-6 px-6 pb-3 border-b border-border/50"
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-3 group mb-2"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
                <div className="relative bg-primary/10 rounded-lg p-2.5 group-hover:bg-primary/15 transition-all duration-300 group-hover:scale-105">
                  <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-2xl font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
                  OriginX
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Anti‑Counterfeit Platform
                </span>
              </div>
            </Link>
          </motion.div>

          <CardHeader className="flex flex-col items-start gap-1 pb-4 pt-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-3xl font-bold text-foreground">
                Select Your Role
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CardDescription className="text-sm mt-1.5">
                Your company registration has been approved! Please select your role to continue.
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="pb-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-md bg-destructive/10 border border-destructive/20 p-3"
                >
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    {error}
                  </p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLE_OPTIONS.map((option, index) => (
                  <motion.div
                    key={option.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        "border-2 hover:border-primary hover:shadow-lg",
                        "bg-card hover:bg-accent/50",
                        selecting && "opacity-50 cursor-not-allowed",
                        selecting && selectedRole === option.value && "ring-2 ring-primary border-primary"
                      )}
                      onClick={() => !selecting && handleRoleSelect(option.value)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 group-hover:scale-110 transition-transform">
                            <div className="text-primary">
                              {option.icon}
                            </div>
                          </div>
                          <CardTitle className="text-xl">{option.label}</CardTitle>
                        </div>
                        <CardDescription>{option.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full border-2 border-border/50 bg-gradient-to-br from-background/50 to-background/30",
                            "hover:border-primary hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10",
                            "hover:text-primary hover:shadow-lg hover:shadow-primary/20",
                            "transition-all duration-300 ease-out",
                            "hover:scale-[1.03] hover:-translate-y-0.5",
                            "active:scale-[0.98] active:translate-y-0",
                            "backdrop-blur-sm relative overflow-hidden group",
                            "hover:ring-2 hover:ring-primary/30",
                            selecting && "opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0"
                          )}
                          disabled={selecting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoleSelect(option.value);
                          }}
                        >
                          {/* Shine effect on hover */}
                          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                          
                          {/* Button content */}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {selecting && selectedRole === option.value ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <span className="font-medium">Select Role</span>
                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                              </>
                            )}
                          </span>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0 }}
                className="text-sm text-muted-foreground text-center pt-4"
              >
                You can contact an admin if you need to change your role later.
              </motion.p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

