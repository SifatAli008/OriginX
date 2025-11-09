"use client";

import { useState, useEffect } from "react";
import { useParams as useNextParams } from "next/navigation";
import Image from "next/image";
import {
  Package,
  ShieldCheck,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Truck,
  Activity,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductData {
  product: {
    productId: string;
    name: string;
    sku: string;
    category: string;
    description?: string;
    status: string;
    imgUrl?: string;
    qrHash?: string;
    qrDataUrl?: string;
    manufacturerId?: string;
    manufacturerName?: string;
    metadata?: Record<string, unknown>;
    createdAt: number;
    quantity?: number;
  } | null;
  transactions: Array<{
    txHash: string;
    type: string;
    status: string;
    blockNumber?: number;
    createdAt: number;
    payload?: Record<string, unknown>;
  }>;
  movements: Array<{
    id: string;
    type: string;
    from: string;
    to: string;
    status: string;
    quantity: number;
    trackingNumber?: string;
    createdAt: number;
    txHash?: string;
  }>;
  verifications: Array<{
    id: string;
    verdict: string;
    aiScore: number;
    confidence: number;
    createdAt: number;
  }>;
}

export default function QRProductContent() {
  const params = useNextParams();
  const productId = params.productId as string;
  
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Fetch product data
  useEffect(() => {
    if (!productId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/qr/${productId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch product data");
        }

        setData(result);
      } catch (err) {
        console.error("Error fetching product data:", err);
        setError(err instanceof Error ? err.message : "Failed to load product information");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  const copyToClipboard = async (text: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "GENUINE":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "FAKE":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "SUSPICIOUS":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "GENUINE":
        return <CheckCircle className="h-4 w-4" />;
      case "FAKE":
        return <XCircle className="h-4 w-4" />;
      case "SUSPICIOUS":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <ShieldCheck className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading product information...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
            <p className="text-gray-400 mb-6">
              {error || "The product you're looking for doesn't exist or has been removed."}
            </p>
            <Button
              onClick={() => window.location.href = "/"}
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { product, transactions, movements, verifications } = data;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-black to-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Product Verification</h1>
              <p className="text-gray-400 text-sm">Public product information and transaction history</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-white text-2xl">{product.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Image */}
                {product.imgUrl && (
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-md aspect-square rounded-lg overflow-hidden border border-gray-700">
                      <Image
                        src={product.imgUrl}
                        alt={product.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                )}

                {/* Product Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">SKU</label>
                    <p className="text-base font-mono text-white mt-1">{product.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Category</label>
                    <p className="text-base capitalize text-white mt-1">
                      {product.category.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Status</label>
                    <div className="mt-1">
                      <Badge
                        className={
                          product.status === "active"
                            ? "bg-green-500/20 text-green-400 border-green-500/50"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/50"
                        }
                      >
                        {product.status}
                      </Badge>
                    </div>
                  </div>
                  {product.quantity !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Quantity</label>
                      <p className="text-base text-white mt-1">{product.quantity}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-400">Manufacturer</label>
                    <p className="text-base text-white mt-1">
                      {product.manufacturerName || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Created</label>
                    <p className="text-base text-white mt-1">{formatDate(product.createdAt)}</p>
                  </div>
                </div>

                {product.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Description</label>
                    <p className="text-base text-white mt-1">{product.description}</p>
                  </div>
                )}

                {/* Metadata */}
                {product.metadata && Object.keys(product.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                      Additional Information
                    </label>
                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-800/50 rounded-lg">
                      {Object.entries(product.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-xs text-gray-500 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <p className="text-sm text-white">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR Hash */}
                {product.qrHash && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                      QR Code Hash
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                      <code className="flex-1 text-xs text-gray-300 font-mono break-all">
                        {product.qrHash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(product.qrHash!, "qrHash")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedHash === "qrHash" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Hash className="h-6 w-6 text-purple-400" />
                    <CardTitle className="text-white">Transaction History</CardTitle>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    {transactions.length} transactions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.txHash}
                        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                className={
                                  tx.status === "confirmed"
                                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                                }
                              >
                                {tx.type}
                              </Badge>
                              {tx.blockNumber && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                                  Block #{tx.blockNumber}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-gray-500" />
                              <code className="text-xs text-gray-300 font-mono break-all">
                                {tx.txHash}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(tx.txHash, tx.txHash)}
                                className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                              >
                                {copiedHash === tx.txHash ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(tx.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movement History */}
            {movements.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Truck className="h-6 w-6 text-orange-400" />
                      <CardTitle className="text-white">Movement History</CardTitle>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                      {movements.length} movements
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {movements.map((movement) => (
                      <div
                        key={movement.id}
                        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                                {movement.type}
                              </Badge>
                              <span className="text-sm text-gray-400">
                                {movement.from} → {movement.to}
                              </span>
                            </div>
                            {movement.trackingNumber && (
                              <p className="text-xs text-gray-500">
                                Tracking: {movement.trackingNumber}
                              </p>
                            )}
                            {movement.txHash && (
                              <div className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-gray-500" />
                                <code className="text-xs text-gray-400 font-mono">
                                  {movement.txHash.substring(0, 20)}...
                                </code>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(movement.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Verification History */}
            {verifications.length > 0 && (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-6 w-6 text-green-400" />
                      <CardTitle className="text-white">Verification History</CardTitle>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      {verifications.length} verifications
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {verifications.map((verification) => (
                      <div
                        key={verification.id}
                        className={`p-4 rounded-lg border ${getVerdictColor(verification.verdict)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {getVerdictIcon(verification.verdict)}
                              <span className="font-semibold">{verification.verdict}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span>
                                AI Score: <strong>{verification.aiScore.toFixed(1)}%</strong>
                              </span>
                              <span>
                                Confidence: <strong>{verification.confidence.toFixed(1)}%</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs opacity-80">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(verification.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Transactions</span>
                  <span className="text-lg font-bold text-white">{transactions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Movements</span>
                  <span className="text-lg font-bold text-white">{movements.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Verifications</span>
                  <span className="text-lg font-bold text-white">{verifications.length}</span>
                </div>
                {verifications.length > 0 && (
                  <div className="pt-4 border-t border-gray-700">
                    <span className="text-sm text-gray-400 block mb-2">Latest Verification</span>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getVerdictColor(verifications[0]!.verdict)}`}>
                      {getVerdictIcon(verifications[0]!.verdict)}
                      <span className="text-sm font-medium">{verifications[0]!.verdict}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-white hover:bg-gray-800"
                  onClick={() => window.open(`/verify?qr=${product.qrHash}`, "_blank")}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify Product
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-white hover:bg-gray-800"
                  onClick={() => window.open(`/blockchain?productId=${product.productId}`, "_blank")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Full History
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            {/* Share */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Share</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-white hover:bg-gray-800"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    setCopiedHash("share");
                    setTimeout(() => setCopiedHash(null), 2000);
                  }}
                >
                  {copiedHash === "share" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

