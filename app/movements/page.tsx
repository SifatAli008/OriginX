"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Truck,
  Search,
  Plus,
  Eye,
  MapPin,
  ChevronRight,
  Home,
  RefreshCw,
  Package,
  ArrowRight,
  ArrowUpDown,
  CheckCircle,
  Clock,
  XCircle,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";

interface Movement {
  id: string;
  type: "inbound" | "outbound";
  product: string;
  quantity: number;
  from: string;
  to: string;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  trackingNumber: string;
  createdAt: Date;
  estimatedDelivery?: Date;
}

function MovementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const typeFilter = searchParams.get("type") || "all";
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const params = new URLSearchParams({
        page: "1",
        pageSize: "50",
      });

      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }

      const response = await fetch(`/api/movements?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch movements");
      }

      const data = await response.json();
      const movementsData = (data.items || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        type: item.type || "outbound",
        product: (item.productName as string) || "Unknown Product",
        quantity: (item.quantity as number) || 1,
        from: (item.from as string) || "",
        to: (item.to as string) || "",
        status: (item.status as string) || "pending",
        trackingNumber: (item.trackingNumber as string) || "",
        createdAt: new Date((item.createdAt as number) || Date.now()),
        estimatedDelivery: item.estimatedDelivery ? new Date(item.estimatedDelivery as number) : undefined,
      }));
      setMovements(movementsData);
    } catch (error) {
      console.error("Failed to fetch movements:", error);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchMovements();
  }, [authState.status, router, fetchMovements]);

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || movement.status === statusFilter;
    const matchesType = typeFilter === "all" || movement.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "in_transit": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "delivered": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "cancelled": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

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
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
          <span className="text-white font-medium">Shipments</span>
        </nav>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Shipments & Movements
            </h1>
            <p className="text-gray-400 text-lg">Track inbound and outbound shipments</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            New Shipment
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Shipments</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Truck className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{movements.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">In Transit</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <ArrowUpDown className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {movements.filter(m => m.status === "in_transit").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Delivered</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <CheckCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {movements.filter(m => m.status === "delivered").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Clock className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {movements.filter(m => m.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Cancelled</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <XCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {movements.filter(m => m.status === "cancelled").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product, tracking number, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => router.push(`/movements?type=${e.target.value}`)}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Types</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchMovements}
              disabled={loading}
              className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400">Loading shipments...</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No shipments found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                    ? "Try adjusting your filters" 
                    : "Create your first shipment"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="p-4 bg-gray-800/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            movement.type === "inbound"
                              ? "text-green-400 bg-green-500/10 border-green-500/20"
                              : "text-orange-400 bg-orange-500/10 border-orange-500/20"
                          }`}>
                            {movement.type.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(movement.status)}`}>
                            {movement.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Product</p>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-400" />
                              <p className="text-white font-medium">{movement.product}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-400 mb-1">Tracking Number</p>
                            <p className="text-white font-mono text-sm">{movement.trackingNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{movement.from}</span>
                          </div>
                          <ArrowRight className="h-4 w-4" />
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{movement.to}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {(user.role === "warehouse" || user.role === "admin") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // TODO: Open QC modal
                                console.log("QC check for movement:", movement.id);
                              }}
                              className="border-gray-700 text-white hover:bg-gray-800"
                            >
                              <ClipboardCheck className="h-4 w-4 mr-1" />
                              QC Check
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // TODO: Open handover modal
                                console.log("Handover for movement:", movement.id);
                              }}
                              className="border-gray-700 text-white hover:bg-gray-800"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Handover
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            router.push(`/movements/${movement.id}`);
                          }}
                          className="border-gray-700 text-white hover:bg-gray-800"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-white rounded-full animate-spin"></div>
      </div>
    }>
      <MovementsContent />
    </Suspense>
  );
}

