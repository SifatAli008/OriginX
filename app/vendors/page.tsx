"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  Home,
  ChevronRight,
  Building2,
  CheckCircle,
  Package2,
  Star,
  Search,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface VendorListItem {
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
  orgId: string | null;
  orgName?: string;
  createdAt: number;
  products: number;
}

export default function VendorsPage() {
  const router = useRouter();
  const authState = useAppSelector((s) => s.auth);
  const user = authState.user;
  const { addToast } = useToast();

  const [stats, setStats] = useState({ total: 0, active: 0, totalProducts: 0, avgRating: 0 });
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, user, router]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error("Not authenticated");
      const token = await auth.currentUser.getIdToken();
      const resp = await fetch('/api/vendors', { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load vendors: ${resp.status}`);
      }
      const data = await resp.json();
      setStats({
        total: data.stats?.total || 0,
        active: data.stats?.active || 0,
        totalProducts: data.stats?.totalProducts || 0,
        avgRating: data.stats?.avgRating || 0,
      });
      setVendors(data.vendors || []);
    } catch (e) {
      addToast({ variant: "error", title: "Error", description: e instanceof Error ? e.message : "Failed to load vendors" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const filtered = vendors.filter(v => {
    const s = searchTerm.toLowerCase();
    return (
      (v.displayName || '').toLowerCase().includes(s) ||
      v.email.toLowerCase().includes(s) ||
      (v.orgName || '').toLowerCase().includes(s) ||
      v.role.toLowerCase().includes(s)
    );
  });

  if (authState.status === "loading" || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={user.role} userName={user.displayName || user.email}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
          <span className="text-white font-medium">Vendors</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">Vendors</h1>
            <p className="text-gray-400 text-lg">Auditors, Warehouses, SMEs and Suppliers</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Vendors</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50"><Building2 className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50"><CheckCircle className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats.active}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Products</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50"><Package2 className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Avg Rating</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50"><Star className="h-6 w-6" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{stats.avgRating.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Button variant="outline" onClick={loadVendors} disabled={loading} className="border-gray-800 text-white hover:bg-gray-800/50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Vendors table */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400">Loading vendors...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No vendors found</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Products</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtered.map(v => (
                      <tr key={v.uid} className="hover:bg-gray-800/30">
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-white font-medium">{v.displayName || v.email}</p>
                            <p className="text-sm text-gray-400">{v.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-300 text-sm">{v.role.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-4"><span className="text-gray-300">{v.orgName || 'N/A'}</span></td>
                        <td className="px-4 py-4"><span className="text-gray-300 capitalize">{v.status}</span></td>
                        <td className="px-4 py-4"><span className="text-gray-300">{v.products}</span></td>
                        <td className="px-4 py-4 text-right">
                          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                            onClick={() => router.push(`/vendors/${v.uid}`)}>
                            View <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


