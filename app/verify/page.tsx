"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Loader2,
  Home,
  ChevronRight,
} from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import Image from "next/image";

type VerificationVerdict = "GENUINE" | "FAKE" | "SUSPICIOUS" | "INVALID";

interface VerificationResult {
  verdict: VerificationVerdict;
  aiScore: number;
  confidence: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  factors?: string[];
  product?: {
    productId: string;
    name: string;
    sku: string;
    category: string;
    manufacturerId: string;
    status: string;
  };
  transaction?: {
    txHash: string;
    blockNumber?: number;
    status: string;
    type: string;
    timestamp: number;
  };
  error?: string;
}

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if QR code is provided in URL
  useEffect(() => {
    const qrParam = searchParams?.get("qr");
    if (qrParam) {
      setQrInput(qrParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authState.status, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleVerify = async () => {
    if (!qrInput.trim()) {
      setError("Please enter or scan a QR code");
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Convert image to base64 if selected
      let imageBase64: string | undefined;
      if (selectedImage) {
        imageBase64 = await convertFileToBase64(selectedImage);
      }

      // Call verification API
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qrEncrypted: qrInput.trim(),
          image: imageBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setVerificationResult(data);
    } catch (error) {
      console.error("Verification error:", error);
      setError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: VerificationVerdict) => {
    switch (verdict) {
      case "GENUINE":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "FAKE":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "SUSPICIOUS":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "INVALID":
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getVerdictIcon = (verdict: VerificationVerdict) => {
    switch (verdict) {
      case "GENUINE":
        return <CheckCircle className="h-6 w-6" />;
      case "FAKE":
        return <XCircle className="h-6 w-6" />;
      case "SUSPICIOUS":
        return <AlertTriangle className="h-6 w-6" />;
      case "INVALID":
        return <XCircle className="h-6 w-6" />;
      default:
        return <Shield className="h-6 w-6" />;
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
          <span className="text-white font-medium">Verify Product</span>
        </nav>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Verify Product Authenticity</h1>
          </div>
          <p className="text-gray-400">Scan or enter QR code to verify product authenticity</p>
        </div>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">QR Code Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* QR Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  QR Code Data (Encrypted)
                </label>
                <textarea
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Paste encrypted QR code data here or scan using camera"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can also scan a QR code image or paste the encrypted data directly
                </p>
              </div>

              {/* Image Upload (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Product Image (Optional)
                </label>
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-800/50"
                  >
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={400}
                        height={128}
                        className="w-full h-full object-contain rounded-lg"
                        unoptimized
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Upload className="h-8 w-8 mb-2" />
                        <p className="text-sm">Click to upload product image</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload a photo of the product for AI-powered authenticity analysis
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleVerify}
                disabled={loading || !qrInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Product
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verification Result */}
        {verificationResult && (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Verification Result</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Verdict */}
                <div className={`p-6 rounded-lg border-2 ${getVerdictColor(verificationResult.verdict)}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {getVerdictIcon(verificationResult.verdict)}
                    <h3 className="text-2xl font-bold">
                      {verificationResult.verdict === "GENUINE"
                        ? "✓ Authentic Product"
                        : verificationResult.verdict === "FAKE"
                          ? "✗ Counterfeit Detected"
                          : verificationResult.verdict === "SUSPICIOUS"
                            ? "⚠ Suspicious Product"
                            : "✗ Invalid QR Code"}
                    </h3>
                  </div>
                  <p className="text-sm opacity-80">
                    {verificationResult.verdict === "GENUINE"
                      ? "This product appears to be authentic based on our verification."
                      : verificationResult.verdict === "FAKE"
                        ? "This product may be counterfeit. Please exercise caution."
                        : verificationResult.verdict === "SUSPICIOUS"
                          ? "This product shows some suspicious characteristics. Further investigation recommended."
                          : "The QR code could not be validated. It may be invalid or corrupted."}
                  </p>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">AI Authenticity Score</p>
                    <p className="text-2xl font-bold text-white">{verificationResult.aiScore.toFixed(1)}%</p>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          verificationResult.aiScore >= 80
                            ? "bg-green-500"
                            : verificationResult.aiScore >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${verificationResult.aiScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Confidence Level</p>
                    <p className="text-2xl font-bold text-white">{verificationResult.confidence.toFixed(1)}%</p>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${verificationResult.confidence}%` }}
                      />
                    </div>
                  </div>
                  {verificationResult.riskLevel && (
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Risk Level</p>
                      <p className={`text-2xl font-bold ${
                        verificationResult.riskLevel === "low" ? "text-green-400" :
                        verificationResult.riskLevel === "medium" ? "text-yellow-400" :
                        verificationResult.riskLevel === "high" ? "text-orange-400" :
                        "text-red-400"
                      }`}>
                        {verificationResult.riskLevel.toUpperCase()}
                      </p>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          verificationResult.riskLevel === "low" ? "bg-green-500/20 text-green-400" :
                          verificationResult.riskLevel === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                          verificationResult.riskLevel === "high" ? "bg-orange-500/20 text-orange-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {verificationResult.riskLevel === "low" ? "Safe" :
                           verificationResult.riskLevel === "medium" ? "Caution" :
                           verificationResult.riskLevel === "high" ? "Warning" :
                           "Critical"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Factors */}
                {verificationResult.factors && verificationResult.factors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-2">Verification Factors</p>
                    <ul className="space-y-1">
                      {verificationResult.factors.map((factor, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              factor.toLowerCase().includes("match") || factor.toLowerCase().includes("recent")
                                ? "bg-green-500"
                                : factor.toLowerCase().includes("mismatch") || factor.toLowerCase().includes("not found")
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }`}
                          />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Product Info */}
                {verificationResult.product && (
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm font-medium text-gray-400 mb-2">Product Information</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-white">
                        <span className="text-gray-400">Name:</span> {verificationResult.product.name}
                      </p>
                      <p className="text-white">
                        <span className="text-gray-400">SKU:</span> {verificationResult.product.sku}
                      </p>
                      <p className="text-white">
                        <span className="text-gray-400">Category:</span> {verificationResult.product.category}
                      </p>
                      <p className="text-white">
                        <span className="text-gray-400">Status:</span> {verificationResult.product.status}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/products/${verificationResult.product!.productId}`)}
                      className="mt-3 border-gray-700 text-white hover:bg-gray-800"
                    >
                      View Product Details
                    </Button>
                  </div>
                )}

                {/* Transaction Info */}
                {verificationResult.transaction && (
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-sm font-medium text-gray-400 mb-2">Blockchain Transaction</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-white font-mono text-xs break-all">
                        <span className="text-gray-400">Hash:</span> {verificationResult.transaction.txHash}
                      </p>
                      {verificationResult.transaction.blockNumber && (
                        <p className="text-white">
                          <span className="text-gray-400">Block:</span> {verificationResult.transaction.blockNumber}
                        </p>
                      )}
                      <p className="text-white">
                        <span className="text-gray-400">Status:</span> {verificationResult.transaction.status}
                      </p>
                      <p className="text-white">
                        <span className="text-gray-400">Type:</span> {verificationResult.transaction.type}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/blockchain?tx=${verificationResult.transaction!.txHash}`)}
                      className="mt-3 border-gray-700 text-white hover:bg-gray-800"
                    >
                      View Transaction
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

