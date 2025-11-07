"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { FileText, Search, RefreshCw, Activity, Package, ArrowRight, QrCode, Boxes } from "lucide-react";
import { getProduct } from "@/lib/firebase/products";

interface TxItem {
  txHash: string;
  type: "PRODUCT_REGISTER" | "VERIFY" | "MOVEMENT" | "TRANSFER" | "QC_LOG" | string;
  refType: "product" | "movement" | "verification" | "batch" | string;
  refId: string;
  createdAt?: number;
  payload?: Record<string, unknown>;
}

interface MovementItem {
  id: string;
  productId: string;
  productName?: string;
  type: "inbound" | "outbound" | "transfer" | string;
  from?: string;
  to?: string;
  quantity?: number;
  createdAt?: number;
}

interface ProductLite { productId: string; name: string; sku?: string }

type TimelineFilter = "all" | "transfers" | "verifications";

export default function ProductHistoryPage() {
  const router = useRouter();
  const authState = useAppSelector((state) => state.auth);
  const user = authState.user;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ProductLite[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductLite | null>(null);
  const [productDetail, setProductDetail] = useState<Record<string, unknown> | null>(null);
  const [movements, setMovements] = useState<MovementItem[]>([]); // kept (loaded) but no longer used in UI
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [blockViews, setBlockViews] = useState<Array<{
    previous_hash: string | null;
    sender_hash: string | null;
    receiver_hash: string | null;
    product_hash: string | null;
    timestamp: number | null;
    product_info: Record<string, unknown>;
    remarks: string;
    block_hash: string; // computed for chaining
  }>>([]);

  useEffect(() => {
    if (authState.status === "unauthenticated") {
      router.push("/login");
    }
  }, [authState.status, router]);

  const loadSuggestions = useCallback(async (query: string) => {
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/products?pageSize=10&search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const items: ProductLite[] = (data.items || []).map((p: Record<string, unknown>) => ({
        productId: String(p.productId || p.id),
        name: String(p.name || "Unnamed Product"),
        sku: (p.sku as string) || undefined,
      }));
      setSuggestions(items);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!search) { setSuggestions([]); return; }
    const t = setTimeout(() => loadSuggestions(search), 300);
    return () => clearTimeout(t);
  }, [search, loadSuggestions]);

  const fetchHistory = useCallback(async (product: ProductLite) => {
    try {
      setLoading(true);
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error("Not authenticated");
      const token = await auth.currentUser.getIdToken();

      // Load product detail for header (quantity, category, etc.)
      try {
        const detail = await getProduct(product.productId);
        setProductDetail(detail as unknown as Record<string, unknown>);
      } catch {
        setProductDetail(null);
      }

      // Movements by product
      const mRes = await fetch(`/api/movements?productId=${encodeURIComponent(product.productId)}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (mRes.ok) {
        const mData = await mRes.json();
        const mItems: MovementItem[] = (mData.items || []).map((m: Record<string, unknown>) => ({
          id: String(m.id || ""),
          productId: String(m.productId || product.productId),
          productName: (m.productName as string) || product.name,
          type: (m.type as string) || "transfer",
          from: (m.from as string) || undefined,
          to: (m.to as string) || undefined,
          quantity: typeof m.quantity === "number" ? (m.quantity as number) : undefined,
          createdAt: typeof m.createdAt === "number" ? (m.createdAt as number) : undefined,
        }));
        setMovements(mItems);
      } else {
        setMovements([]);
      }

      // Transactions (query by productId so server returns full lifecycle across orgs)
      const tRes = await fetch(`/api/transactions?pageSize=200&productId=${encodeURIComponent(product.productId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) {
        const tData = await tRes.json();
        const tItems: TxItem[] = (tData.items || []).filter((tx: Record<string, unknown>) => {
          const payload = (tx.payload || {}) as Record<string, unknown>;
          return tx.refId === product.productId || payload.productId === product.productId;
        });
        setTransactions(tItems);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("[Product History] load error", error);
      addToast({ variant: "error", title: "Failed to load history", description: error instanceof Error ? error.message : "Please try again" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const ledger = useMemo(() => {
    // Simulated blockchain-style ledger: merge real txs + synthetic blocks (register/movements)
    const txs: TxItem[] = [...transactions];

    // Always add TRANSFER blocks from movements
    // Only skip if a transaction already exists with the same movementId
    if (movements.length > 0) {
      movements.forEach((m, idx) => {
        // Check if a transaction already exists for this movement
        const hasTx = txs.some(tx => 
          (tx as { movementId?: string }).movementId === m.id || 
          tx.refId === m.id ||
          (tx.payload as { movementId?: string })?.movementId === m.id
        );
        
        // Add synthetic block if no matching transaction found
        if (!hasTx) {
          txs.push({
            txHash: `synthetic-transfer-${m.id || idx}`,
            type: "TRANSFER",
            refType: "movement",
            refId: m.id,
            createdAt: m.createdAt || Date.now(),
            payload: { 
              from: m.from, 
              to: m.to, 
              quantity: m.quantity, 
              productId: m.productId, 
              productName: m.productName,
              movementId: m.id,
            },
          });
        }
      });
    }

    // Add synthetic PRODUCT_REGISTER if absent but productDetail exists
    const hasRegister = txs.some(t => t.type === "PRODUCT_REGISTER");
    if (!hasRegister && productDetail && (productDetail as { createdAt?: number }).createdAt) {
      txs.push({
        txHash: `synthetic-register-${selectedProduct?.productId || "unknown"}`,
        type: "PRODUCT_REGISTER",
        refType: "product",
        refId: selectedProduct?.productId || "",
        createdAt: Number((productDetail as { createdAt?: number }).createdAt),
        payload: { productId: selectedProduct?.productId, productName: selectedProduct?.name, sku: selectedProduct?.sku },
      });
    }

    // Sort by blockNumber asc, fallback to createdAt asc
    txs.sort((a, b) => {
      const ab = (a as { blockNumber?: number }).blockNumber ?? 0;
      const bb = (b as { blockNumber?: number }).blockNumber ?? 0;
      if (ab !== bb) return ab - bb;
      const at = (a.createdAt as number) || 0;
      const bt = (b.createdAt as number) || 0;
      return at - bt;
    });
    return txs;
  }, [transactions, movements, productDetail, selectedProduct]);

  // Helper to compute SHA-256 hex
  const sha256Hex = useCallback(async (input: string): Promise<string> => {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(input);
      const digest = await crypto.subtle.digest("SHA-256", data);
      const bytes = Array.from(new Uint8Array(digest));
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback: non-crypto hash (not secure, but deterministic)
      let h = 0; for (let i = 0; i < input.length; i++) { h = (h << 5) - h + input.charCodeAt(i); h |= 0; }
      return `x${Math.abs(h)}`;
    }
  }, []);

  // Build block-like entries for visualization
  useEffect(() => {
    const build = async () => {
      const list: Array<{
        previous_hash: string | null;
        sender_hash: string | null;
        receiver_hash: string | null;
        product_hash: string | null;
        timestamp: number | null;
        product_info: Record<string, unknown>;
        remarks: string;
        block_hash: string;
      }> = [];

      let prevHash: string | null = null;
      for (const tx of ledger) {
        const ts = (tx.createdAt as number) || null;
        const payload = (tx.payload || {}) as Record<string, unknown>;
        // Try multiple keys for from/to in case payloads differ
        const from = (payload.from as string) || (payload.movementFrom as string) || (payload.sender as string) || null;
        const to = (payload.to as string) || (payload.movementTo as string) || (payload.receiver as string) || null;
        const qty = (payload.quantity as number) || undefined;
        const pInfo: Record<string, unknown> = {
          productId: selectedProduct?.productId,
          name: selectedProduct?.name,
          sku: selectedProduct?.sku,
          ...(typeof productDetail?.quantity === 'number' ? { currentQuantity: productDetail?.quantity } : {}),
          ...(qty ? { quantity: qty } : {}),
        };
        const block = {
          previous_hash: prevHash,
          sender_hash: from ? await sha256Hex(from) : null,
          receiver_hash: to ? await sha256Hex(to) : null,
          product_hash: selectedProduct?.productId ? await sha256Hex(selectedProduct.productId) : null,
          timestamp: ts,
          product_info: pInfo,
          remarks: tx.type === "PRODUCT_REGISTER" ? "register_record" : tx.type === "VERIFY" ? "verify_record" : "transfer_record",
          block_hash: "", // filled below
        };
        // For register blocks, derive sender/receiver if not present
        if (tx.type === "PRODUCT_REGISTER") {
          const manufacturer = (productDetail as { manufacturerName?: string; manufacturerId?: string })?.manufacturerName
            || (productDetail as { manufacturerId?: string })?.manufacturerId
            || "system";
          if (!block.sender_hash) block.sender_hash = await sha256Hex("system");
          if (!block.receiver_hash) block.receiver_hash = await sha256Hex(String(manufacturer));
        }
        // For verify blocks, attach verifier if available
        if (tx.type === "VERIFY" && !block.sender_hash) {
          const verifier = (payload.verifierId as string) || (payload.userId as string) || null;
          if (verifier) block.sender_hash = await sha256Hex(verifier);
        }
        const contentForHash = JSON.stringify({ ...block, block_hash: undefined });
        const bh = await sha256Hex(contentForHash);
        block.block_hash = bh;
        list.push(block);
        prevHash = bh;
      }
      setBlockViews(list);
    };
    build();
  }, [ledger, selectedProduct, productDetail, sha256Hex]);

  const timeline = useMemo(() => {
    // Build from ledger blocks only to represent lifecycle
    const events: Array<{ ts: number; kind: TimelineFilter | "register"; title: string; desc?: string }> = [];
    ledger.forEach((tx) => {
      const ts = (tx.createdAt as number) || 0;
      if (tx.type === "PRODUCT_REGISTER") {
        events.push({ ts, kind: "all", title: "REGISTER", desc: String(tx.txHash || "") });
      } else if (tx.type === "VERIFY") {
        events.push({ ts, kind: "verifications", title: "VERIFY", desc: String(tx.txHash || "") });
      } else if (tx.type === "MOVEMENT" || tx.type === "TRANSFER") {
        const p = (tx.payload || {}) as { from?: string; to?: string; quantity?: number };
        const desc = [p.from && `From: ${p.from}`, p.to && `To: ${p.to}`, (typeof p.quantity === 'number') && `Qty: ${p.quantity}`].filter(Boolean).join("  •  ");
        events.push({ ts, kind: "transfers", title: "TRANSFER", desc });
      } else {
        events.push({ ts, kind: "all", title: String(tx.type).replace('_',' ').toUpperCase(), desc: String(tx.txHash || "") });
      }
    });
    const sorted = events.sort((a, b) => b.ts - a.ts);
    if (filter === "all") return sorted;
    if (filter === "verifications") return sorted.filter(e => e.kind === "verifications");
    return sorted.filter(e => e.kind === "transfers");
  }, [ledger, filter]);

  const summary = useMemo(() => {
    // Count transfers from the full ledger (includes synthetic blocks),
    // so users see activity even if older transactions are missing.
    const transfer = ledger.filter(t => t.type === "MOVEMENT" || t.type === "TRANSFER").length;
    const verifyCount = ledger.filter(t => t.type === "VERIFY").length;
    const registered = ledger.find(t => t.type === "PRODUCT_REGISTER")?.createdAt as number | undefined;
    const totalBlocks = ledger.length;
    return { transfer, verifyCount, registered, totalBlocks };
  }, [ledger]);

  const handleExport = () => {
    if (!selectedProduct) return;
    const data = { product: selectedProduct, productDetail, movements, transactions, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-history-${selectedProduct.productId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  

  if (!user) return null;

  return (
    <DashboardLayout userRole={user.role} userName={user.displayName || user.email}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-white">Product History</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!selectedProduct} onClick={handleExport} className="border-gray-700 text-white hover:bg-gray-800">
                  Export
                </Button>
                <Button variant="outline" size="sm" disabled={!selectedProduct || loading} onClick={() => selectedProduct && fetchHistory(selectedProduct)} className="border-gray-700 text-white hover:bg-gray-800">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Product Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && suggestions[0]) { setSelectedProduct(suggestions[0]); fetchHistory(suggestions[0]); } }}
                  placeholder="Search product by name/SKU"
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 mt-2 w-full bg-gray-900 border border-gray-800 rounded-lg max-h-60 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button key={s.productId} onClick={() => { setSelectedProduct(s); setSearch(`${s.name}${s.sku ? ` (${s.sku})` : ''}`); setSuggestions([]); fetchHistory(s); }} className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm text-gray-200">
                        <div className="flex items-center gap-2"><Package className="h-4 w-4 text-gray-400" /><span className="truncate">{s.name}</span>{s.sku && <span className="text-xs text-gray-500">• {s.sku}</span>}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>Selected: <span className="text-white font-medium">{selectedProduct.name}</span> {selectedProduct.sku && <span>• {selectedProduct.sku}</span>}</span>
                  {productDetail && (
                    <>
                      {productDetail.category && <span className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">{String(productDetail.category)}</span>}
                      {typeof productDetail.quantity === 'number' && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">Qty: {String(productDetail.quantity)}</span>}
                    </>
                  )}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Registered</div>
                  <div className="text-white text-sm">{summary.registered ? new Date(summary.registered).toLocaleString() : '-'}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Transfers</div>
                  <div className="text-white text-sm">{summary.transfer}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Verifications</div>
                  <div className="text-white text-sm">{summary.verifyCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-800">
                  <div className="text-xs text-gray-400">Blocks</div>
                  <div className="text-white text-sm">{summary.totalBlocks}</div>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div className="mb-3 flex items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded ${filter==='all'?'bg-blue-500/10 text-blue-300 border border-blue-500/20':'bg-gray-800 text-gray-300 border border-gray-700'}`} onClick={()=>setFilter('all')}>All</span>
                <span className={`px-2 py-1 rounded ${filter==='transfers'?'bg-blue-500/10 text-blue-300 border border-blue-500/20':'bg-gray-800 text-gray-300 border border-gray-700'}`} onClick={()=>setFilter('transfers')}>Transfers</span>
                <span className={`px-2 py-1 rounded ${filter==='verifications'?'bg-blue-500/10 text-blue-300 border border-blue-500/20':'bg-gray-800 text-gray-300 border border-gray-700'}`} onClick={()=>setFilter('verifications')}>Verifications</span>
              </div>
            )}

            {/* Timeline */}
            {!selectedProduct ? (
              <p className="text-gray-400">Search and select a product to view its history.</p>
            ) : timeline.length === 0 ? (
              <p className="text-gray-400">No history found for this product.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                    <div className="p-2 rounded bg-gray-800 text-blue-400">{ev.title.includes('VERIFY') ? <QrCode className="h-4 w-4" /> : ev.title.includes('INBOUND') || ev.title.includes('OUTBOUND') || ev.title.includes('TRANSFER') ? <Boxes className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-semibold truncate">{ev.title}</p>
                        <span className="text-xs text-gray-500">{ev.ts ? new Date(ev.ts).toLocaleString() : ''}</span>
                      </div>
                      {ev.desc && <p className="text-xs text-gray-400 mt-1">{ev.desc}</p>}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-600" />
                  </div>
                ))}
              </div>
            )}

            {/* Simulated Ledger */}
            {selectedProduct && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm text-gray-300 font-semibold">Simulated Ledger</div>
                  <div className="text-xs text-gray-500">{ledger.length} blocks</div>
                </div>
                <div className="rounded-lg border border-gray-800 bg-gray-900/40 divide-y divide-gray-800">
                  {ledger.map((tx, i) => (
                    <details key={tx.txHash || i} className="group">
                      <summary className="flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-900/60">
                        <span className="text-xs text-gray-500 w-20">#{(tx as { blockNumber?: number }).blockNumber ?? i + 1}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300">{String(tx.type).replace('_',' ')}</span>
                        <span className="text-xs text-gray-400 truncate flex-1">{tx.txHash}</span>
                        <span className="text-xs text-gray-500">{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}</span>
                      </summary>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-900/40">
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">Block #{(tx as { blockNumber?: number }).blockNumber ?? i + 1}</div>
                          <div className="text-xs text-gray-500">Computed Block</div>
                          <pre className="text-xs text-gray-300 bg-gray-950/60 border border-gray-800 rounded p-2 overflow-auto">{JSON.stringify({
  previous_hash: blockViews[i]?.previous_hash ?? null,
  sender_hash: blockViews[i]?.sender_hash ?? null,
  receiver_hash: blockViews[i]?.receiver_hash ?? null,
  product_hash: blockViews[i]?.product_hash ?? null,
  timestamp: blockViews[i]?.timestamp ?? null,
  product_info: blockViews[i]?.product_info ?? {},
  remarks: blockViews[i]?.remarks ?? "",
  block_hash: blockViews[i]?.block_hash ?? ""
}, null, 2)}</pre>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">Raw Payload</div>
                          <pre className="text-xs text-gray-300 bg-gray-950/60 border border-gray-800 rounded p-2 overflow-auto">{JSON.stringify(tx.payload || {}, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


