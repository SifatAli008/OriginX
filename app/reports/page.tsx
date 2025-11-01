"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FileCheck,
  Search,
  Download,
  Eye,
  Calendar,
  ChevronRight,
  Home,
  RefreshCw,
  Plus,
  FileText,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface Report {
  id: string;
  title: string;
  type: "inventory" | "sales" | "quality" | "compliance" | "financial";
  generatedBy: string;
  generatedAt: Date;
  period: string;
  status: "completed" | "generating" | "failed";
  fileSize?: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchReports();
  }, [authState.status, router]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReports([]);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.generatedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || report.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "inventory": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "sales": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "quality": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "compliance": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "financial": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "generating": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "failed": return "text-red-400 bg-red-500/10 border-red-500/20";
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
          <span className="text-white font-medium">Reports</span>
        </nav>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileCheck className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">Reports</h1>
            </div>
            <p className="text-gray-400">Generate and manage system reports</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>

        {/* Quick Report Templates */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border-blue-800/50 hover:border-blue-700 transition-all cursor-pointer">
            <CardContent className="p-6">
              <BarChart3 className="h-8 w-8 text-blue-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Inventory Report</h3>
              <p className="text-gray-400 text-sm">Stock levels & movements</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/20 to-green-900/5 border-green-800/50 hover:border-green-700 transition-all cursor-pointer">
            <CardContent className="p-6">
              <TrendingUp className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Sales Report</h3>
              <p className="text-gray-400 text-sm">Revenue & transactions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border-purple-800/50 hover:border-purple-700 transition-all cursor-pointer">
            <CardContent className="p-6">
              <FileCheck className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Quality Report</h3>
              <p className="text-gray-400 text-sm">QC inspections & metrics</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/20 to-orange-900/5 border-orange-800/50 hover:border-orange-700 transition-all cursor-pointer">
            <CardContent className="p-6">
              <FileText className="h-8 w-8 text-orange-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Compliance Report</h3>
              <p className="text-gray-400 text-sm">Regulatory compliance</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search reports..."
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
              <option value="inventory">Inventory</option>
              <option value="sales">Sales</option>
              <option value="quality">Quality</option>
              <option value="compliance">Compliance</option>
              <option value="financial">Financial</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchReports}
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
                <p className="text-gray-400">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No reports found</p>
                <p className="text-gray-500 text-sm mb-6">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your filters" 
                    : "Generate your first report"}
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-gray-800/30 border border-gray-700 rounded-lg hover:border-gray-600 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold text-lg">{report.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getTypeColor(report.type)}`}>
                            {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(report.status)}`}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{report.period}</span>
                          </div>
                          <div>
                            <span>Generated by: </span>
                            <span className="text-white">{report.generatedBy}</span>
                          </div>
                          <div>
                            {new Date(report.generatedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={report.status !== "completed"}
                          className="border-gray-700 text-white hover:bg-gray-800"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={report.status !== "completed"}
                          className="border-gray-700 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Download className="h-4 w-4" />
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

