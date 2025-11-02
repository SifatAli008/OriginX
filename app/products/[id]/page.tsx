"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import { AuthGuard } from "@/lib/middleware/auth-guard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Download, Package, QrCode, ArrowLeft } from "lucide-react";
import { getProduct } from "@/lib/firebase/products";
import { downloadQRCode } from "@/lib/utils/qr/generator";
import type { ProductDocument } from "@/lib/types/products";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _authState = useAppSelector((state) => state.auth);

  const [product, setProduct] = useState<ProductDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productData = await getProduct(productId);
      if (!productData) {
        setError("Product not found");
        return;
      }
      setProduct(productData);
    } catch (err) {
      console.error("Error loading product:", err);
      setError("Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId, loadProduct]);

  const handleDownloadQR = () => {
    if (product?.qrDataUrl) {
      const filename = `${product.sku}-${product.productId}.png`;
      downloadQRCode(product.qrDataUrl, filename);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !product) {
    return (
      <AuthGuard>
        <div className="container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || "The product you're looking for doesn't exist."}</p>
            <Link href="/products">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </Link>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href="/products">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8" />
            {product.name}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Product Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Product Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="text-base font-mono">{product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-base capitalize">{product.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <span
                    className={`inline-block px-3 py-1 text-sm rounded ${
                      product.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
                {product.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-base">{product.description}</p>
                  </div>
                )}
                {product.batchId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Batch ID</label>
                    <p className="text-base font-mono">{product.batchId}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-base">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Metadata */}
            {product.metadata && Object.keys(product.metadata).length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(product.metadata).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </label>
                      <p className="text-base">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Product Image */}
            {product.imgUrl && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Product Image</h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imgUrl}
                  alt={product.name}
                  className="w-full max-w-md rounded-lg border"
                />
              </Card>
            )}
          </div>

          {/* QR Code Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-5 w-5" />
                <h2 className="text-xl font-semibold">QR Code</h2>
              </div>
              {product.qrDataUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.qrDataUrl}
                      alt="Product QR Code"
                      className="border rounded-lg max-w-full"
                    />
                  </div>
                  <Button onClick={handleDownloadQR} className="w-full" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download QR Code
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Print this QR code and attach it to your product for verification
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  QR code not available
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => router.push(`/verify?qr=${product.qrHash}`)}>
                  Verify Product
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/movements/new?product=${product.productId}`)}>
                  Create Movement
                </Button>
                {product.batchId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/batches/${product.batchId}`)}
                  >
                    View Batch
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

