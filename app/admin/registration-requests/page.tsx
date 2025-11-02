"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Mail,
  Phone,
  Building2,
  ChevronRight,
  Home,
  RefreshCw,
  Loader2,
  Calendar,
  MapPin,
  User,
  Briefcase,
  FileEdit,
  X,
} from "lucide-react";
import { getAllRegistrationRequests, approveRegistrationRequest, rejectRegistrationRequest, createOrganization } from "@/lib/firebase/company";
import { updateDoc, doc } from "firebase/firestore";
import { getFirestore } from "@/lib/firebase/client";
import type { CompanyRegistrationRequest } from "@/lib/types/company";

interface RegistrationRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
  documents: string[];
  userId: string;
  companyName: string;
  companyType?: string;
  description?: string;
  address?: string;
}

export default function RegistrationRequestsPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, user, router]);

  const mapCompanyRequestToUI = (request: CompanyRegistrationRequest): RegistrationRequest => {
    // Parse user name from userName field (could be "FirstName LastName" or just "FirstName")
    const nameParts = (request.userName || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      id: request.requestId,
      firstName,
      lastName,
      email: request.userEmail,
      phone: request.phone || "N/A",
      company: request.companyName,
      role: "sme", // Default role, user will select later
      status: request.status,
      submittedAt: new Date(request.requestedAt),
      documents: [],
      userId: request.userId,
      companyName: request.companyName,
      companyType: request.companyType,
      description: request.description,
      address: request.address,
    };
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const companyRequests = await getAllRegistrationRequests();
      const mappedRequests = companyRequests.map(mapCompanyRequestToUI);
      // Sort by date, newest first
      mappedRequests.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      setRequests(mappedRequests);
    } catch (error) {
      console.error("Failed to fetch registration requests:", error);
      setError("Failed to load registration requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    
    setProcessingRequest(requestId);
    setError(null);
    try {
      // Find the request
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Create organization from company registration data
      const orgId = await createOrganization({
        name: request.companyName,
        type: request.companyType,
        description: request.description,
        address: request.address,
        phone: request.phone !== "N/A" ? request.phone : undefined,
      });

      // Approve the registration request
      await approveRegistrationRequest(requestId, user.uid, orgId);

      // Update user document to link them to the organization
      const db = getFirestore();
      if (!db) {
        throw new Error("Database not initialized");
      }

      const userRef = doc(db, "users", request.userId);
      await updateDoc(userRef, {
        orgId: orgId,
        orgName: request.companyName,
        status: "active",
        updatedAt: Date.now(),
      });

      // Refresh the list
      await fetchRequests();
      if (showDetails) {
        setShowDetails(false);
      }
    } catch (error) {
      console.error("Failed to approve request:", error);
      setError(error instanceof Error ? error.message : "Failed to approve request. Please try again.");
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (requestId: string, reason?: string) => {
    if (!user) return;
    
    setProcessingRequest(requestId);
    setError(null);
    try {
      await rejectRegistrationRequest(requestId, user.uid, reason);
      // Refresh the list
      await fetchRequests();
      if (showDetails) {
        setShowDetails(false);
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      setError(error instanceof Error ? error.message : "Failed to reject request. Please try again.");
    } finally {
      setProcessingRequest(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      request.firstName.toLowerCase().includes(searchLower) ||
      request.lastName.toLowerCase().includes(searchLower) ||
      request.email.toLowerCase().includes(searchLower) ||
      request.company.toLowerCase().includes(searchLower) ||
      request.companyName.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "approved": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "rejected": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "approved": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Format date/time for display
  const formatDateTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } else if (days > 0) {
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    } else {
      return "Just now";
    }
  };

  const formatFullDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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
          <span className="text-white font-medium">Registration Requests</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Registration Requests
            </h1>
            <p className="text-gray-400 text-lg">Review and manage company registration requests</p>
          </div>
          <Button
            onClick={fetchRequests}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20 transition-all duration-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Cards - Matching Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Requests</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <FileText className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {requests.length}
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
                {requests.filter(r => r.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Approved</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <CheckCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {requests.filter(r => r.status === "approved").length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Rejected</CardTitle>
              <div className="text-gray-400 p-2 rounded-lg bg-gray-800/50">
                <XCircle className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {requests.filter(r => r.status === "rejected").length}
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
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                if (value === "all" || value === "pending" || value === "approved" || value === "rejected") {
                  setStatusFilter(value);
                }
              }}
            >
              <SelectTrigger className="w-[180px] h-12 px-4 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg text-white hover:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm">
                <SelectValue placeholder="All Status">
                  {statusFilter === "all" 
                    ? "All Status" 
                    : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 text-white shadow-xl">
                <SelectItem 
                  value="all" 
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-white"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>All Status</span>
                  </div>
                </SelectItem>
                <SelectItem 
                  value="pending" 
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-white"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <span>Pending</span>
                  </div>
                </SelectItem>
                <SelectItem 
                  value="approved" 
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-white"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Approved</span>
                  </div>
                </SelectItem>
                <SelectItem 
                  value="rejected" 
                  className="hover:bg-gray-800 focus:bg-gray-800 cursor-pointer text-white"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span>Rejected</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={fetchRequests}
              disabled={loading}
              className="border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm transition-all h-12 px-4"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Requests List */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-600 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400">Loading requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No registration requests found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "New requests will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-5 bg-gradient-to-br from-gray-800/40 to-gray-800/20 border border-gray-700 rounded-xl hover:border-gray-600 hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        {/* Header with Name and Status */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <User className="h-5 w-5 text-blue-400" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                  {request.firstName} {request.lastName}
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">
                                  <Briefcase className="h-3 w-3 inline mr-1" />
                                  Applying for: <span className="text-blue-400 font-medium">{request.role}</span>
                                </p>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                                {getStatusIcon(request.status)}
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Contact Information Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2.5 text-gray-300 bg-gray-800/30 px-3 py-2 rounded-lg border border-gray-700/50">
                            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{request.email}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-gray-300 bg-gray-800/30 px-3 py-2 rounded-lg border border-gray-700/50">
                            <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span>{request.phone}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-gray-300 bg-gray-800/30 px-3 py-2 rounded-lg border border-gray-700/50">
                            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{request.company}</span>
                          </div>
                        </div>

                        {/* Description Preview */}
                        {request.description && (
                          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <FileEdit className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-400 mb-1">Description</p>
                                <p className="text-sm text-gray-300 line-clamp-2">
                                  {request.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Time and Date */}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDateTime(request.submittedAt)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatFullDateTime(request.submittedAt)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-700/50">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetails(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            View Details
                          </Button>
                          
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(request.id)}
                                disabled={processingRequest === request.id}
                                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 shadow-lg shadow-green-500/20"
                              >
                                {processingRequest === request.id ? (
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1.5" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const reason = prompt("Please provide a reason for rejection (optional):");
                                  if (reason !== null) {
                                    handleReject(request.id, reason || undefined);
                                  }
                                }}
                                disabled={processingRequest === request.id}
                                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 shadow-lg shadow-red-500/20"
                              >
                                {processingRequest === request.id ? (
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-1.5" />
                                )}
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Details Modal */}
        {showDetails && selectedRequest && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetails(false);
            }
          }}
        >
          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-2xl">Registration Request Details</CardTitle>
                    <p className="text-gray-400 text-sm mt-1">
                      Submitted {formatDateTime(selectedRequest.submittedAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Applicant Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Applicant Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      Full Name
                    </label>
                    <p className="text-white text-lg font-medium">
                      {selectedRequest.firstName} {selectedRequest.lastName}
                    </p>
                  </div>
                  
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      Requested Role
                    </label>
                    <p className="text-white text-lg font-medium">{selectedRequest.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email Address
                    </label>
                    <p className="text-white break-all">{selectedRequest.email}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </label>
                    <p className="text-white">{selectedRequest.phone}</p>
                  </div>
                </div>
              </div>

              {/* Company Information Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Company Information</h3>
                </div>
                
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Company Name
                  </label>
                  <p className="text-white text-lg font-medium">{selectedRequest.companyName}</p>
                </div>

                {selectedRequest.companyType && (
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      Company Type
                    </label>
                    <p className="text-white">{selectedRequest.companyType}</p>
                  </div>
                )}
                
                {selectedRequest.description && (
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <FileEdit className="h-3 w-3" />
                      Description
                    </label>
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}
                
                {selectedRequest.address && (
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Address
                    </label>
                    <p className="text-white">{selectedRequest.address}</p>
                  </div>
                )}
              </div>

              {/* Request Metadata Section */}
              <div className="space-y-4 pt-2 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Request Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Submitted At
                    </label>
                    <p className="text-white font-medium">
                      {formatFullDateTime(selectedRequest.submittedAt)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {formatDateTime(selectedRequest.submittedAt)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                      Status
                    </label>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                        {getStatusIcon(selectedRequest.status)}
                        {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedRequest.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t border-gray-800">
                  <Button
                    onClick={() => {
                      handleApprove(selectedRequest.id);
                    }}
                    disabled={processingRequest === selectedRequest.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 shadow-lg shadow-green-500/20 h-11"
                  >
                    {processingRequest === selectedRequest.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve Request
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = prompt("Please provide a reason for rejection (optional):");
                      if (reason !== null) {
                        handleReject(selectedRequest.id, reason || undefined);
                      }
                    }}
                    disabled={processingRequest === selectedRequest.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 shadow-lg shadow-red-500/20 h-11"
                  >
                    {processingRequest === selectedRequest.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
