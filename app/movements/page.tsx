"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  txHash?: string; // Simulated blockchain-style transaction hash for audit trail
}

function MovementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  const { addToast } = useToast();

  const typeFilter = searchParams.get("type") || "all";
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // QC Modal state
  const [qcModalOpen, setQcModalOpen] = useState(false);
  const [selectedMovementForQc, setSelectedMovementForQc] = useState<Movement | null>(null);
  const [qcResult, setQcResult] = useState<"passed" | "failed" | "pending">("passed");
  const [qcNotes, setQcNotes] = useState("");
  const [qcSubmitting, setQcSubmitting] = useState(false);
  
  // Handover Modal state
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedMovementForHandover, setSelectedMovementForHandover] = useState<Movement | null>(null);
  const [handedOverBy, setHandedOverBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [handoverLocation, setHandoverLocation] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [handoverCondition, setHandoverCondition] = useState<"excellent" | "good" | "fair" | "poor">("excellent");
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

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
      addToast({
        variant: "error",
        title: "Failed to fetch movements",
        description: error instanceof Error ? error.message : "An error occurred while loading movements",
      });
    } finally {
      setLoading(false);
    }
  }, [typeFilter, addToast]);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (authState.status === "authenticated") {
    fetchMovements();
    }
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

  const handleQcSubmit = async () => {
    if (!selectedMovementForQc) return;

    setQcSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(`/api/movements/${selectedMovementForQc.id}/qc`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qcResult,
          qcNotes: qcNotes || undefined,
          updateStatus: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit QC check");
      }

      // Success - close modal and refresh movements
      setQcModalOpen(false);
      setSelectedMovementForQc(null);
      setQcNotes("");
      setQcResult("passed");
      await fetchMovements();
      addToast({
        variant: "success",
        title: "QC Check Submitted",
        description: "Quality control check has been recorded successfully",
      });
    } catch (error) {
      console.error("Failed to submit QC check:", error);
      addToast({
        variant: "error",
        title: "Failed to Submit QC Check",
        description: error instanceof Error ? error.message : "An error occurred while submitting QC check",
      });
    } finally {
      setQcSubmitting(false);
    }
  };

  const handleHandoverSubmit = async () => {
    if (!selectedMovementForHandover) return;

    setHandoverSubmitting(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(`/api/movements/${selectedMovementForHandover.id}/handover`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          handedOverBy: handedOverBy || undefined,
          receivedBy: receivedBy || undefined,
          handoverLocation: handoverLocation || undefined,
          handoverNotes: handoverNotes || undefined,
          condition: handoverCondition,
          updateStatus: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit handover");
      }

      // Success - close modal and refresh movements
      setHandoverModalOpen(false);
      setSelectedMovementForHandover(null);
      setHandedOverBy("");
      setReceivedBy("");
      setHandoverLocation("");
      setHandoverNotes("");
      setHandoverCondition("excellent");
      await fetchMovements();
      addToast({
        variant: "success",
        title: "Handover Recorded",
        description: "Handover has been recorded successfully",
      });
    } catch (error) {
      console.error("Failed to submit handover:", error);
      addToast({
        variant: "error",
        title: "Failed to Submit Handover",
        description: error instanceof Error ? error.message : "An error occurred while submitting handover",
      });
    } finally {
      setHandoverSubmitting(false);
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
                        {(user.role === "company" || user.role === "sme" || user.role === "admin") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedMovementForQc(movement);
                                setQcModalOpen(true);
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
                                setSelectedMovementForHandover(movement);
                                setHandoverModalOpen(true);
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

        {/* QC Modal */}
        <Dialog open={qcModalOpen} onOpenChange={setQcModalOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Quality Control Check</DialogTitle>
              <DialogDescription className="text-gray-400">
                Record QC results for {selectedMovementForQc?.product}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="qcResult" className="text-white">QC Result</Label>
                <Select value={qcResult} onValueChange={(value: "passed" | "failed" | "pending") => setQcResult(value)}>
                  <SelectTrigger id="qcResult" className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select QC result" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qcNotes" className="text-white">QC Notes</Label>
                <Textarea
                  id="qcNotes"
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Enter QC inspection notes..."
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[100px]"
                />
              </div>
              {selectedMovementForQc && (
                <div className="text-sm text-gray-400 space-y-1">
                  <p><span className="font-medium">Movement ID:</span> {selectedMovementForQc.id}</p>
                  <p><span className="font-medium">Product:</span> {selectedMovementForQc.product}</p>
                  <p><span className="font-medium">Quantity:</span> {selectedMovementForQc.quantity}</p>
                  <p><span className="font-medium">From:</span> {selectedMovementForQc.from}</p>
                  <p><span className="font-medium">To:</span> {selectedMovementForQc.to}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setQcModalOpen(false);
                  setSelectedMovementForQc(null);
                  setQcNotes("");
                  setQcResult("passed");
                }}
                disabled={qcSubmitting}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleQcSubmit}
                disabled={qcSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {qcSubmitting ? "Submitting..." : "Submit QC Check"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Handover Modal */}
        <Dialog open={handoverModalOpen} onOpenChange={setHandoverModalOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Record Handover</DialogTitle>
              <DialogDescription className="text-gray-400">
                Record handover for {selectedMovementForHandover?.product}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="handedOverBy" className="text-white">Handed Over By</Label>
                <Input
                  id="handedOverBy"
                  type="text"
                  value={handedOverBy}
                  onChange={(e) => setHandedOverBy(e.target.value)}
                  placeholder="Name of person handing over"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedBy" className="text-white">Received By</Label>
                <Input
                  id="receivedBy"
                  type="text"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Name of person receiving"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handoverLocation" className="text-white">Handover Location</Label>
                <Input
                  id="handoverLocation"
                  type="text"
                  value={handoverLocation}
                  onChange={(e) => setHandoverLocation(e.target.value)}
                  placeholder="Location of handover"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handoverCondition" className="text-white">Condition</Label>
                <Select value={handoverCondition} onValueChange={(value: "excellent" | "good" | "fair" | "poor") => setHandoverCondition(value)}>
                  <SelectTrigger id="handoverCondition" className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="handoverNotes" className="text-white">Handover Notes</Label>
                <Textarea
                  id="handoverNotes"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Enter handover notes..."
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[100px]"
                />
              </div>
              {selectedMovementForHandover && (
                <div className="text-sm text-gray-400 space-y-1">
                  <p><span className="font-medium">Movement ID:</span> {selectedMovementForHandover.id}</p>
                  <p><span className="font-medium">Product:</span> {selectedMovementForHandover.product}</p>
                  <p><span className="font-medium">From:</span> {selectedMovementForHandover.from}</p>
                  <p><span className="font-medium">To:</span> {selectedMovementForHandover.to}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setHandoverModalOpen(false);
                  setSelectedMovementForHandover(null);
                  setHandedOverBy("");
                  setReceivedBy("");
                  setHandoverLocation("");
                  setHandoverNotes("");
                  setHandoverCondition("excellent");
                }}
                disabled={handoverSubmitting}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleHandoverSubmit}
                disabled={handoverSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {handoverSubmitting ? "Submitting..." : "Submit Handover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

