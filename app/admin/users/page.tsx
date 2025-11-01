"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Users,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  ChevronRight,
  Home,
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/types/user";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  company: string;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  lastLogin?: Date;
}

export default function UserManagementPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    fetchUsers();
  }, [authState.status, user, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/admin/users');
      // const data = await response.json();
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUsers([]);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      // TODO: API call
      console.log("Suspending user:", userId);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to suspend user:", error);
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      // TODO: API call
      console.log("Activating user:", userId);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to activate user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    try {
      // TODO: API call
      console.log("Deleting user:", userId);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "inactive": return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      case "suspended": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "sme": return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "supplier": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case "warehouse": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "auditor": return "text-green-400 bg-green-500/10 border-green-500/20";
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
          <span className="text-white font-medium">User Management</span>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              User Management
            </h1>
            <p className="text-gray-400 text-lg">Manage system users and permissions</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all duration-200">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats Cards - Matching Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Users className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {users.length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <CheckCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {users.filter(u => u.status === "active").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Inactive</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <Clock className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {users.filter(u => u.status === "inactive").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Suspended</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <XCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {users.filter(u => u.status === "suspended").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="sme">SME</option>
              <option value="supplier">Supplier</option>
              <option value="warehouse">Warehouse</option>
              <option value="auditor">Auditor</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <Button
              variant="outline"
              onClick={fetchUsers}
              disabled={loading}
              className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Users List */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No users found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters" 
                    : "Add your first user to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-white font-medium">{u.firstName} {u.lastName}</p>
                            <p className="text-sm text-gray-400">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(u.role)}`}>
                            <Shield className="h-3 w-3" />
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-gray-300">{u.company}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(u.status)}`}>
                            {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-gray-400 text-sm">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowModal(true);
                              }}
                              className="border-gray-700 text-white hover:bg-gray-800"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {u.status === "active" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuspendUser(u.id)}
                                className="border-gray-700 text-orange-400 hover:bg-orange-500/10"
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActivateUser(u.id)}
                                className="border-gray-700 text-green-400 hover:bg-green-500/10"
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(u.id)}
                              className="border-gray-700 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

