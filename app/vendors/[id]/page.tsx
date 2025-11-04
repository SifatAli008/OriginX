"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Home, ChevronRight, ArrowLeft } from "lucide-react";

interface VendorDetail {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  orgId: string | null;
  orgName?: string;
  createdAt: number;
  updatedAt: number;
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const authState = useAppSelector((s) => s.auth);
  const user = authState.user;
  const { addToast } = useToast();

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    (async () => {
      try {
        const auth = getFirebaseAuth();
        if (!auth?.currentUser) throw new Error("Not authenticated");
        const token = await auth.currentUser.getIdToken();
        const resp = await fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Failed to load vendor: ${resp.status}`);
        }
        const data = await resp.json();
        setVendor(data.user);
      } catch (e) {
        addToast({ variant: "error", title: "Error", description: e instanceof Error ? e.message : "Failed to load vendor" });
      } finally {
        setLoading(false);
      }
    })();
  }, [authState.status, user, router, id, addToast]);

  if (authState.status === "loading" || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user.role} userName={user.displayName || user.email}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
          <button className="text-white/80 hover:underline" onClick={() => router.push('/vendors')}>Vendors</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-white font-medium">Details</span>
        </nav>

        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/vendors')} className="border-gray-700 text-white hover:bg-gray-800">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Vendor Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !vendor ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div><span className="text-gray-400">Name:</span> {vendor.displayName || 'N/A'}</div>
                <div><span className="text-gray-400">Email:</span> {vendor.email}</div>
                <div><span className="text-gray-400">Role:</span> {vendor.role.toUpperCase()}</div>
                <div><span className="text-gray-400">Status:</span> {vendor.status}</div>
                <div><span className="text-gray-400">Organization:</span> {vendor.orgName || 'N/A'}</div>
                <div><span className="text-gray-400">Created:</span> {new Date(vendor.createdAt).toLocaleString()}</div>
                <div><span className="text-gray-400">Updated:</span> {new Date(vendor.updatedAt).toLocaleString()}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


