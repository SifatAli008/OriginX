"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import type { UserRole } from "@/lib/types/user";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requireAuth?: boolean;
}

/**
 * Client-side auth guard component
 * Protects routes based on authentication and role
 */
export function AuthGuard({ 
  children, 
  requiredRole, 
  requireAuth = true 
}: AuthGuardProps) {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  useEffect(() => {
    if (requireAuth && authState.status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (requireAuth && user && requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(user.role)) {
        router.push("/dashboard");
        return;
      }
    }
  }, [authState.status, user, requiredRole, requireAuth, router]);

  if (requireAuth && authState.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  if (requiredRole && user) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

