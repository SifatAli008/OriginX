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
import { Users, Package, ArrowRight, RefreshCw, Search } from "lucide-react";

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
  quantity?: number;
}

export default function SmeProductTransferPage() {
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

      // SMEs in org
      const smeResp = await fetch(`/api/sme/list${opts?.smeQuery ? `?q=${encodeURIComponent(opts.smeQuery)}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (smeResp.ok) {
        const smeData = await smeResp.json();
        setSmes(smeData.items || []);
      }

      // Products visible to SME (their own or created by them)
      const prodResp = await fetch("/api/products?pageSize=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (prodResp.ok) {
        const data = await prodResp.json();
        const mapped: ProductListItem[] = (data.items || []).map((p: any) => ({
          productId: p.productId,
          name: p.name || "Unnamed Product",
          sku: p.sku,
          createdAt: p.createdAt,
          quantity: typeof p.quantity === "number" ? p.quantity : undefined,
        }));
        setProducts(mapped);
      }
    } catch (error) {
      console.error("[Product Transfer SME] load error", error);
      addToast({ variant: "error", title: "Failed to load data", description: "Please try again later" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);
  useEffect(() => { if (!user) return; const t = setTimeout(() => fetchData({ smeQuery: smeSearch }), 300); return () => clearTimeout(t); }, [smeSearch, user, fetchData]);

  const filteredSmes = useMemo(() => {
    const q = smeSearch.toLowerCase();
    return smes.filter((s) => (s.displayName || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q));
  }, [smes, smeSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }, [products, productSearch]);

  const toggleProduct = (id: string) => {
    const isSelected = selectedProductIds[id];
    setSelectedProductIds((prev) => ({ ...prev, [id]: !isSelected }));
    if (!isSelected) {
      // When selecting, initialize quantity to 1 if not already set
      setSelectedQuantities((prev) => {
        if (!prev[id] || prev[id] === "" || Number(prev[id]) <= 0) {
          return { ...prev, [id]: "1" };
        }
        return prev;
      });
    } else {
      // When deselecting, remove quantity
      setSelectedQuantities((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const validation = useMemo(() => {
    if (!selectedSmeId) return { ok: false, reason: "Select a receiver SME" } as const;
    const ids = Object.entries(selectedProductIds).filter(([, v]) => v).map(([id]) => id);
    if (ids.length === 0) return { ok: false, reason: "Select at least one product" } as const;
    for (const id of ids) {
      const qty = Math.floor(Number(selectedQuantities[id] ?? 1));
      if (!Number.isFinite(qty) || qty <= 0) return { ok: false, reason: "Quantity must be positive" } as const;
    }
    return { ok: true } as const;
  }, [selectedSmeId, selectedProductIds, selectedQuantities]);

  const handleTransfer = async () => {
    if (!validation.ok) { addToast({ variant: "error", title: "Cannot transfer", description: (validation as any).reason }); return; }
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    const to = smes.find(s => s.uid === selectedSmeId);
    const toLabel = to?.displayName || to?.email || "SME";
    const fromLabel = user?.displayName || user?.email || "SME";

    const selected = filteredProducts.filter(p => selectedProductIds[p.productId]);
    try {
      setSubmitting(true);
      for (const prod of selected) {
        // Get quantity and ensure it's a valid positive number
        const qtyStr = selectedQuantities[prod.productId];
        let qty = 1;
        if (qtyStr && qtyStr !== "") {
          const parsed = Number(qtyStr);
          if (Number.isFinite(parsed) && parsed > 0) {
            qty = Math.floor(parsed);
          }
        }
        
        // Validate against available quantity if product has quantity field
        if (typeof prod.quantity === "number" && qty > prod.quantity) {
          addToast({ 
            variant: "error", 
            title: "Insufficient quantity", 
            description: `${prod.name}: Requested ${qty}, but only ${prod.quantity} available` 
          });
          setSubmitting(false);
          return;
        }

        await fetch("/api/movements", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            productId: prod.productId, 
            productName: prod.name, 
            type: "transfer", 
            from: fromLabel, 
            to: toLabel, 
            quantity: qty, 
            status: "pending", 
            trackingNumber: `TR-${Date.now()}-${prod.productId.slice(0,6)}` 
          })
        }).then(r => { 
          if (!r.ok) {
            return r.json().then(err => {
              throw new Error(err.error || "Transfer failed");
            });
          }
        });
      }
      addToast({ variant: "success", title: "Transfer initiated", description: `${selected.length} product(s)` });
      setSelectedProductIds({}); 
      setSelectedQuantities({});
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Transfer failed";
      addToast({ variant: "error", title: "Transfer failed", description: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.displayName || user.email}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-white">Product Transfer (SME)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="mb-2 text-sm text-gray-400">Select Receiver SME</div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input value={smeSearch} onChange={(e) => setSmeSearch(e.target.value)} placeholder="Search SME by name/email" className="pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500" />
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {filteredSmes.map((s) => (
                    <button key={s.uid} onClick={() => setSelectedSmeId(s.uid)} className={`w-full text-left p-3 rounded-lg border ${selectedSmeId === s.uid ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-gray-900/50 hover:bg-gray-900'}`}>
                      <div className="text-white text-sm">{s.displayName || s.email}</div>
                      <div className="text-xs text-gray-500">{s.orgName || 'SME'}</div>
                    </button>
                  ))}
                  {filteredSmes.length === 0 && <div className="text-xs text-gray-500 p-2">No SMEs found</div>}
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="mb-2 text-sm text-gray-400">Select Products</div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products by name/SKU" className="pl-9 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500" />
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-800 border border-gray-800 rounded-lg">
                  {filteredProducts.map((p) => (
                    <div key={p.productId} className="p-3 hover:bg-gray-900/50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="accent-blue-500" checked={!!selectedProductIds[p.productId]} onChange={() => toggleProduct(p.productId)} />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-gray-800 rounded"><Package className="h-4 w-4 text-gray-300" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm truncate">{p.name}</div>
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
                            <Input 
                              type="number" 
                              min={1} 
                              max={typeof p.quantity === "number" ? p.quantity : undefined}
                              value={selectedQuantities[p.productId] ?? "1"} 
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only update if value is empty or a valid number
                                if (value === "" || (!isNaN(Number(value)) && Number(value) >= 1)) {
                                  setSelectedQuantities(prev => ({ ...prev, [p.productId]: value }));
                                }
                              }}
                              onBlur={(e) => {
                                // Ensure quantity is at least 1 when field loses focus
                                const value = e.target.value;
                                if (value === "" || Number(value) < 1) {
                                  setSelectedQuantities(prev => ({ ...prev, [p.productId]: "1" }));
                                }
                              }}
                              className="bg-gray-800 border-gray-700 text-white" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredProducts.length === 0 && <div className="text-xs text-gray-500 p-3">No products found</div>}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={handleTransfer} disabled={!validation.ok || submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}<span className="ml-2">Transfer</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


