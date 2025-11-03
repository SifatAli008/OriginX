"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Activity,
  Search,
  Eye,
  Hash,
  Clock,
  ChevronRight,
  Home,
  RefreshCw,
  CheckCircle,
  Box,
  X,
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";

interface BlockchainTransaction {
  txHash: string;
  blockNumber?: number;
  type: "PRODUCT_REGISTER" | "VERIFY" | "MOVEMENT" | "TRANSFER" | "QC_LOG";
  refType: "product" | "movement" | "verification" | "batch";
  refId: string;
  orgId: string;
  createdBy: string;
  payload?: Record<string, unknown>;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
  confirmedAt?: number;
}

export default function BlockchainPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (authState.status === "authenticated" && user) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, router, typeFilter]);

  // Check if there's a transaction hash in URL params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const txHash = searchParams.get("tx");
    if (txHash) {
      setSearchTerm(txHash);
    }
  }, []);

  const fetchTransactions = async () => {
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

      // Build query params
      const params = new URLSearchParams({
        page: "1",
        pageSize: "50",
      });

      if (typeFilter !== "all") {
        // Map UI type filter to API type
        const typeMap: Record<string, string> = {
          product_registration: "PRODUCT_REGISTER",
          transfer: "MOVEMENT",
          verification: "VERIFY",
          update: "QC_LOG",
        };
        params.append("type", typeMap[typeFilter] || typeFilter.toUpperCase());
      }

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();
      setTransactions(data.items || []);
    } catch (error) {
      console.error("Failed to fetch blockchain transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const payload = tx.payload as Record<string, unknown> | undefined;
    const productName = (payload?.productName as string) || "";
    const productId = tx.refType === "product" ? tx.refId : (payload?.productId as string) || "";
    
    const matchesSearch = 
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.refId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map API types to UI types for filtering
    const typeMap: Record<string, string> = {
      PRODUCT_REGISTER: "product_registration",
      MOVEMENT: "transfer",
      TRANSFER: "transfer",
      VERIFY: "verification",
      QC_LOG: "update",
    };
    
    const matchesType = typeFilter === "all" || typeMap[tx.type] === typeFilter || tx.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PRODUCT_REGISTER":
      case "product_registration": 
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "MOVEMENT":
      case "TRANSFER":
      case "transfer": 
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "VERIFY":
      case "verification": 
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "QC_LOG":
      case "update": 
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      default: 
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PRODUCT_REGISTER": return "Product Registration";
      case "VERIFY": return "Verification";
      case "MOVEMENT": return "Movement";
      case "TRANSFER": return "Transfer";
      case "QC_LOG": return "QC Log";
      default: return type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
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
          <span className="text-white font-medium">Blockchain</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Blockchain Transactions</h1>
          </div>
          <p className="text-gray-400">Immutable product transaction records on the blockchain</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{transactions.length}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">
                {transactions.filter(t => t.status === "confirmed").length}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">
                {transactions.filter(t => t.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Last Block</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-400">
                {transactions.length > 0 
                  ? Math.max(...transactions.filter(t => t.blockNumber).map(t => t.blockNumber!))
                  : 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by transaction hash, product ID, or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="all">All Types</option>
              <option value="product_registration">Product Registration</option>
              <option value="transfer">Transfer</option>
              <option value="verification">Verification</option>
              <option value="update">Update</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchTransactions}
              disabled={loading}
              className="border-gray-800 text-white hover:bg-gray-900"
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
                <p className="text-gray-400">Loading blockchain transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No blockchain transactions found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your filters" 
                    : "Blockchain transactions will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => {
                  const payload = tx.payload as Record<string, unknown> | undefined;
                  const productName = (payload?.productName as string) || "N/A";
                  const productId = tx.refType === "product" ? tx.refId : (payload?.productId as string) || tx.refId;
                  
                  return (
                    <div
                      key={tx.txHash}
                      className="p-4 bg-gray-800/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs border ${getTypeColor(tx.type)}`}>
                              {getTypeLabel(tx.type)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs border ${
                              tx.status === "confirmed"
                                ? "text-green-400 bg-green-500/10 border-green-500/20"
                                : tx.status === "pending"
                                  ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                                  : "text-red-400 bg-red-500/10 border-red-500/20"
                            }`}>
                              {tx.status === "confirmed" && <CheckCircle className="inline h-3 w-3 mr-1" />}
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </span>
                            {tx.blockNumber && (
                              <span className="px-2 py-1 rounded-full text-xs border text-purple-400 bg-purple-500/10 border-purple-500/20">
                                Block #{tx.blockNumber}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-blue-400" />
                                <p className="text-white font-mono text-xs truncate" title={tx.txHash}>
                                  {tx.txHash}
                                </p>
                              </div>
                            </div>

                            {tx.blockNumber && (
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Block Number</p>
                                <div className="flex items-center gap-2">
                                  <Box className="h-4 w-4 text-purple-400" />
                                  <p className="text-white text-sm">{tx.blockNumber}</p>
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-xs text-gray-400 mb-1">Reference</p>
                              <p className="text-white text-sm capitalize">{tx.refType}</p>
                              <p className="text-gray-500 text-xs font-mono truncate" title={tx.refId}>
                                {tx.refId}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400 mb-1">Timestamp</p>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <p className="text-white text-sm">{new Date(tx.createdAt).toLocaleString()}</p>
                              </div>
                            </div>

                            {(productName !== "N/A" || productId) && (
                              <div className="sm:col-span-2">
                                <p className="text-xs text-gray-400 mb-1">Product</p>
                                <p className="text-white text-sm">{productName}</p>
                                {productId && (
                                  <p className="text-gray-500 text-xs font-mono truncate" title={productId}>
                                    {productId}
                                  </p>
                                )}
                              </div>
                            )}

                            {tx.payload && Object.keys(tx.payload).length > 0 && (
                              <div className="sm:col-span-2">
                                <p className="text-xs text-gray-400 mb-1">Payload</p>
                                <pre className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(tx.payload, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTransaction(tx);
                            setShowDetailModal(true);
                          }}
                          className="border-gray-700 text-white hover:bg-gray-800"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Detail Modal */}
        {showDetailModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Transaction Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTransaction(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                    <p className="text-white font-mono text-sm break-all">{selectedTransaction.txHash}</p>
                  </div>
                  {selectedTransaction.blockNumber && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Block Number</p>
                      <p className="text-white text-sm">{selectedTransaction.blockNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Type</p>
                    <span className={`px-2 py-1 rounded text-xs border ${getTypeColor(selectedTransaction.type)}`}>
                      {getTypeLabel(selectedTransaction.type)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs border ${
                      selectedTransaction.status === "confirmed"
                        ? "text-green-400 bg-green-500/10 border-green-500/20"
                        : selectedTransaction.status === "pending"
                          ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                          : "text-red-400 bg-red-500/10 border-red-500/20"
                    }`}>
                      {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Reference Type</p>
                    <p className="text-white text-sm capitalize">{selectedTransaction.refType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Reference ID</p>
                    <p className="text-white font-mono text-xs break-all">{selectedTransaction.refId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Organization ID</p>
                    <p className="text-white font-mono text-xs break-all">{selectedTransaction.orgId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Created By</p>
                    <p className="text-white font-mono text-xs break-all">{selectedTransaction.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Created At</p>
                    <p className="text-white text-sm">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedTransaction.confirmedAt && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Confirmed At</p>
                      <p className="text-white text-sm">{new Date(selectedTransaction.confirmedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {selectedTransaction.payload && Object.keys(selectedTransaction.payload).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Payload</p>
                    <pre className="text-xs text-gray-300 bg-gray-900/50 p-4 rounded overflow-auto max-h-64 border border-gray-800">
                      {JSON.stringify(selectedTransaction.payload, null, 2)}
                    </pre>
                  </div>
                )}
                <div className="flex gap-2 pt-4 border-t border-gray-800">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Close
                  </Button>
                  {selectedTransaction.refType === "product" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        router.push(`/products/${selectedTransaction.refId}`);
                        setShowDetailModal(false);
                      }}
                      className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                    >
                      View Product
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

