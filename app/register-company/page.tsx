"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/lib/store";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createCompanyRegistrationRequest, getOrganization } from "@/lib/firebase/company";
import { updateDoc, doc } from "firebase/firestore";
import { getFirestore } from "@/lib/firebase/client";
import { updateUserRole, getUserDocument } from "@/lib/firebase/firestore";
import { Loader2, Building2, CheckCircle2, Plus, Users, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import AuthCard from "@/app/(auth)/AuthCard";
import LoadingScreen from "@/components/loading/LoadingScreen";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  
  const [mode, setMode] = useState<"new" | "existing" | null>(null); // Start with null - user must select first
  const [companyId, setCompanyId] = useState<string>("");
  const [companyPassword, setCompanyPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    companyName?: string;
    companyType?: string;
    description?: string;
    address?: string;
    phone?: string;
    companyId?: string;
    companyPassword?: string;
  }>({});

  useEffect(() => {
    // Wait for auth to finish loading
    if (authState.status === "loading" || authState.status === "idle") {
      return;
    }
    
    // Redirect unauthenticated users to login
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    // Only proceed if user is authenticated
    if (authState.status === "authenticated" && user) {
      // Admin users should never see this page - redirect immediately
      if (user.role === "admin") {
        router.push("/dashboard");
        return;
      }
      // User already has a company (fully set up) - redirect to dashboard
      // Fetch user document to check orgId
      getUserDocument(user.uid).then((userDoc) => {
        if (userDoc?.orgId && user.status === "active" && user.role !== "sme") {
          router.push("/dashboard");
        }
      }).catch(() => {
        // Continue with registration if fetch fails
      });
    }
  }, [authState.status, user, router]);


  if (authState.status === "loading" || !user) {
    return <LoadingScreen message="Loading..." />;
  }

  // Validation functions
  const validateCompanyName = (name: string): string | undefined => {
    if (!name.trim()) {
      return "Company name is required";
    }
    if (name.trim().length < 2) {
      return "Company name must be at least 2 characters";
    }
    if (name.trim().length > 100) {
      return "Company name must be less than 100 characters";
    }
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return undefined; // Phone is optional
    // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phone.trim())) {
      return "Please enter a valid phone number";
    }
    return undefined;
  };

  const validateDescription = (desc: string): string | undefined => {
    if (!desc.trim()) return undefined; // Description is optional
    if (desc.trim().length > 500) {
      return "Description must be less than 500 characters";
    }
    return undefined;
  };

  const validateCompanyId = (id: string): string | undefined => {
    if (!id.trim()) {
      return "Company ID is required";
    }
    if (id.trim().length < 3) {
      return "Company ID must be at least 3 characters";
    }
    return undefined;
  };

  const validateCompanyPassword = (password: string): string | undefined => {
    if (!password.trim()) {
      return "Company password is required";
    }
    if (password.trim().length < 6) {
      return "Password must be at least 6 characters";
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    
    if (mode === "new") {
      errors.companyName = validateCompanyName(companyName);
      errors.phone = validatePhone(phone);
      errors.description = validateDescription(description);
    } else if (mode === "existing") {
      errors.companyId = validateCompanyId(companyId);
      errors.companyPassword = validateCompanyPassword(companyPassword);
    }
    
    setFieldErrors(errors);
    return !Object.values(errors).some(error => error !== undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth || !auth.currentUser || !user) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      if (mode === "existing") {
        // User wants to join existing company using ID and password
        if (!companyId.trim()) {
          setError("Please enter a company ID.");
          setLoading(false);
          return;
        }

        if (!companyPassword.trim()) {
          setError("Please enter a company password.");
          setLoading(false);
          return;
        }

        // Get organization details by ID
        const org = await getOrganization(companyId.trim());
        if (!org) {
          setError("Company not found. Please check your company ID and try again.");
          setLoading(false);
          return;
        }

        // Validate password - check if organization has a password field
        // For now, we'll check if password exists in org data
        // Note: In production, passwords should be hashed and stored securely
        const orgPassword = (org as { password?: string }).password;
        if (!orgPassword) {
          // If no password is set, allow access (backward compatibility)
          // In production, you might want to require password setup
          console.warn("Organization does not have a password set.");
        } else if (orgPassword !== companyPassword.trim()) {
          setError("Invalid company ID or password. Please try again.");
          setLoading(false);
          return;
        }

        // Update user document to join the organization
        const db = getFirestore();
        if (!db) {
          setError("Database not initialized. Please try again.");
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          orgId: companyId.trim(),
          orgName: org.name,
          status: "active",
          updatedAt: Date.now(),
        });

        // Set default role to sme - user will select specific role later
        await updateUserRole(user.uid, "sme");

        setSuccess(true);
        
        // Redirect to role selection after 2 seconds
        setTimeout(() => {
          router.push("/select-role");
        }, 2000);
      } else {
        // User wants to register new company
        // Validation already done above

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _requestId = await createCompanyRegistrationRequest(
          user.uid,
          user.email || "",
          user.displayName || undefined,
          {
            companyName: companyName.trim(),
            companyType: companyType.trim() || undefined,
            description: description.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
          }
        );

        setSuccess(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while checking authentication
  // Type assertion needed because TypeScript narrows the type incorrectly after useEffect checks
  const authStatus = authState.status as "idle" | "loading" | "authenticated" | "unauthenticated";
  if (authStatus === "loading" || authStatus === "idle") {
    return <LoadingScreen message="Loading..." />;
  }

  // Redirect unauthenticated users (will be handled by useEffect, but show loading while redirecting)
  if (authStatus === "unauthenticated") {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // Only show page if user is authenticated
  if (!user || authStatus !== "authenticated") {
    return <LoadingScreen message="Loading..." />;
  }

  if (success) {
    return (
      <AuthCard
        title={mode === "existing" ? "Successfully Joined!" : "Request Submitted"}
        subtitle={mode === "existing" 
          ? "You can now select your role" 
          : "An admin will review your request"}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted-foreground"
          >
            {mode === "existing" ? "Redirecting to role selection..." : "Redirecting to dashboard..."}
          </motion.p>
        </motion.div>
      </AuthCard>
    );
  }

  return (
          <AuthCard
            title="Company Registration"
            subtitle={
              mode === null 
                ? "Choose how you want to proceed with your company setup"
                : mode === "new" 
                  ? "Register a new company and get it approved" 
                  : "Join an existing company and select your role"
            }
            maxWidth={mode === null ? "2xl" : "2xl"}
            showLogout={mode === null}
            onBack={mode !== null ? () => setMode(null) : undefined}
          >

      {/* Mode Selection - Show only when mode is not selected */}
      {mode === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <motion.div
            initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
          <Card
            className={cn(
                "cursor-pointer transition-all duration-200",
                "border-2 hover:border-primary hover:shadow-lg",
                "bg-card hover:bg-accent/50",
                "group h-full"
            )}
              onClick={() => setMode("new")}
          >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8 text-primary" />
                </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-semibold text-lg mb-2">Register New Company</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a new company profile. Requires admin approval.
                    </p>
                    <div className="inline-flex px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary font-medium">Requires approval</p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
          <Card
            className={cn(
                "cursor-pointer transition-all duration-200",
                "border-2 hover:border-primary hover:shadow-lg",
                "bg-card hover:bg-accent/50",
                "group h-full"
            )}
              onClick={() => setMode("existing")}
          >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8 text-primary" />
                </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-semibold text-lg mb-2">Join Existing Company</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Join an existing organization. Get immediate access.
                    </p>
                    <div className="inline-flex px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary font-medium">Immediate access</p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </div>
      ) : (
        <>
          <motion.form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
          {mode === "existing" ? (
            /* Join Existing Company */
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                {/* Company ID Field */}
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Label htmlFor="companyId" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Company ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyId"
                    type="text"
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value);
                      if (fieldErrors.companyId) {
                        setFieldErrors(prev => ({ ...prev, companyId: validateCompanyId(e.target.value) }));
                      }
                    }}
                    onBlur={() => {
                      setFieldErrors(prev => ({ ...prev, companyId: validateCompanyId(companyId) }));
                    }}
                    placeholder="Enter your company ID"
                    required
                    minLength={3}
                    disabled={loading}
                    className={cn(
                      "h-12 transition-all duration-200",
                      "focus:ring-2 focus:ring-primary/20",
                      "hover:border-primary/50",
                      fieldErrors.companyId && "border-destructive focus:ring-destructive/20"
                    )}
                  />
                  {fieldErrors.companyId && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-destructive" />
                      {fieldErrors.companyId}
                    </p>
                  )}
                </motion.div>

                {/* Company Password Field */}
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Label htmlFor="companyPassword" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Company Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="companyPassword"
                      type={showPassword ? "text" : "password"}
                      value={companyPassword}
                      onChange={(e) => {
                        setCompanyPassword(e.target.value);
                        if (fieldErrors.companyPassword) {
                          setFieldErrors(prev => ({ ...prev, companyPassword: validateCompanyPassword(e.target.value) }));
                        }
                      }}
                      onBlur={() => {
                        setFieldErrors(prev => ({ ...prev, companyPassword: validateCompanyPassword(companyPassword) }));
                      }}
                      placeholder="Enter your company password"
                      required
                      minLength={6}
                      disabled={loading}
                      autoComplete="current-password"
                      className={cn(
                        "h-12 pr-10 transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20",
                        "hover:border-primary/50",
                        fieldErrors.companyPassword && "border-destructive focus:ring-destructive/20"
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword((s) => !s)}
                      disabled={loading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div>
                  {fieldErrors.companyPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-destructive" />
                      {fieldErrors.companyPassword}
                    </p>
                  )}
                </motion.div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    You&apos;ll gain immediate access and can choose your role next.
                  </p>
                </div>
              </motion.div>
          ) : (
            /* Register New Company Form */
            <>
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Label htmlFor="companyName" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (fieldErrors.companyName) {
                        setFieldErrors(prev => ({ ...prev, companyName: validateCompanyName(e.target.value) }));
                      }
                    }}
                    onBlur={() => {
                      setFieldErrors(prev => ({ ...prev, companyName: validateCompanyName(companyName) }));
                    }}
                    placeholder="Enter your company name (2-100 characters)"
              required
                    minLength={2}
                    maxLength={100}
              disabled={loading}
                    className={cn(
                      "h-12 transition-all duration-200",
                      "focus:ring-2 focus:ring-primary/20",
                      "hover:border-primary/50",
                      fieldErrors.companyName && "border-destructive focus:ring-destructive/20"
                    )}
                  />
                  {fieldErrors.companyName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-destructive" />
                      {fieldErrors.companyName}
                    </p>
                  )}
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (fieldErrors.description) {
                        setFieldErrors(prev => ({ ...prev, description: validateDescription(e.target.value) }));
                      }
                    }}
                    onBlur={() => {
                      setFieldErrors(prev => ({ ...prev, description: validateDescription(description) }));
                    }}
                    placeholder="Brief description of your company (max 500 characters)"
                    rows={3}
                    maxLength={500}
              disabled={loading}
                    className={cn(
                      "resize-none transition-all duration-200",
                      "focus:ring-2 focus:ring-primary/20",
                      "hover:border-primary/50",
                      fieldErrors.description && "border-destructive focus:ring-destructive/20"
                    )}
                  />
                  <div className="flex items-center justify-between">
                    {fieldErrors.description && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-destructive" />
                        {fieldErrors.description}
                      </p>
                    )}
                    <p className={cn(
                      "text-xs ml-auto",
                      description.length > 450 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {description.length}/500
                    </p>
          </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    <Label htmlFor="companyType" className="text-sm font-medium">
                      Company Type
            </Label>
            <Input
                      id="companyType"
              type="text"
                      value={companyType}
                      onChange={(e) => {
                        setCompanyType(e.target.value);
                        if (fieldErrors.companyType) {
                          setFieldErrors(prev => ({ ...prev, companyType: undefined }));
                        }
                      }}
                      placeholder="e.g., Manufacturing, Distribution, Retail"
                      maxLength={50}
              disabled={loading}
                      className={cn(
                        "h-12 transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20",
                        "hover:border-primary/50",
                        fieldErrors.companyType && "border-destructive focus:ring-destructive/20"
                      )}
                    />
                    {fieldErrors.companyType && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-destructive" />
                        {fieldErrors.companyType}
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                  >
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors(prev => ({ ...prev, phone: validatePhone(e.target.value) }));
                        }
                      }}
                      onBlur={() => {
                        setFieldErrors(prev => ({ ...prev, phone: validatePhone(phone) }));
                      }}
                      placeholder="e.g., +1234567890, (123) 456-7890"
                      maxLength={20}
              disabled={loading}
                      className={cn(
                        "h-12 transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20",
                        "hover:border-primary/50",
                        fieldErrors.phone && "border-destructive focus:ring-destructive/20"
                      )}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-destructive" />
                        {fieldErrors.phone}
                      </p>
                    )}
                  </motion.div>
          </div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <Label htmlFor="address" className="text-sm font-medium">
                      Address
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (fieldErrors.address) {
                          setFieldErrors(prev => ({ ...prev, address: undefined }));
                        }
                      }}
                      placeholder="Company address"
                      maxLength={200}
                      disabled={loading}
                      className={cn(
                        "h-12 transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20",
                        "hover:border-primary/50",
                        fieldErrors.address && "border-destructive focus:ring-destructive/20"
                      )}
                    />
                    {fieldErrors.address && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-destructive" />
                        {fieldErrors.address}
                      </p>
                    )}
                  </motion.div>
            </>
          )}

          {/* Error Message */}
            <AnimatePresence>
          {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-md bg-destructive/10 border border-destructive/20 p-3"
                >
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    {error}
                  </p>
                </motion.div>
          )}
            </AnimatePresence>

          {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "existing" ? 1.0 : 1.3 }}
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
                  {loading 
                    ? (mode === "existing" ? "Joining..." : "Submitting...")
                    : mode === "existing" 
                      ? "Join Company"
                      : "Submit Registration Request"}
                </span>
          </Button>
            </motion.div>

          {mode === "new" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  An admin will review and approve your request.
            </p>
              </motion.div>
            )}
          </motion.form>
        </>
      )}
    </AuthCard>
  );
}

