"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Users, Package, ArrowRight, RefreshCw, Search, Plus, Minus, AlertCircle, X } from "lucide-react";

interface SmeItem {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  orgId: string | null;
  orgName?: string;
  status: string;
}

interface ProductListItem {
  productId: string;
  name: string;
  sku?: string;
  createdAt?: number;
  quantity?: number; // available quantity (inventory)
}

export default function SmeAssignPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [smes, setSmes] = useState<SmeItem[]>([]);
  const [smeSearch, setSmeSearch] = useState("");
  const [selectedSmeId, setSelectedSmeId] = useState<string>("");

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, boolean>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authState.status, router]);

  const fetchData = useCallback(async (opts?: { smeQuery?: string }) => {
    try {
      setLoading(true);
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error("Not authenticated");
      const token = await auth.currentUser.getIdToken();

      // Load SMEs (org-scoped for non-admins)
      const smeResp = await fetch(`/api/sme/list${opts?.smeQuery ? `?q=${encodeURIComponent(opts.smeQuery)}` : ""}` , {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const smeData = await smeResp.json();
      
      if (!smeResp.ok) {
        const errorMsg = smeData.error || "Failed to load SMEs";
        console.error("[SME Assign] API error:", errorMsg, smeResp.status);
        throw new Error(errorMsg);
      }
      
      setSmes(smeData.items || []);
      
      // Log for debugging
      if (smeData.items && smeData.items.length === 0) {
        console.log("[SME Assign] No SMEs found. User role:", user?.role || "N/A");
      }

      // Load products for the current manufacturer (company user)
      const prodResp = await fetch("/api/products?pageSize=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!prodResp.ok) throw new Error("Failed to load products");
      const prodData = await prodResp.json() as { items?: Array<{
        productId: string;
        name?: string;
        sku?: string;
        createdAt?: number;
        quantity?: number;
      }> };
      const mapped: ProductListItem[] = (prodData.items || []).map((p) => ({
        productId: p.productId,
        name: p.name || "Unnamed Product",
        sku: p.sku,
        createdAt: p.createdAt,
        quantity: typeof p.quantity === "number" ? p.quantity : undefined,
      }));
      setProducts(mapped);
    } catch (error) {
      console.error("[Product Transfer] load error", error);
      addToast({
        variant: "error",
        title: "Failed to load data",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Debounced SME server-side search
  useEffect(() => {
    if (!user) return;
    const handle = setTimeout(() => {
      fetchData({ smeQuery: smeSearch });
    }, 300);
    return () => clearTimeout(handle);
  }, [smeSearch, user, fetchData]);

  const filteredSmes = useMemo(() => {
    const q = smeSearch.toLowerCase();
    return smes.filter((s) =>
      (s.displayName || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.orgName || "").toLowerCase().includes(q)
    );
  }, [smes, smeSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => ({ ...prev, [id]: !prev[id] }));
    setSelectedQuantities((prev) => ({ ...prev, [id]: prev[id] ?? "1" }));
  };

  const validation = useMemo(() => {
    if (!selectedSmeId) return { ok: false, reason: "Select an SME" } as const;
    const ids = Object.entries(selectedProductIds).filter(([, v]) => v).map(([id]) => id);
    if (ids.length === 0) return { ok: false, reason: "Select at least one product" } as const;
    for (const id of ids) {
      const qtyStr = selectedQuantities[id] ?? "";
      const qty = Number(qtyStr);
      if (Number.isNaN(qty) || !Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return { ok: false, reason: "Quantity must be a positive integer" } as const;
      }
      const prod = products.find(p => p.productId === id);
      if (prod && typeof prod.quantity === "number" && qty > prod.quantity) {
        return { ok: false, reason: `Quantity exceeds available for ${prod.name}` } as const;
      }
    }
    return { ok: true } as const;
  }, [selectedSmeId, selectedProductIds, selectedQuantities, products]);

  const selectedCount = useMemo(() => Object.values(selectedProductIds).filter(Boolean).length, [selectedProductIds]);
  const totalSelectedQty = useMemo(() => {
    return Object.entries(selectedProductIds)
      .filter(([, v]) => v)
      .map(([id]) => Math.max(1, Math.floor(Number(selectedQuantities[id] ?? 1))))
      .reduce((a, b) => a + b, 0);
  }, [selectedProductIds, selectedQuantities]);

  const handleTransferExecute = async () => {
    if (!validation.ok) {
      addToast({ variant: "error", title: "Cannot transfer", description: validation.reason });
      return;
    }
    const selectedProductList = filteredProducts.filter((p) => selectedProductIds[p.productId]);
    try {
      setSubmitting(true);
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error("Not authenticated");
      const token = await auth.currentUser.getIdToken();

      const sme = smes.find((s) => s.uid === selectedSmeId);
      if (!sme) throw new Error("SME not found");

      const fromLabel = (user as unknown as { orgName?: string })?.orgName || user?.displayName || user?.email || "Company";
      const toLabel = sme.displayName || sme.email;

      // Transfer each product via movements API (type: transfer)
      for (const prod of selectedProductList) {
        const qty = Math.floor(Number(selectedQuantities[prod.productId] ?? 1));
        const body = {
          productId: prod.productId,
          productName: prod.name,
          type: "transfer",
          from: fromLabel,
          to: toLabel,
          status: "pending",
          quantity: qty,
          trackingNumber: `TR-${Date.now()}-${prod.productId.slice(0, 6)}`,
          notes: `Transfer to SME ${toLabel}`,
        };
        const resp = await fetch("/api/movements", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Failed to transfer ${prod.name}`);
        }
      }

      addToast({ variant: "success", title: "Transfer initiated", description: `${selectedProductList.length} product(s) queued` });
      // Reset selection
      setSelectedProductIds({});
      setSelectedQuantities({});
    } catch (error) {
      console.error("[Product Transfer] transfer error", error);
      addToast({ variant: "error", title: "Transfer failed", description: error instanceof Error ? error.message : "Please try again" });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const handleTransfer = () => {
    if (!validation.ok) {
      const reason = validation.reason;
      setInlineError(reason || "Fix validation issues");
      addToast({ variant: "error", title: "Cannot transfer", description: reason || "Validation error" });
      return;
    }
    setInlineError("");
    setShowConfirm(true);
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.displayName || user.email}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
                <CardTitle className="text-white">Product Transfer</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="border-gray-700 text-white hover:bg-gray-800">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* SME List */}
              <div className="lg:col-span-1">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select SME</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={smeSearch}
                      onChange={(e) => setSmeSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          fetchData({ smeQuery: smeSearch });
                        }
                      }}
                      placeholder="Search by name or email..."
                      className="pl-9 pr-20 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {smeSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setSmeSearch("");
                            fetchData();
                          }}
                          className="px-2 py-1 text-xs text-gray-400 hover:text-white rounded bg-gray-800 border border-gray-700"
                          aria-label="Clear"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => fetchData({ smeQuery: smeSearch })}
                        className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Search Results */}
                {smeSearch && filteredSmes.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">Search Results ({filteredSmes.length})</div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-gray-800 rounded-lg p-2 bg-gray-900/30">
                      {filteredSmes.map((s) => (
                        <button
                          key={s.uid}
                          onClick={() => setSelectedSmeId(s.uid)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedSmeId === s.uid 
                              ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                              : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{s.displayName || s.email}</div>
                              {s.displayName && <div className="text-xs text-gray-400 mt-0.5">{s.email}</div>}
                              {s.orgName && <div className="text-xs text-gray-500 mt-1">{s.orgName}</div>}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* All Existing SMEs */}
                <div>
                  <div className="text-xs text-gray-400 mb-2">
                    {smeSearch ? `All SMEs (${smes.length})` : `Existing SMEs (${smes.length})`}
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-gray-800 rounded-lg p-2 bg-gray-900/30">
                    {smes.length > 0 ? (
                      smes.map((s) => {
                        const isFiltered = filteredSmes.some(fs => fs.uid === s.uid);
                        const isSelected = selectedSmeId === s.uid;
                        return (
                          <button
                            key={s.uid}
                            onClick={() => setSelectedSmeId(s.uid)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                                : isFiltered && smeSearch
                                ? 'border-gray-700 bg-gray-900/40 opacity-60'
                                : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="text-white text-sm font-medium">{s.displayName || s.email}</div>
                                {s.displayName && <div className="text-xs text-gray-400 mt-0.5">{s.email}</div>}
                                {s.orgName && <div className="text-xs text-gray-500 mt-1">{s.orgName}</div>}
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-500 p-4 text-center">
                        {smeSearch ? `No SMEs found matching "${smeSearch}"` : "No SMEs available"}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Selected SME Confirmation */}
                {selectedSmeId && (
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Selected:</div>
                    <div className="text-sm text-white font-medium">
                      {smes.find(s => s.uid === selectedSmeId)?.displayName || smes.find(s => s.uid === selectedSmeId)?.email}
                    </div>
                  </div>
                )}
              </div>

              {/* Products List */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Products</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      value={productSearch} 
                      onChange={(e) => setProductSearch(e.target.value)} 
                      placeholder="Search by name or SKU..."
                      className="pl-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Search Results */}
                {productSearch && filteredProducts.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">Search Results ({filteredProducts.length})</div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-800 border border-gray-800 rounded-lg bg-gray-900/30">
                      {filteredProducts.map((p) => (
                        <div key={p.productId} className="p-3 hover:bg-gray-900/50">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="accent-blue-500"
                              checked={!!selectedProductIds[p.productId]}
                              onChange={() => toggleProduct(p.productId)}
                            />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-gray-800 rounded">
                                <Package className="h-4 w-4 text-gray-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-medium truncate">{p.name}</div>
                                <div className="text-xs text-gray-500 truncate">{p.sku || p.productId}</div>
                              </div>
                              {typeof p.quantity === "number" && (
                                <div className="text-xs text-gray-400 whitespace-nowrap">Available: {p.quantity}</div>
                              )}
                            </div>
                          </label>
                          {selectedProductIds[p.productId] && (
                            <div className="mt-2 pl-8 grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedQuantities(prev => {
                                      const val = Math.max(1, Math.floor(Number(prev[p.productId] ?? 1)) - 1);
                                      return { ...prev, [p.productId]: String(val) };
                                    })}
                                    className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={selectedQuantities[p.productId] ?? "1"}
                                    onChange={(e) => setSelectedQuantities(prev => ({ ...prev, [p.productId]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    placeholder="1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSelectedQuantities(prev => {
                                      const current = Math.floor(Number(prev[p.productId] ?? 1));
                                      const nextVal = Number.isFinite(current) ? current + 1 : 1;
                                      return { ...prev, [p.productId]: String(nextVal) };
                                    })}
                                    className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {typeof p.quantity === "number" && (
                                <div className="self-end text-xs text-gray-500">
                                  Max: {p.quantity}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Existing Products */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {productSearch ? `All Products (${products.length})` : `Existing Products (${products.length})`}
                    </div>
                    {products.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="accent-blue-500"
                          checked={products.length > 0 && products.every(p => !!selectedProductIds[p.productId])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedProductIds(prev => {
                              const next = { ...prev } as Record<string, boolean>;
                              products.forEach(p => { next[p.productId] = checked; });
                              return next;
                            });
                            setSelectedQuantities(prev => {
                              const next = { ...prev } as Record<string, string>;
                              products.forEach(p => { if (checked) next[p.productId] = next[p.productId] ?? "1"; });
                              return next;
                            });
                          }}
                        />
                        <span className="text-xs text-gray-400">Select All</span>
                      </label>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-800 border border-gray-800 rounded-lg bg-gray-900/30">
                    {products.length > 0 ? (
                      products.map((p) => {
                        const isFiltered = filteredProducts.some(fp => fp.productId === p.productId);
                        const isSelected = !!selectedProductIds[p.productId];
                        return (
                          <div 
                            key={p.productId} 
                            className={`p-3 hover:bg-gray-900/50 transition-all ${
                              isFiltered && productSearch ? 'opacity-60' : ''
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="accent-blue-500"
                                checked={isSelected}
                                onChange={() => toggleProduct(p.productId)}
                              />
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-gray-800 rounded">
                                  <Package className="h-4 w-4 text-gray-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white text-sm font-medium truncate">{p.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{p.sku || p.productId}</div>
                                </div>
                                {typeof p.quantity === "number" && (
                                  <div className="text-xs text-gray-400 whitespace-nowrap">Available: {p.quantity}</div>
                                )}
                              </div>
                            </label>
                            {isSelected && (
                              <div className="mt-2 pl-8 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedQuantities(prev => {
                                        const val = Math.max(1, Math.floor(Number(prev[p.productId] ?? 1)) - 1);
                                        return { ...prev, [p.productId]: String(val) };
                                      })}
                                      className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      step={1}
                                      value={selectedQuantities[p.productId] ?? "1"}
                                      onChange={(e) => setSelectedQuantities(prev => ({ ...prev, [p.productId]: e.target.value }))}
                                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                      placeholder="1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setSelectedQuantities(prev => {
                                        const current = Math.floor(Number(prev[p.productId] ?? 1));
                                        const nextVal = Number.isFinite(current) ? current + 1 : 1;
                                        return { ...prev, [p.productId]: String(nextVal) };
                                      })}
                                      className="p-2 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {typeof p.quantity === "number" && (
                                  <div className="self-end text-xs text-gray-500">
                                    Max: {p.quantity}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-500 p-4 text-center">
                        {productSearch ? `No products found matching "${productSearch}"` : "No products available"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    {inlineError && (
                      <div className="flex items-center gap-1 text-red-400"><AlertCircle className="h-4 w-4" />{inlineError}</div>
                    )}
                    {!inlineError && selectedCount > 0 && (
                      <div className="text-gray-400">Selected: <span className="text-white font-medium">{selectedCount}</span> • Total Qty: <span className="text-white font-medium">{totalSelectedQty}</span></div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleTransfer} disabled={!validation.ok || submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}<span className="ml-2">Transfer{selectedCount > 0 ? ` (${selectedCount})` : ""}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Confirm Transfer</h3>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">You are about to transfer <span className="text-white font-medium">{selectedCount}</span> product(s) with a total quantity of <span className="text-white font-medium">{totalSelectedQty}</span> to the selected SME.</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" className="border-gray-700 text-white hover:bg-gray-800" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleTransferExecute} disabled={submitting}>
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                <span className="ml-2">Confirm</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


