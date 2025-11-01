"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { updateUserRole } from "@/lib/firebase/firestore";
import { getRegistrationRequestsByUser } from "@/lib/firebase/company";
import type { UserRole } from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Package, Warehouse, FileCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // User already has a specific role (not default sme/supplier)
      if (user.role !== "sme" && user.role !== "supplier") {
        router.push("/dashboard");
        return;
      }
      // User doesn't have an org yet, they need to register
      if (!user.orgId || user.status === "pending") {
        router.push("/register-company");
        return;
      }
      // User has orgId and is active, but still has default role - show role selection
      if (user.orgId && user.status === "active" && (user.role === "sme" || user.role === "supplier")) {
        // Allow them to stay on this page to select role
        setLoading(false);
        return;
      }
    }
  }, [authState.status, user, router]);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!user) return;

      try {
        // Check if user has a pending or approved registration request
        const requests = await getRegistrationRequestsByUser(user.uid);
        const approvedRequest = requests.find(r => r.status === "approved");
        
        if (!approvedRequest && requests.length > 0) {
          // Has pending request
          setLoading(false);
          return;
        } else if (!approvedRequest) {
          // No request at all
          router.push("/register-company");
          return;
        }

        // User has approved request but hasn't selected role yet
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to check registration status");
        setLoading(false);
      }
    };

    if (user && user.orgId) {
      checkRegistrationStatus();
    } else {
      setLoading(false);
    }
  }, [user, router]);

  const handleRoleSelect = async (role: UserRole) => {
    if (!user) return;

    setSelecting(true);
    setError(null);

    try {
      await updateUserRole(user.uid, role);
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to update role. Please try again.");
      setSelecting(false);
    }
  };

  if (authState.status === "loading" || loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Role</h1>
          <p className="text-muted-foreground">
            Your company registration has been approved! Please select your role to continue.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLE_OPTIONS.map((option, index) => (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary",
                  selecting && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !selecting && handleRoleSelect(option.value)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {option.icon}
                    </div>
                    <CardTitle className="text-xl">{option.label}</CardTitle>
                  </div>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    disabled={selecting}
                    onClick={() => handleRoleSelect(option.value)}
                  >
                    {selecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Select Role"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          You can contact an admin if you need to change your role later.
        </p>
      </motion.div>
    </div>
  );
}

