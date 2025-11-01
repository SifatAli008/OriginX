"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  Activity,
  ChevronRight,
  Home,
  RefreshCw,
  Calendar,
  Download,
} from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    fetchAnalytics();
  }, [authState.status, router, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
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
          <span className="text-white font-medium">Analytics</span>
        </nav>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">Analytics</h1>
            </div>
            <p className="text-gray-400">Insights and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <Button
              variant="outline"
              className="border-gray-800 text-white hover:bg-gray-900"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="h-16 w-16 text-gray-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border-blue-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">$0</div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">0%</span>
                    <span className="text-gray-500">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/20 to-green-900/5 border-green-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Users</CardTitle>
                  <Users className="h-5 w-5 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">0</div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">0%</span>
                    <span className="text-gray-500">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border-purple-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Products</CardTitle>
                  <Package className="h-5 w-5 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">0</div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">0%</span>
                    <span className="text-gray-500">vs last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-900/20 to-orange-900/5 border-orange-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Transactions</CardTitle>
                  <Activity className="h-5 w-5 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">0</div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-red-400">0%</span>
                    <span className="text-gray-500">vs last period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Trends</CardTitle>
                  <p className="text-sm text-gray-400">Daily revenue over time</p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 mx-auto mb-3 text-gray-700" />
                      <p>Chart visualization</p>
                      <p className="text-xs mt-1">Connect to data source to view</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">User Activity</CardTitle>
                  <p className="text-sm text-gray-400">Active users over time</p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Activity className="h-16 w-16 mx-auto mb-3 text-gray-700" />
                      <p>Chart visualization</p>
                      <p className="text-xs mt-1">Connect to data source to view</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Top Products</CardTitle>
                  <p className="text-sm text-gray-400">Best performing items</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No data available</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Category Distribution</CardTitle>
                  <p className="text-sm text-gray-400">Products by category</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No data available</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Growth Rate</CardTitle>
                  <p className="text-sm text-gray-400">Month over month</p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No data available</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

