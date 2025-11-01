"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Shield,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Home,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  Download,
  Filter,
  Calendar,
  TrendingUp,
} from "lucide-react";
import DashboardChart from "@/components/charts/DashboardChart";

interface Verification {
  id: string;
  productName: string;
  productId: string;
  verifier: string;
  status: "pending" | "verified" | "failed";
  type: "authenticity" | "quality" | "compliance";
  date: Date;
  notes?: string;
}

export default function VerificationsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "status" | "type">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Generate chart data function
  const generateChartData = (days: number) => {
    const data = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        verified: Math.floor(Math.random() * 50) + 20,
        pending: Math.floor(Math.random() * 30) + 10,
        failed: Math.floor(Math.random() * 10) + 0,
      });
    }
    return data;
  };

  const handleExport = () => {
    const csv = [
      ['Product Name', 'Product ID', 'Type', 'Status', 'Verifier', 'Date'].join(','),
      ...filteredVerifications.map(v => [
        v.productName,
        v.productId,
        v.type,
        v.status,
        v.verifier,
        new Date(v.date).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchVerifications();
  }, [authState.status, router]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVerifications([]);
    } catch (error) {
      console.error("Failed to fetch verifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVerifications = verifications
    .filter(verification => {
      const matchesSearch = verification.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        verification.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        verification.verifier.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || verification.status === statusFilter;
      const matchesType = typeFilter === "all" || verification.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredVerifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVerifications = filteredVerifications.slice(startIndex, endIndex);

  const handleViewDetails = (verification: Verification) => {
    setSelectedVerification(verification);
    setShowDetailsModal(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
          icon: <Clock className="h-4 w-4" />
        };
      case "verified":
        return {
          color: "text-green-400 bg-green-500/10 border-green-500/20",
          icon: <CheckCircle className="h-4 w-4" />
        };
      case "failed":
        return {
          color: "text-red-400 bg-red-500/10 border-red-500/20",
          icon: <XCircle className="h-4 w-4" />
        };
      default:
        return {
          color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
          icon: <Clock className="h-4 w-4" />
        };
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
          <span className="text-white font-medium">Verifications</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Verifications
            </h1>
            <p className="text-gray-400 text-lg">Product authenticity and quality verification records</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards - Matching Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Verifications</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Shield className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{verifications.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Verified</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <CheckCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {verifications.filter(v => v.status === "verified").length}
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
                {verifications.filter(v => v.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Failed</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <XCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {verifications.filter(v => v.status === "failed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Trends Chart */}
        <div className="mb-6">
          <DashboardChart
            data={generateChartData(7)}
            type="area"
            title="Verification Trends"
            description="Last 7 days verification status breakdown"
            height={250}
            dataKeys={[
              { key: "verified", color: "#10b981", name: "Verified", isArea: true },
              { key: "pending", color: "#f59e0b", name: "Pending", isArea: true },
              { key: "failed", color: "#ef4444", name: "Failed", isArea: true },
            ]}
          />
        </div>

        {/* Filters and Sorting */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search verifications..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as "date" | "status" | "type");
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="type">Sort by Type</option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                setCurrentPage(1);
              }}
              className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
            
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Types</option>
              <option value="authenticity">Authenticity</option>
              <option value="quality">Quality</option>
              <option value="compliance">Compliance</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchVerifications}
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
                <p className="text-gray-400">Loading verifications...</p>
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No verifications found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                    ? "Try adjusting your filters" 
                    : "Verification records will appear here"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Verifier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {paginatedVerifications.map((verification) => {
                      const statusConfig = getStatusConfig(verification.status);
                      return (
                        <tr key={verification.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-white font-medium">{verification.productName}</p>
                              <p className="text-sm text-gray-400 font-mono">{verification.productId}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border text-blue-400 bg-blue-500/10 border-blue-500/20">
                              <FileCheck className="h-3 w-3" />
                              {verification.type.charAt(0).toUpperCase() + verification.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300">{verification.verifier}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-400 text-sm">
                              {new Date(verification.date).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${statusConfig.color}`}>
                              {statusConfig.icon}
                              {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(verification)}
                                className="border-gray-700 text-white hover:bg-gray-800 backdrop-blur-sm transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && filteredVerifications.length > 0 && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredVerifications.length)} of {filteredVerifications.length} verifications
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={
                            currentPage === pageNum
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        {showDetailsModal && selectedVerification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex items-center justify-between border-b border-gray-800">
                <CardTitle className="text-xl font-bold text-white">Verification Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Product Name</p>
                    <p className="text-white font-medium">{selectedVerification.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Product ID</p>
                    <p className="text-white font-mono text-sm">{selectedVerification.productId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Type</p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border text-blue-400 bg-blue-500/10 border-blue-500/20">
                      {selectedVerification.type.charAt(0).toUpperCase() + selectedVerification.type.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusConfig(selectedVerification.status).color}`}>
                      {getStatusConfig(selectedVerification.status).icon}
                      {selectedVerification.status.charAt(0).toUpperCase() + selectedVerification.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Verifier</p>
                    <p className="text-white">{selectedVerification.verifier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date</p>
                    <p className="text-white">{new Date(selectedVerification.date).toLocaleString()}</p>
                  </div>
                </div>
                {selectedVerification.notes && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Notes</p>
                    <p className="text-white bg-gray-800/50 p-3 rounded-lg">{selectedVerification.notes}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailsModal(false)}
                    className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

