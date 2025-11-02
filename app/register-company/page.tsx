"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppSelector } from "@/lib/store";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createCompanyRegistrationRequest, getAllOrganizations, getOrganization } from "@/lib/firebase/company";
import { updateDoc, doc } from "firebase/firestore";
import { getFirestore } from "@/lib/firebase/client";
import { updateUserRole } from "@/lib/firebase/firestore";
import { Loader2, Building2, CheckCircle2, Plus, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; type?: string }>>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
    } else if (user) {
      // Admin users should never see this page - redirect immediately
      if (user.role === "admin") {
        router.push("/dashboard");
        return;
      }
      // User already has a company
      if (user.orgId) {
        router.push("/dashboard");
      }
    }
  }, [authState.status, user, router]);

  // Load existing organizations when user selects "Join Existing"
  useEffect(() => {
    const loadOrganizations = async () => {
      if (mode === "existing") {
        setLoadingOrgs(true);
        try {
          const orgs = await getAllOrganizations();
          setOrganizations(orgs);
        } catch (err: unknown) {
          console.error("Failed to load organizations:", err);
          setError("Failed to load existing companies. Please try again.");
        } finally {
          setLoadingOrgs(false);
        }
      }
    };
    loadOrganizations();
  }, [mode]);

  if (authState.status === "loading" || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth || !auth.currentUser || !user) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }

      if (mode === "existing") {
        // User wants to join existing company
        if (!selectedOrgId) {
          setError("Please select a company to join.");
          setLoading(false);
          return;
        }

        // Get organization details
        const org = await getOrganization(selectedOrgId);
        if (!org) {
          setError("Selected company not found. Please try again.");
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
          orgId: selectedOrgId,
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
        if (!companyName.trim()) {
          setError("Company name is required.");
          setLoading(false);
          return;
        }

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

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4 p-8 bg-card border rounded-lg shadow-lg text-center"
        >
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {mode === "existing" ? "Successfully Joined Company!" : "Registration Request Submitted"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {mode === "existing" 
              ? "You have successfully joined the company. You'll now be able to select your role."
              : "Your company registration request has been submitted successfully. An admin will review your request and notify you once it's approved."
            }
          </p>
          <p className="text-sm text-muted-foreground">
            {mode === "existing" ? "Redirecting to role selection..." : "Redirecting to dashboard..."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-card border rounded-lg shadow-lg p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Company Registration</h1>
            <p className="text-muted-foreground">
              Register a new company or join an existing one.
            </p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <Card
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              mode === "new" && "border-primary bg-primary/5",
              loading && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !loading && setMode("new")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  mode === "new" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Register New Company</h3>
                  <p className="text-xs text-muted-foreground">Create a new company profile</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              mode === "existing" && "border-primary bg-primary/5",
              loading && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !loading && setMode("existing")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  mode === "existing" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Join Existing Company</h3>
                  <p className="text-xs text-muted-foreground">Access an existing organization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "existing" ? (
            /* Join Existing Company */
            <div className="space-y-2">
              <Label htmlFor="existingCompany" className="text-sm font-medium">
                Select Company <span className="text-destructive">*</span>
              </Label>
              {loadingOrgs ? (
                <div className="flex items-center justify-center p-8 border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading companies...</span>
                </div>
              ) : organizations.length === 0 ? (
                <div className="p-4 border rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    No existing companies found. Please register a new company instead.
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedOrgId}
                  onValueChange={setSelectedOrgId}
                  disabled={loading}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a company to join" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} {org.type ? `(${org.type})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                You&apos;ll gain immediate access to the selected company and can choose your role next.
              </p>
            </div>
          ) : (
            /* Register New Company Form */
            <>
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              required
              disabled={loading}
              className="h-12"
            />
          </div>

          {/* Company Type */}
          <div className="space-y-2">
            <Label htmlFor="companyType" className="text-sm font-medium">
              Company Type
            </Label>
            <Input
              id="companyType"
              type="text"
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              placeholder="e.g., Manufacturing, Distribution, Retail"
              disabled={loading}
              className="h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your company"
              rows={4}
              disabled={loading}
              className="resize-none"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address
            </Label>
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Company address"
              disabled={loading}
              className="h-12"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contact phone number"
              disabled={loading}
              className="h-12"
            />
          </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className={cn(
              "w-full font-semibold h-12",
              "transition-all duration-300",
              "hover:shadow-lg hover:shadow-primary/25",
              "disabled:opacity-50"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "existing" ? "Joining..." : "Submitting..."}
              </>
            ) : mode === "existing" ? (
              "Join Company"
            ) : (
              "Submit Registration Request"
            )}
          </Button>

          {mode === "new" && (
            <p className="text-sm text-muted-foreground text-center">
              After submitting, you&apos;ll be notified once an admin approves your request.
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}

