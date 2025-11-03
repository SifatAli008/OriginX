"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { Upload, ChevronRight, Home, FileText, CheckCircle, X, AlertCircle, Download } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";

interface BatchStatus {
  batchId?: string;
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  totalCount?: number;
  processedCount?: number;
  failedCount?: number;
  errors?: string[];
}

export default function BatchImportPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchName, setBatchName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authState.status, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
        setError("Invalid file type. Please select a CSV, XLS, or XLSX file.");
        return;
      }
      setSelectedFile(file);
      setError(null);
      if (!batchName) {
        setBatchName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const downloadTemplate = () => {
    // CSV template
    const csvContent = [
      ["name", "sku", "category", "description", "brand", "model", "serialNumber", "manufacturingDate", "expiryDate", "imageUrl"],
      ["Sample Product 1", "SKU-001", "electronics", "Sample description", "Brand A", "Model X", "SN001", "2024-01-01", "", ""],
      ["Sample Product 2", "SKU-002", "automotive", "Another description", "Brand B", "Model Y", "SN002", "2024-02-01", "2025-02-01", ""],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);
    setBatchStatus({ status: "uploading" });

    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Create form data
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", batchName || `Batch-${Date.now()}`);

      // Upload and process batch
      const response = await fetch("/api/batches/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import batch");
      }

      setBatchStatus({
        batchId: data.batchId,
        status: data.status === "completed" ? "completed" : "failed",
        totalCount: data.totalCount,
        processedCount: data.processedCount,
        failedCount: data.failedCount,
        errors: data.errors || [],
      });

      // If successful, redirect after 3 seconds
      if (data.status === "completed") {
        setTimeout(() => {
          router.push("/products");
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to import batch:", error);
      setError(error instanceof Error ? error.message : "Failed to import batch");
      setBatchStatus({ status: "failed" });
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-3 w-3" />
          <span onClick={() => router.push("/products")} className="cursor-pointer hover:text-white">Products</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-white font-medium">Batch Import</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Batch Product Import</h1>
          </div>
          <p className="text-gray-400">Upload a CSV or XLS/XLSX file to register multiple products at once</p>
        </div>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Import Products</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter batch name (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">File Upload</label>
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-800/50"
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center text-gray-400">
                        <FileText className="h-12 w-12 mb-2 text-blue-400" />
                        <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                        <p className="text-xs mt-1">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Upload className="h-10 w-10 mb-2" />
                        <p className="text-sm">Click to select CSV, XLS, or XLSX file</p>
                        <p className="text-xs mt-1">Maximum file size: 10MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <p>Don't have a template?</p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {batchStatus.status === "completed" && (
                <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Batch Import Completed!</span>
                  </div>
                  <div className="text-sm text-gray-300 space-y-1 mt-2">
                    <p>Total Products: {batchStatus.totalCount}</p>
                    <p>Processed: {batchStatus.processedCount}</p>
                    {batchStatus.failedCount && batchStatus.failedCount > 0 && (
                      <p className="text-yellow-400">Failed: {batchStatus.failedCount}</p>
                    )}
                  </div>
                  {batchStatus.errors && batchStatus.errors.length > 0 && (
                    <div className="mt-3 text-xs text-gray-400">
                      <p className="font-medium mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {batchStatus.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {batchStatus.errors.length > 5 && (
                          <li>... and {batchStatus.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <p className="text-gray-400 text-xs mt-2 text-center">Redirecting to products page...</p>
                </div>
              )}

              {batchStatus.status === "failed" && batchStatus.errors && batchStatus.errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <div className="text-sm text-red-400">
                    <p className="font-medium mb-2">Import Failed:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {batchStatus.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading || !selectedFile || batchStatus.status === "uploading" || batchStatus.status === "processing"}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {batchStatus.status === "uploading" || batchStatus.status === "processing"
                    ? "Processing..."
                    : "Import Products"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/products")}
                  className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle className="text-white">File Format Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-400">
              <div>
                <p className="font-medium text-white mb-1">Required Columns:</p>
                <ul className="list-disc list-inside ml-2">
                  <li><code className="text-blue-400">name</code> - Product name</li>
                  <li><code className="text-blue-400">sku</code> - Stock Keeping Unit</li>
                  <li><code className="text-blue-400">category</code> - Product category (electronics, automotive, pharmaceuticals, food, textiles, machinery, chemicals, other)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Optional Columns:</p>
                <ul className="list-disc list-inside ml-2">
                  <li><code className="text-blue-400">description</code> - Product description</li>
                  <li><code className="text-blue-400">brand</code> - Brand name</li>
                  <li><code className="text-blue-400">model</code> - Model number</li>
                  <li><code className="text-blue-400">serialNumber</code> - Serial number</li>
                  <li><code className="text-blue-400">manufacturingDate</code> - Date (YYYY-MM-DD)</li>
                  <li><code className="text-blue-400">expiryDate</code> - Date (YYYY-MM-DD)</li>
                  <li><code className="text-blue-400">imageUrl</code> - Image URL</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white mb-1">Notes:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>Each row represents one product</li>
                  <li>CSV files should use comma as delimiter</li>
                  <li>First row should contain column headers</li>
                  <li>Invalid rows will be skipped with error messages</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

