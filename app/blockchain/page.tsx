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
  Link as LinkIcon,
  CheckCircle,
  Box,
} from "lucide-react";

interface BlockchainTransaction {
  id: string;
  transactionHash: string;
  blockNumber: number;
  type: "product_registration" | "transfer" | "verification" | "update";
  productId: string;
  productName: string;
  timestamp: Date;
  from: string;
  to?: string;
  status: "confirmed" | "pending";
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

    fetchTransactions();
  }, [authState.status, router]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual blockchain API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTransactions([]);
    } catch (error) {
      console.error("Failed to fetch blockchain transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.productId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "product_registration": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "transfer": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "verification": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "update": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
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
                {transactions.length > 0 ? Math.max(...transactions.map(t => t.blockNumber)) : 0}
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
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-gray-800/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs border ${getTypeColor(tx.type)}`}>
                            {tx.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs border ${
                            tx.status === "confirmed"
                              ? "text-green-400 bg-green-500/10 border-green-500/20"
                              : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                          }`}>
                            {tx.status === "confirmed" && <CheckCircle className="inline h-3 w-3 mr-1" />}
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-blue-400" />
                              <p className="text-white font-mono text-sm truncate">{tx.transactionHash}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400 mb-1">Block Number</p>
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-purple-400" />
                              <p className="text-white text-sm">{tx.blockNumber}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400 mb-1">Product</p>
                            <p className="text-white text-sm">{tx.productName}</p>
                            <p className="text-gray-500 text-xs font-mono">{tx.productId}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400 mb-1">Timestamp</p>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <p className="text-white text-sm">{new Date(tx.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">From:</span>
                          <span className="text-white font-mono">{tx.from}</span>
                          {tx.to && (
                            <>
                              <LinkIcon className="h-4 w-4 text-gray-600" />
                              <span className="text-gray-400">To:</span>
                              <span className="text-white font-mono">{tx.to}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
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

