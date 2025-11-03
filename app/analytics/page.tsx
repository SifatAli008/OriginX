"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart3,
  Download,
  RefreshCw,
  Home,
  ChevronRight,
  Package,
  Shield,
  AlertTriangle,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import DashboardChart from "@/components/charts/DashboardChart";

interface KPIs {
  totalProducts: number;
  totalVerifications: number;
  counterfeitCount: number;
  lossPrevented: number;
  genuineCount: number;
  suspiciousCount: number;
  fakeCount: number;
  invalidCount: number;
}

interface TrendData {
  date: string;
  count?: number;
  rate?: number;
}

interface AnalyticsData {
  kpis: KPIs;
  trends: {
    dailyMovements: TrendData[];
    verificationSuccessRate: TrendData[];
    counterfeitRate: TrendData[];
  };
  recentActivity: {
    verifications: number;
    movements: number;
    registrations: number;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (authState.status === "authenticated" && user) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, router]);

  const fetchAnalytics = async () => {
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

      const response = await fetch("/api/analytics", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (format: "csv" | "excel" | "pdf") => {
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Default to verifications report
      const url = `/api/reports?type=verifications&format=${format}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `verifications_report_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download report:", error);
      alert("Failed to download report. Please try again.");
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
          <span className="text-white font-medium">Analytics & Reports</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">Analytics Dashboard</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchAnalytics}
                disabled={loading}
                className="border-gray-800 text-white hover:bg-gray-900"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownloadReport("csv")}
                className="border-gray-800 text-white hover:bg-gray-900"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <p className="text-gray-400">Key performance indicators and trend analysis</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-spin" />
            <p className="text-gray-400">Loading analytics data...</p>
          </div>
        ) : !analytics ? (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">Failed to load analytics</p>
            <Button
              variant="outline"
              onClick={fetchAnalytics}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-white">{analytics.kpis.totalProducts}</p>
                    <Package className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Verifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-white">{analytics.kpis.totalVerifications}</p>
                    <Shield className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Counterfeit Detected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-red-400">{analytics.kpis.counterfeitCount}</p>
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.kpis.totalVerifications > 0
                      ? `${((analytics.kpis.counterfeitCount / analytics.kpis.totalVerifications) * 100).toFixed(1)}% of verifications`
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Loss Prevented</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold text-green-400">${analytics.kpis.lossPrevented.toLocaleString()}</p>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Estimated value saved</p>
                </CardContent>
              </Card>
            </div>

            {/* Verification Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Genuine</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <p className="text-2xl font-bold text-green-400">{analytics.kpis.genuineCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Suspicious</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <p className="text-2xl font-bold text-yellow-400">{analytics.kpis.suspiciousCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Fake</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <p className="text-2xl font-bold text-red-400">{analytics.kpis.fakeCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Invalid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-gray-400" />
                    <p className="text-2xl font-bold text-gray-400">{analytics.kpis.invalidCount}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Daily Movements</CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardChart
                    data={analytics.trends.dailyMovements.map(item => ({
                      date: item.date,
                      movements: item.count || 0,
                    }))}
                    type="bar"
                    title=""
                    description=""
                    height={250}
                    dataKeys={[
                      { key: "movements", color: "#3b82f6", name: "Movements" },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Verification Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardChart
                    data={analytics.trends.verificationSuccessRate.map(item => ({
                      date: item.date,
                      rate: item.rate || 0,
                    }))}
                    type="line"
                    title=""
                    description=""
                    height={250}
                    dataKeys={[
                      { key: "rate", color: "#10b981", name: "Success Rate %" },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Counterfeit Rate Chart */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Counterfeit Detection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardChart
                  data={analytics.trends.counterfeitRate.map(item => ({
                    date: item.date,
                    rate: item.rate || 0,
                  }))}
                  type="area"
                  title=""
                  description=""
                  height={300}
                  dataKeys={[
                    { key: "rate", color: "#ef4444", name: "Counterfeit Rate %", isArea: true },
                  ]}
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity (Last 24 Hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-blue-400" />
                      <div>
                        <p className="text-sm text-gray-400">Verifications</p>
                        <p className="text-2xl font-bold text-white">{analytics.recentActivity.verifications}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-6 w-6 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Movements</p>
                        <p className="text-2xl font-bold text-white">{analytics.recentActivity.movements}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-green-400" />
                      <div>
                        <p className="text-sm text-gray-400">Registrations</p>
                        <p className="text-2xl font-bold text-white">{analytics.recentActivity.registrations}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
