"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ClipboardCheck,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Home,
  RefreshCw,
  Plus,
  FileText,
  Download,
} from "lucide-react";
import DashboardChart from "@/components/charts/DashboardChart";
import { getFirebaseAuth } from "@/lib/firebase/client";

interface QCLog {
  id: string;
  productName: string;
  batchNumber: string;
  inspector: string;
  result: "pass" | "fail" | "conditional";
  date: Date;
  defectsFound: number;
  notes: string;
}

export default function QCLogsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [logs, setLogs] = useState<QCLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<QCLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "result">("date");
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
        pass: Math.floor(Math.random() * 40) + 30,
        conditional: Math.floor(Math.random() * 20) + 5,
        fail: Math.floor(Math.random() * 10) + 0,
      });
    }
    return data;
  };

  const handleExport = () => {
    const csv = [
      ['Product Name', 'Batch Number', 'Inspector', 'Result', 'Defects', 'Date'].join(','),
      ...filteredLogs.map(l => [
        l.productName,
        l.batchNumber,
        l.inspector,
        l.result,
        l.defectsFound,
        new Date(l.date).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleViewDetails = (log: QCLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchLogs();
  }, [authState.status, router, currentPage, resultFilter]);

  const fetchLogs = async () => {
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
        page: currentPage.toString(),
        pageSize: itemsPerPage.toString(),
      });

      if (resultFilter !== "all") {
        params.append("qcResult", resultFilter);
      }

      const response = await fetch(`/api/qc-logs?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QC logs");
      }

      const data = await response.json();
      const logsData = (data.items || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        productName: (item.productName as string) || "Unknown Product",
        batchNumber: (item.trackingNumber as string) || "",
        inspector: (item.qcInspector as string) || "Unknown",
        result: (item.qcResult === "passed" ? "pass" : item.qcResult === "failed" ? "fail" : "conditional") as "pass" | "fail" | "conditional",
        date: new Date((item.createdAt as number) || Date.now()),
        defectsFound: Array.isArray(item.defects) ? (item.defects as unknown[]).length : 0,
        notes: (item.qcNotes as string) || "",
      }));
      setLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch QC logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs
    .filter(log => {
      const matchesSearch = log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.inspector.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesResult = resultFilter === "all" || log.result === resultFilter;
      
      return matchesSearch && matchesResult;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "result":
          comparison = a.result.localeCompare(b.result);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const getResultConfig = (result: string) => {
    switch (result) {
      case "pass":
        return {
          color: "text-green-400 bg-green-500/10 border-green-500/20",
          icon: <CheckCircle className="h-4 w-4" />
        };
      case "fail":
        return {
          color: "text-red-400 bg-red-500/10 border-red-500/20",
          icon: <XCircle className="h-4 w-4" />
        };
      case "conditional":
        return {
          color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
          icon: <AlertTriangle className="h-4 w-4" />
        };
      default:
        return {
          color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
          icon: <FileText className="h-4 w-4" />
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
          <span className="text-white font-medium">QC Logs</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Quality Control Logs
            </h1>
            <p className="text-gray-400 text-lg">Inspection and quality control records</p>
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
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              New QC Log
            </Button>
          </div>
        </div>

        {/* Stats Cards - Matching Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Inspections</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <ClipboardCheck className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">{logs.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pass</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <CheckCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {logs.filter(l => l.result === "pass").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Conditional</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {logs.filter(l => l.result === "conditional").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Fail</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <XCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {logs.filter(l => l.result === "fail").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QC Results Trends Chart */}
        <div className="mb-6">
          <DashboardChart
            data={generateChartData(7)}
            type="area"
            title="QC Results Trends"
            description="Last 7 days inspection results breakdown"
            height={250}
            dataKeys={[
              { key: "pass", color: "#10b981", name: "Pass", isArea: true },
              { key: "conditional", color: "#f59e0b", name: "Conditional", isArea: true },
              { key: "fail", color: "#ef4444", name: "Fail", isArea: true },
            ]}
          />
        </div>

        {/* Filters and Sorting */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search QC logs..."
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
                setSortBy(e.target.value as "date" | "result");
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="result">Sort by Result</option>
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
              value={resultFilter}
              onChange={(e) => {
                setResultFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Results</option>
              <option value="pass">Pass</option>
              <option value="conditional">Conditional</option>
              <option value="fail">Fail</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchLogs}
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
                <p className="text-gray-400">Loading QC logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No QC logs found</p>
                <p className="text-gray-500 text-sm mb-6">
                  {searchTerm || resultFilter !== "all"
                    ? "Try adjusting your filters" 
                    : "Create your first QC log"}
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New QC Log
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Batch Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Inspector</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Defects</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {paginatedLogs.map((log) => {
                      const resultConfig = getResultConfig(log.result);
                      return (
                        <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-4">
                            <p className="text-white font-medium">{log.productName}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300 font-mono text-sm">{log.batchNumber}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300">{log.inspector}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-300">{log.defectsFound}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-gray-400 text-sm">
                              {new Date(log.date).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${resultConfig.color}`}>
                              {resultConfig.icon}
                              {log.result.charAt(0).toUpperCase() + log.result.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(log)}
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
            {!loading && filteredLogs.length > 0 && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
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
        {showDetailsModal && selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex items-center justify-between border-b border-gray-800">
                <CardTitle className="text-xl font-bold text-white">QC Log Details</CardTitle>
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
                    <p className="text-white font-medium">{selectedLog.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Batch Number</p>
                    <p className="text-white font-mono text-sm">{selectedLog.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Inspector</p>
                    <p className="text-white">{selectedLog.inspector}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Result</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getResultConfig(selectedLog.result).color}`}>
                      {getResultConfig(selectedLog.result).icon}
                      {selectedLog.result.charAt(0).toUpperCase() + selectedLog.result.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Defects Found</p>
                    <p className="text-white">{selectedLog.defectsFound}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date</p>
                    <p className="text-white">{new Date(selectedLog.date).toLocaleString()}</p>
                  </div>
                </div>
                {selectedLog.notes && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Notes</p>
                    <p className="text-white bg-gray-800/50 p-3 rounded-lg">{selectedLog.notes}</p>
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

