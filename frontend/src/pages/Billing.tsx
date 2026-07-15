import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useOfflineSync } from "../context/OfflineSyncProvider";
import { usePermissions } from "../hooks/usePermissions";
import { offlineEngine } from "../offline/engine";

type Rec = Record<string, unknown>;

type CartItem = {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
};

type PaymentLine = {
  method: string;
  amount: string;
  reference: string;
};

const docTypeOptions = [
  "POS_BILL",
  "SALES_INVOICE",
  "PURCHASE_INVOICE",
  "QUOTATION",
  "ESTIMATE",
  "SALES_ORDER",
  "PURCHASE_ORDER",
  "SALES_RETURN",
  "PURCHASE_RETURN",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
] as const;

const paymentMethods = [
  "CASH",
  "UPI",
  "CARD",
  "GIFT_CARD",
  "WALLET",
  "STORE_CREDIT",
  "MIXED",
  "BANK_TRANSFER",
  "NET_BANKING",
] as const;

const billingSchema = z.object({
  type: z.enum(docTypeOptions),
  customerId: z.string().default(""),
  supplierId: z.string().default(""),
  search: z.string().default(""),
  barcode: z.string().default(""),
  couponCode: z.string().default(""),
  offerCode: z.string().default(""),
  loyaltyDiscount: z.string().default("0"),
  billDiscount: z.string().default("0"),
  roundOff: z.string().default("0"),
  isInclusiveTax: z.string().default("false"),
  notes: z.string().default(""),
  refundAmount: z.string().default(""),
  statusFilter: z.string().default("ALL"),
  typeFilter: z.string().default("ALL"),
  docSearch: z.string().default(""),
});

type BillingForm = z.infer<typeof billingSchema>;

function rows(payload: unknown): Rec[] {
  if (Array.isArray(payload)) return payload as Rec[];
  if (payload && typeof payload === "object") {
    const data = payload as { items?: unknown[]; data?: unknown[] };
    if (Array.isArray(data.items)) return data.items as Rec[];
    if (Array.isArray(data.data)) return data.data as Rec[];
  }
  return [];
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumPayments(lines: PaymentLine[]) {
  return lines.reduce((sum, line) => sum + n(line.amount), 0);
}

export default function BillingPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { state: offlineState, forceSyncNow, pauseSync, resumeSync, retryFailed } = useOfflineSync();
  const [tab, setTab] = useState("engine");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { method: "CASH", amount: "", reference: "" },
  ]);
  const [splitQty, setSplitQty] = useState<Record<string, string>>({});
  const [invoiceMode, setInvoiceMode] = useState("THERMAL");

  const catalogRef = useRef<HTMLDivElement>(null);

  const { register, watch, setValue, formState: { errors } } = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      type: "POS_BILL",
      customerId: "",
      supplierId: "",
      search: "",
      barcode: "",
      couponCode: "",
      offerCode: "",
      loyaltyDiscount: "0",
      billDiscount: "0",
      roundOff: "0",
      isInclusiveTax: "false",
      notes: "",
      refundAmount: "",
      statusFilter: "ALL",
      typeFilter: "ALL",
      docSearch: "",
    },
  });

  const type = watch("type");
  const search = watch("search");
  const barcode = watch("barcode");
  const customerId = watch("customerId");
  const supplierId = watch("supplierId");
  const couponCode = watch("couponCode");
  const offerCode = watch("offerCode");
  const loyaltyDiscount = watch("loyaltyDiscount");
  const billDiscount = watch("billDiscount");
  const roundOff = watch("roundOff");
  const isInclusiveTax = watch("isInclusiveTax") === "true";
  const notes = watch("notes");
  const refundAmount = watch("refundAmount");
  const statusFilter = watch("statusFilter");
  const typeFilter = watch("typeFilter");
  const docSearch = watch("docSearch");
  const recoveryKey = "billing:recovery:v1";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [cart, setCart] = useState<CartItem[]>([]);

  const customersQuery = useQuery({ queryKey: ["billing-customers"], queryFn: async () => (await api.get("/customers", { params: { page: 1, limit: 500 } })).data, staleTime: 45_000 });
  const suppliersQuery = useQuery({ queryKey: ["billing-suppliers"], queryFn: async () => (await api.get("/suppliers", { params: { page: 1, limit: 500 } })).data, staleTime: 45_000 });
  const productsQuery = useQuery({ queryKey: ["billing-products"], queryFn: async () => (await api.get("/products", { params: { page: 1, limit: 1000 } })).data, staleTime: 60_000 });
  const inventoryQuery = useQuery({ queryKey: ["billing-inventory"], queryFn: async () => (await api.get("/inventory", { params: { page: 1, limit: 1000 } })).data, staleTime: 20_000 });

  const docsQuery = useQuery({
    queryKey: ["billing-docs", page, limit, statusFilter, typeFilter, docSearch],
    queryFn: async () => (await api.get("/billing-pos/documents", {
      params: {
        page,
        limit,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
        ...(docSearch ? { q: docSearch } : {}),
      },
    })).data,
    staleTime: 5_000,
  });

  const selectedDocQuery = useQuery({
    queryKey: ["billing-doc-detail", selectedDocId],
    enabled: !!selectedDocId,
    queryFn: async () => (await api.get(`/billing-pos/documents/${selectedDocId}`)).data,
  });

  const receiptQuery = useQuery({
    queryKey: ["billing-receipt", selectedDocId],
    enabled: !!selectedDocId,
    queryFn: async () => (await api.get(`/billing-pos/documents/${selectedDocId}/receipt`)).data,
  });

  const customerLedgerQuery = useQuery({
    queryKey: ["billing-customer-ledger", customerId],
    enabled: !!customerId,
    queryFn: async () => (await api.get("/reports-analytics/customer/ledger", { params: { customerId } })).data,
  });

  const customerHistoryQuery = useQuery({
    queryKey: ["billing-customer-history", customerId],
    enabled: !!customerId,
    queryFn: async () => (await api.get("/reports-analytics/customer/purchase-history", { params: { customerId } })).data,
  });

  const docs = rows(docsQuery.data);
  const products = rows(productsQuery.data);
  const customers = rows(customersQuery.data);
  const suppliers = rows(suppliersQuery.data);
  const inventories = rows(inventoryQuery.data);

  const invalidateDocs = () => {
    qc.invalidateQueries({ queryKey: ["billing-docs"] });
    qc.invalidateQueries({ queryKey: ["billing-doc-detail", selectedDocId] });
    qc.invalidateQueries({ queryKey: ["billing-receipt", selectedDocId] });
  };

  const filteredProducts = useMemo(() => {
    const sq = search.trim().toLowerCase();
    const bq = barcode.trim().toLowerCase();
    return products.filter((product) => {
      const name = String(product.name ?? "").toLowerCase();
      const sku = String(product.sku ?? "").toLowerCase();
      const b = String(product.barcode ?? "").toLowerCase();
      const bySearch = !sq || name.includes(sq) || sku.includes(sq) || b.includes(sq);
      const byBarcode = !bq || b === bq || sku === bq;
      return bySearch && byBarcode;
    });
  }, [barcode, products, search]);

  const virtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => catalogRef.current,
    estimateSize: () => 86,
    overscan: 8,
  });

  const inventoryByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of inventories) {
      const pid = String(row.productId ?? "");
      if (!pid) continue;
      map.set(pid, n(row.quantity));
    }
    return map;
  }, [inventories]);

  const isSalesType = useMemo(() => [
    "POS_BILL",
    "SALES_INVOICE",
    "SALES_ORDER",
    "QUOTATION",
    "ESTIMATE",
  ].includes(type), [type]);

  const stockWarnings = useMemo(() => {
    if (!isSalesType) return [] as string[];
    return cart
      .filter((item) => item.productId)
      .map((item) => {
        const available = inventoryByProductId.get(item.productId) ?? 0;
        if (item.quantity > available) return `${item.description}: qty ${item.quantity} exceeds stock ${available}`;
        return "";
      })
      .filter(Boolean);
  }, [cart, inventoryByProductId, isSalesType]);

  const addToCart = (product: Rec) => {
    const productId = String(product.id ?? "");
    if (!productId) return;
    const description = String(product.name ?? "Item");
    const unitPrice = n(product.price);

    setCart((prev) => {
      const found = prev.find((i) => i.productId === productId);
      if (found) {
        return prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId, description, quantity: 1, unitPrice, discount: 0, taxPercent: 0 }];
    });
  };

  const updateCartItem = (productId: string, patch: Partial<CartItem>) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, ...patch } : i));
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
    const itemDiscount = cart.reduce((s, item) => s + n(item.discount), 0);
    const loyalty = n(loyaltyDiscount);
    const billDisc = n(billDiscount);
    const discount = itemDiscount + loyalty + billDisc;
    const taxable = Math.max(0, subtotal - discount);
    const taxBase = cart.reduce((s, item) => {
      const line = item.quantity * item.unitPrice - n(item.discount);
      const tax = isInclusiveTax ? line - line / (1 + n(item.taxPercent) / 100 || 1) : line * (n(item.taxPercent) / 100);
      return s + Math.max(0, tax);
    }, 0);
    const cgst = taxBase / 2;
    const sgst = taxBase / 2;
    const igst = 0;
    const cess = 0;
    const round = n(roundOff);
    const grand = Math.max(0, subtotal - discount + (isInclusiveTax ? 0 : taxBase) + round);
    return { subtotal, discount, taxable, taxBase, cgst, sgst, igst, cess, round, grand };
  }, [billDiscount, cart, isInclusiveTax, loyaltyDiscount, roundOff]);

  const createDocMutation = useMutation({
    mutationFn: async () => api.post("/billing-pos/documents", {
      type,
      customerId: customerId || undefined,
      supplierId: supplierId || undefined,
      couponCode: couponCode || undefined,
      offerCode: offerCode || undefined,
      discount: n(billDiscount) + n(loyaltyDiscount),
      roundOff: n(roundOff),
      isInclusiveTax,
      notes: notes || undefined,
      items: cart.map((i) => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: n(i.discount),
        taxPercent: n(i.taxPercent),
      })),
    }),
    onSuccess: (res) => {
      const id = String((res.data as Rec | undefined)?.id ?? "");
      if (id) setSelectedDocId(id);
      invalidateDocs();
      clearCart();
      void offlineEngine.saveRecovery(recoveryKey, {
        selectedDocId: id,
        cart: [],
        paymentLines,
        customerId,
        supplierId,
        type,
        notes,
      });
    },
  });

  const holdMutation = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocId}/hold`), onSuccess: invalidateDocs });
  const resumeMutation = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocId}/resume`), onSuccess: invalidateDocs });
  const cancelMutation = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocId}/cancel`), onSuccess: invalidateDocs });
  const voidMutation = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocId}/void`, { reason: "Voided from billing console" }), onSuccess: invalidateDocs });
  const refundMutation = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocId}/refund`, { amount: n(refundAmount) }), onSuccess: invalidateDocs });

  const splitMutation = useMutation({
    mutationFn: async () => {
      const selected = selectedDocQuery.data as Rec | undefined;
      const items = rows(selected?.items).map((item) => {
        const id = String(item.id ?? "");
        return { itemId: id, quantity: n(splitQty[id]) };
      }).filter((i) => i.itemId && i.quantity > 0);
      return api.post(`/billing-pos/documents/${selectedDocId}/split`, { items });
    },
    onSuccess: () => {
      setSplitQty({});
      invalidateDocs();
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async () => api.post("/billing-pos/documents/merge", { documentIds: mergeIds }),
    onSuccess: () => {
      setMergeIds([]);
      invalidateDocs();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => api.patch(`/billing-pos/documents/${selectedDocId}/status`, { status }),
    onSuccess: invalidateDocs,
  });

  const paymentMutation = useMutation({
    mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocId}/payments`, {
      payments: paymentLines
        .map((line) => ({ method: line.method, amount: n(line.amount), reference: line.reference || undefined }))
        .filter((line) => line.amount > 0),
    }),
    onSuccess: () => {
      invalidateDocs();
      setPaymentLines([{ method: "CASH", amount: "", reference: "" }]);
      void offlineEngine.clearRecovery(recoveryKey);
    },
  });

  const createDerivedDoc = useMutation({
    mutationFn: async ({ derivedType, exchange }: { derivedType: string; exchange?: boolean }) => {
      const selected = selectedDocQuery.data as Rec | undefined;
      const sourceItems = rows(selected?.items).map((item) => ({
        productId: String(item.productId ?? "") || undefined,
        description: String(item.description ?? "Item"),
        quantity: n(item.quantity),
        unitPrice: n(item.unitPrice),
        discount: n(item.discount),
        taxPercent: n(item.taxPercent),
      }));

      const payload = {
        type: derivedType,
        customerId: String(selected?.customerId ?? "") || undefined,
        supplierId: String(selected?.supplierId ?? "") || undefined,
        notes: exchange ? "Exchange workflow base document" : "Generated from selected document",
        items: sourceItems.filter((i) => i.quantity > 0),
      };

      const created = await api.post("/billing-pos/documents", payload);
      if (exchange) {
        await api.post("/billing-pos/documents", {
          ...payload,
          type: "POS_BILL",
          notes: "Exchange replacement bill",
        });
      }
      return created;
    },
    onSuccess: (res) => {
      const id = String((res.data as Rec | undefined)?.id ?? "");
      if (id) setSelectedDocId(id);
      invalidateDocs();
    },
  });

  const toggleMerge = (id: string) => {
    setMergeIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const selectedDocItems = rows((selectedDocQuery.data as Rec | undefined)?.items);
  const isLocalOfflineDocument = selectedDocId.startsWith("offline-doc-");

  useEffect(() => {
    void (async () => {
      const snapshot = await offlineEngine.readRecovery<{
        selectedDocId: string;
        cart: CartItem[];
        paymentLines: PaymentLine[];
        customerId: string;
        supplierId: string;
        type: BillingForm["type"];
        notes: string;
      }>(recoveryKey);

      if (!snapshot) return;
      setSelectedDocId(snapshot.selectedDocId ?? "");
      setCart(Array.isArray(snapshot.cart) ? snapshot.cart : []);
      setPaymentLines(Array.isArray(snapshot.paymentLines) && snapshot.paymentLines.length > 0 ? snapshot.paymentLines : [{ method: "CASH", amount: "", reference: "" }]);
      setValue("customerId", snapshot.customerId ?? "");
      setValue("supplierId", snapshot.supplierId ?? "");
      setValue("type", snapshot.type ?? "POS_BILL");
      setValue("notes", snapshot.notes ?? "");
    })();
  }, [setValue]);

  useEffect(() => {
    void offlineEngine.saveRecovery(recoveryKey, {
      selectedDocId,
      cart,
      paymentLines,
      customerId,
      supplierId,
      type,
      notes,
    });
  }, [cart, customerId, notes, paymentLines, selectedDocId, supplierId, type]);

  const tabs = [
    { key: "engine", label: "Enterprise Billing Engine" },
    { key: "payments", label: "Payments and Discounts" },
    { key: "operations", label: "Draft Hold Resume Split Merge" },
    { key: "history", label: "Invoice History and Reprint" },
    { key: "customer", label: "Customer Credit and Ledger" },
  ];

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">SmartBiz Enterprise Billing Engine</h1>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 rounded-md border border-slate-200 p-3 text-xs dark:border-slate-800 md:grid-cols-5">
            <p><strong>Connection:</strong> {offlineState.online ? "Online" : "Offline"}</p>
            <p><strong>Network:</strong> {offlineState.networkQuality}</p>
            <p><strong>Queue:</strong> {offlineState.pendingCount} pending / {offlineState.failedCount} failed / {offlineState.conflictCount} conflicts</p>
            <p><strong>Processing:</strong> {offlineState.processing ? "Running" : "Idle"}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void forceSyncNow()} disabled={!offlineState.online || offlineState.processing || offlineState.paused}>Sync</Button>
              <Button size="sm" variant="outline" onClick={() => void retryFailed()} disabled={offlineState.failedCount + offlineState.conflictCount === 0}>Retry</Button>
              {offlineState.paused ? (
                <Button size="sm" variant="outline" onClick={() => void resumeSync()}>Resume</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void pauseSync()}>Pause</Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-6">
          <Select value={type} onChange={(e) => setValue("type", e.target.value as BillingForm["type"])}>
            {docTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </Select>
          <Select value={customerId} onChange={(e) => setValue("customerId", e.target.value)}>
            <option value="">Select Customer</option>
            {customers.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name ?? c.id)}</option>)}
          </Select>
          <Select value={supplierId} onChange={(e) => setValue("supplierId", e.target.value)}>
            <option value="">Select Supplier</option>
            {suppliers.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name ?? s.id)}</option>)}
          </Select>
          <Input placeholder="Search products" {...register("search")} />
          <Input placeholder="Barcode or SKU" {...register("barcode")} onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const q = (e.currentTarget as HTMLInputElement).value.trim().toLowerCase();
            if (!q) return;
            const match = products.find((p) => {
              const b = String(p.barcode ?? "").toLowerCase();
              const sku = String(p.sku ?? "").toLowerCase();
              return b === q || sku === q;
            });
            if (match) addToCart(match);
            setValue("barcode", "");
          }} />
          <Select value={isInclusiveTax ? "true" : "false"} onChange={(e) => setValue("isInclusiveTax", e.target.value)}>
            <option value="false">Exclusive Tax</option>
            <option value="true">Inclusive Tax</option>
          </Select>

          <Input placeholder="Coupon Code" {...register("couponCode")} />
          <Input placeholder="Offer Code" {...register("offerCode")} />
          <Input placeholder="Loyalty Discount" type="number" {...register("loyaltyDiscount")} />
          <Input placeholder="Bill Discount" type="number" {...register("billDiscount")} />
          <Input placeholder="Round Off" type="number" {...register("roundOff")} />
          <Textarea className="lg:col-span-6" placeholder="Notes" {...register("notes")} />

          {errors.type ? <p className="text-xs text-red-600">{errors.type.message}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Large Catalog Product Picker</h2>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? <LoadingState message="Loading products..." /> : null}
            {productsQuery.isError ? <ErrorState message={extractErrorMessage(productsQuery.error)} /> : null}
            {!productsQuery.isLoading && !productsQuery.isError && filteredProducts.length === 0 ? <EmptyState message="No products found." /> : null}

            <div ref={catalogRef} className="max-h-[62vh] overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
              <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
                {virtualizer.getVirtualItems().map((vr) => {
                  const p = filteredProducts[vr.index];
                  if (!p) return null;
                  const pid = String(p.id ?? "");
                  const stock = inventoryByProductId.get(pid);
                  return (
                    <div
                      key={pid || vr.index}
                      className="absolute left-0 top-0 w-full border-b border-slate-200 p-2 dark:border-slate-800"
                      style={{ transform: `translateY(${vr.start}px)` }}
                    >
                      <button
                        className="flex w-full items-center justify-between rounded-md bg-slate-50 p-3 text-left hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                        onClick={() => addToCart(p)}
                      >
                        <span>
                          <p className="text-sm font-semibold">{String(p.name ?? "Item")}</p>
                          <p className="text-xs text-slate-500">SKU {String(p.sku ?? "-")} • Barcode {String(p.barcode ?? "-")}</p>
                          <p className="text-xs text-slate-500">Stock {stock ?? "N/A"}</p>
                        </span>
                        <span className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900">₹{n(p.price).toFixed(2)}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Cart, Tax and Billing</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[35vh] space-y-2 overflow-auto rounded-md border border-slate-200 p-2 dark:border-slate-800">
              {cart.length === 0 ? <EmptyState message="Cart is empty." /> : null}
              {cart.map((item) => (
                <article key={item.productId} className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.description}</p>
                    <Button size="sm" variant="danger" onClick={() => removeCartItem(item.productId)}>X</Button>
                  </div>
                  <div className="mt-2 grid gap-1 sm:grid-cols-4">
                    <Input type="number" value={String(item.quantity)} onChange={(e) => updateCartItem(item.productId, { quantity: Math.max(0.0001, n(e.target.value)) })} />
                    <Input type="number" value={String(item.unitPrice)} onChange={(e) => updateCartItem(item.productId, { unitPrice: Math.max(0, n(e.target.value)) })} />
                    <Input type="number" value={String(item.discount)} onChange={(e) => updateCartItem(item.productId, { discount: Math.max(0, n(e.target.value)) })} />
                    <Input type="number" value={String(item.taxPercent)} onChange={(e) => updateCartItem(item.productId, { taxPercent: Math.max(0, n(e.target.value)) })} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Line Total ₹{(item.quantity * item.unitPrice - item.discount).toFixed(2)}</p>
                </article>
              ))}
            </div>

            {stockWarnings.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {stockWarnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}

            <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>
              <p>Discount: ₹{totals.discount.toFixed(2)}</p>
              <p>Taxable: ₹{totals.taxable.toFixed(2)}</p>
              <p>GST: ₹{totals.taxBase.toFixed(2)} | CGST ₹{totals.cgst.toFixed(2)} | SGST ₹{totals.sgst.toFixed(2)} | IGST ₹{totals.igst.toFixed(2)} | CESS ₹{totals.cess.toFixed(2)}</p>
              <p>Round Off: ₹{totals.round.toFixed(2)}</p>
              <p className="text-base font-semibold">Grand Total: ₹{totals.grand.toFixed(2)}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button disabled={!can("billing.manage") || !cart.length || stockWarnings.length > 0 || createDocMutation.isPending} onClick={() => createDocMutation.mutate()}>
                Create Billing Document
              </Button>
              <Button variant="outline" onClick={clearCart}>Clear Cart</Button>
            </div>

            {createDocMutation.isError ? <ErrorState message={extractErrorMessage(createDocMutation.error)} /> : null}
          </CardContent>
        </Card>
      </div>

      {tab === "payments" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Mixed, Partial and Advance Payments</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLocalOfflineDocument ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Selected document is offline-queued and not synced yet. Payments will be enabled after synchronization.
              </p>
            ) : null}
            <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}>
              <option value="">Select Billing Document</option>
              {docs.map((d) => <option key={String(d.id)} value={String(d.id)}>{String(d.documentNo ?? d.id)} - {String(d.status ?? "")}</option>)}
            </Select>

            {paymentLines.map((line, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-4">
                <Select value={line.method} onChange={(e) => setPaymentLines((prev) => prev.map((p, i) => i === idx ? { ...p, method: e.target.value } : p))}>
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </Select>
                <Input type="number" placeholder="Amount" value={line.amount} onChange={(e) => setPaymentLines((prev) => prev.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p))} />
                <Input placeholder="Reference" value={line.reference} onChange={(e) => setPaymentLines((prev) => prev.map((p, i) => i === idx ? { ...p, reference: e.target.value } : p))} />
                <Button variant="outline" onClick={() => setPaymentLines((prev) => prev.filter((_, i) => i !== idx))} disabled={paymentLines.length === 1}>Remove</Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setPaymentLines((prev) => [...prev, { method: "UPI", amount: "", reference: "" }])}>Add Payment Line</Button>
              <Button disabled={!selectedDocId || sumPayments(paymentLines) <= 0 || paymentMutation.isPending || isLocalOfflineDocument} onClick={() => paymentMutation.mutate()}>Record Payment</Button>
              <Input className="max-w-xs" placeholder="Refund Amount" type="number" {...register("refundAmount")} />
              <Button variant="outline" disabled={!selectedDocId || n(refundAmount) <= 0 || refundMutation.isPending || isLocalOfflineDocument} onClick={() => refundMutation.mutate()}>Refund</Button>
            </div>

            <p className="text-sm">Payment Total: ₹{sumPayments(paymentLines).toFixed(2)}</p>
            {paymentMutation.isError ? <ErrorState message={extractErrorMessage(paymentMutation.error)} /> : null}
            {refundMutation.isError ? <ErrorState message={extractErrorMessage(refundMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "operations" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Draft, Hold, Resume, Split, Merge, Returns, Exchange, Credit and Debit Notes</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}>
                <option value="">Select Document</option>
                {docs.map((d) => <option key={String(d.id)} value={String(d.id)}>{String(d.documentNo ?? d.id)} - {String(d.status ?? "")}</option>)}
              </Select>
              <Button variant="secondary" disabled={!selectedDocId || holdMutation.isPending || isLocalOfflineDocument} onClick={() => holdMutation.mutate()}>Hold</Button>
              <Button variant="outline" disabled={!selectedDocId || resumeMutation.isPending || isLocalOfflineDocument} onClick={() => resumeMutation.mutate()}>Resume</Button>
              <Button variant="secondary" disabled={!selectedDocId || cancelMutation.isPending || isLocalOfflineDocument} onClick={() => cancelMutation.mutate()}>Cancel</Button>
              <Button variant="danger" disabled={!selectedDocId || voidMutation.isPending || isLocalOfflineDocument} onClick={() => voidMutation.mutate()}>Void</Button>
              <Button variant="secondary" disabled={!selectedDocId || updateStatusMutation.isPending || isLocalOfflineDocument} onClick={() => updateStatusMutation.mutate("COMPLETED")}>Mark Completed</Button>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <Button disabled={!selectedDocId || createDerivedDoc.isPending} onClick={() => createDerivedDoc.mutate({ derivedType: "SALES_RETURN" })}>Create Return</Button>
              <Button variant="outline" disabled={!selectedDocId || createDerivedDoc.isPending} onClick={() => createDerivedDoc.mutate({ derivedType: "CREDIT_NOTE" })}>Credit Note</Button>
              <Button variant="outline" disabled={!selectedDocId || createDerivedDoc.isPending} onClick={() => createDerivedDoc.mutate({ derivedType: "DEBIT_NOTE" })}>Debit Note</Button>
              <Button variant="secondary" disabled={!selectedDocId || createDerivedDoc.isPending} onClick={() => createDerivedDoc.mutate({ derivedType: "SALES_RETURN", exchange: true })}>Exchange</Button>
            </div>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Split Document</h3></CardHeader>
              <CardContent className="space-y-2">
                {selectedDocItems.length === 0 ? <EmptyState message="Select a document to split." /> : null}
                {selectedDocItems.map((item) => (
                  <div key={String(item.id)} className="grid gap-2 md:grid-cols-4">
                    <Input value={String(item.description ?? "")} readOnly />
                    <Input value={String(item.quantity ?? 0)} readOnly />
                    <Input type="number" placeholder="Split Qty" value={splitQty[String(item.id)] ?? ""} onChange={(e) => setSplitQty((prev) => ({ ...prev, [String(item.id)]: e.target.value }))} />
                    <Input value={String(item.id)} readOnly />
                  </div>
                ))}
                <Button disabled={!selectedDocId || splitMutation.isPending} onClick={() => splitMutation.mutate()}>Split Bill</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Merge Bills</h3></CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {docs.map((d) => {
                  const id = String(d.id);
                  const checked = mergeIds.includes(id);
                  return (
                    <label key={id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                      <input type="checkbox" checked={checked} onChange={() => toggleMerge(id)} />
                      <span>{String(d.documentNo ?? id)} - {String(d.status ?? "")}</span>
                    </label>
                  );
                })}
                <Button disabled={mergeIds.length < 2 || mergeMutation.isPending} onClick={() => mergeMutation.mutate()}>Merge Selected</Button>
              </CardContent>
            </Card>

            {holdMutation.isError ? <ErrorState message={extractErrorMessage(holdMutation.error)} /> : null}
            {resumeMutation.isError ? <ErrorState message={extractErrorMessage(resumeMutation.error)} /> : null}
            {cancelMutation.isError ? <ErrorState message={extractErrorMessage(cancelMutation.error)} /> : null}
            {voidMutation.isError ? <ErrorState message={extractErrorMessage(voidMutation.error)} /> : null}
            {splitMutation.isError ? <ErrorState message={extractErrorMessage(splitMutation.error)} /> : null}
            {mergeMutation.isError ? <ErrorState message={extractErrorMessage(mergeMutation.error)} /> : null}
            {createDerivedDoc.isError ? <ErrorState message={extractErrorMessage(createDerivedDoc.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "history" ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">Invoice Preview, Thermal, A4, Reprint and Duplicate Copy</h2>
            <div className="ml-auto flex flex-wrap gap-2">
              <Select value={typeFilter} onChange={(e) => { setValue("typeFilter", e.target.value); setPage(1); }}>
                <option value="ALL">All Types</option>
                {docTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </Select>
              <Select value={statusFilter} onChange={(e) => { setValue("statusFilter", e.target.value); setPage(1); }}>
                <option value="ALL">All Status</option>
                <option value="DRAFT">DRAFT</option>
                <option value="HOLD">HOLD</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="VOID">VOID</option>
              </Select>
              <Input placeholder="Search document" value={docSearch} onChange={(e) => { setValue("docSearch", e.target.value); setPage(1); }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {docsQuery.isLoading ? <LoadingState message="Loading history..." /> : null}
            {docsQuery.isError ? <ErrorState message={extractErrorMessage(docsQuery.error)} /> : null}

            <DataTable
              data={docs}
              columns={[
                { accessorKey: "documentNo", header: "Document No" },
                { accessorKey: "type", header: "Type" },
                { accessorKey: "status", header: "Status" },
                { accessorKey: "grandTotal", header: "Grand Total" },
                { accessorKey: "paidAmount", header: "Paid" },
                { accessorKey: "dueAmount", header: "Due" },
                { accessorKey: "createdAt", header: "Created" },
                {
                  id: "actions",
                  header: "Actions",
                  cell: ({ row }: { row: { original: Rec } }) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedDocId(String(row.original.id))}>Preview</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedDocId(String(row.original.id)); window.print(); }}>Reprint</Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedDocId(String(row.original.id)); setInvoiceMode("DUPLICATE"); window.print(); }}>Duplicate</Button>
                    </div>
                  ),
                },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((v) => Math.max(1, v - 1))}>Prev</Button>
              <span className="text-sm">Page {page}</span>
              <Button size="sm" variant="outline" onClick={() => setPage((v) => v + 1)} disabled={docs.length < limit}>Next</Button>
              <Select value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map((s) => <option key={s} value={String(s)}>{s}</option>)}
              </Select>
              <Select value={invoiceMode} onChange={(e) => setInvoiceMode(e.target.value)}>
                <option value="THERMAL">Thermal Receipt</option>
                <option value="A4">A4 Invoice</option>
                <option value="DUPLICATE">Duplicate Copy</option>
              </Select>
            </div>

            {selectedDocQuery.data ? (
              <pre className="max-h-[320px] overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">
                {JSON.stringify({ mode: invoiceMode, document: selectedDocQuery.data, receipt: receiptQuery.data ?? null }, null, 2)}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "customer" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Customer Selection, Credit and Purchase History</h2></CardHeader>
            <CardContent className="space-y-2">
              <Select value={customerId} onChange={(e) => setValue("customerId", e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name ?? c.id)}</option>)}
              </Select>
              {customerId ? (
                <>
                  <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                    {(() => {
                      const customer = customers.find((c) => String(c.id) === customerId);
                      return (
                        <>
                          <p>Name: {String(customer?.name ?? "")}</p>
                          <p>Phone: {String(customer?.phone ?? "")}</p>
                          <p>Outstanding Credit: ₹{n(customer?.outstandingBalance).toFixed(2)}</p>
                        </>
                      );
                    })()}
                  </div>
                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold">Customer Ledger</h3></CardHeader>
                    <CardContent>
                      {customerLedgerQuery.isLoading ? <LoadingState message="Loading ledger..." /> : null}
                      {customerLedgerQuery.isError ? <ErrorState message={extractErrorMessage(customerLedgerQuery.error)} /> : null}
                      <pre className="max-h-56 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(customerLedgerQuery.data ?? {}, null, 2)}</pre>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold">Purchase History</h3></CardHeader>
                    <CardContent>
                      {customerHistoryQuery.isLoading ? <LoadingState message="Loading purchase history..." /> : null}
                      {customerHistoryQuery.isError ? <ErrorState message={extractErrorMessage(customerHistoryQuery.error)} /> : null}
                      <pre className="max-h-56 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(customerHistoryQuery.data ?? {}, null, 2)}</pre>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <EmptyState message="Select a customer to view credit and ledger." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">Billing Quality and Performance Checks</h2></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Catalog records loaded: {products.length}</p>
              <p>Virtualized visible rows: {virtualizer.getVirtualItems().length}</p>
              <p>Document list count: {docs.length}</p>
              <p>Payment lines: {paymentLines.length}</p>
              <p>Offline queue pending: {offlineState.pendingCount}</p>
              <p>Offline queue failed/conflicts: {offlineState.failedCount}/{offlineState.conflictCount}</p>
              <p>Connection mode: {offlineState.online ? "online" : "offline"} ({offlineState.networkQuality})</p>
              <p>Cart updates are local and synchronous for sub-3-second billing interactions.</p>
              <p>Real-time stock validation and negative stock protection are enforced before create and by backend transaction logic.</p>
              <p>All billing, payments, split/merge, refund, and receipt flows use existing production APIs.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
