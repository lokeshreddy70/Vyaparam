import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, extractErrorMessage } from "../api/client";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useOfflineSync } from "../context/OfflineSyncProvider";
import { usePermissions } from "../hooks/usePermissions";
import { offlineEngine } from "../offline/engine";

type Rec = Record<string, unknown>;

const posSchema = z.object({
  query: z.string().default(""),
  barcode: z.string().default(""),
  category: z.string().default("ALL"),
  customerId: z.string().default(""),
  paymentAmount: z.string().default(""),
});

type PosForm = z.infer<typeof posSchema>;

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

function rows(payload: unknown): Rec[] {
  if (Array.isArray(payload)) return payload as Rec[];
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown[] }).items;
    if (Array.isArray(items)) return items as Rec[];
  }
  return [];
}

export default function POSPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { state: offlineState, forceSyncNow, pauseSync, resumeSync, retryFailed } = useOfflineSync();
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const productListRef = useRef<HTMLDivElement>(null);

  const {
    register,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<PosForm>({
    resolver: zodResolver(posSchema),
    defaultValues: {
      query: "",
      barcode: "",
      category: "ALL",
      customerId: "",
      paymentAmount: "",
    },
    mode: "onChange",
  });

  const queryText = watch("query");
  const barcodeText = watch("barcode");
  const customerId = watch("customerId");
  const paymentAmount = watch("paymentAmount");
  const recoveryKey = "pos:recovery:v1";

  const tablesQuery = useQuery({ queryKey: ["pos-tables-c"], queryFn: async () => (await api.get("/tables", { params: { page: 1, limit: 200 } })).data, staleTime: 30_000 });
  const ordersQuery = useQuery({ queryKey: ["pos-orders-c"], queryFn: async () => (await api.get("/orders", { params: { page: 1, limit: 200 } })).data, refetchInterval: offlineState.online ? 15_000 : false, staleTime: 10_000 });
  const productsQuery = useQuery({ queryKey: ["pos-products-c"], queryFn: async () => (await api.get("/products", { params: { page: 1, limit: 200 } })).data, staleTime: 60_000 });
  const categoriesQuery = useQuery({ queryKey: ["pos-categories-c"], queryFn: async () => (await api.get("/categories")).data, staleTime: 60_000 });
  const customersQuery = useQuery({ queryKey: ["pos-customers-c"], queryFn: async () => (await api.get("/customers", { params: { page: 1, limit: 200 } })).data, staleTime: 45_000 });
  const documentsQuery = useQuery({ queryKey: ["pos-documents-c"], queryFn: async () => (await api.get("/billing-pos/documents", { params: { page: 1, limit: 200 } })).data, refetchInterval: offlineState.online ? 15_000 : false, staleTime: 5_000 });
  const invoicesQuery = useQuery({ queryKey: ["pos-invoices-c"], queryFn: async () => (await api.get("/invoices", { params: { page: 1, limit: 200 } })).data, staleTime: 20_000 });

  const documentDetailQuery = useQuery({
    queryKey: ["pos-document-detail-c", selectedDocumentId],
    enabled: !!selectedDocumentId,
    queryFn: async () => (await api.get(`/billing-pos/documents/${selectedDocumentId}`)).data,
  });

  const tables = rows(tablesQuery.data);
  const orders = rows(ordersQuery.data);
  const products = rows(productsQuery.data);
  const categories = rows(categoriesQuery.data);
  const customers = rows(customersQuery.data);
  const documents = rows(documentsQuery.data);
  const invoices = rows(invoicesQuery.data);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pos-orders-c"] });
    qc.invalidateQueries({ queryKey: ["pos-invoices-c"] });
    qc.invalidateQueries({ queryKey: ["pos-tables-c"] });
    qc.invalidateQueries({ queryKey: ["pos-documents-c"] });
  };

  const addToCart = useCallback((product: Rec) => {
    const productId = String(product.id ?? "");
    if (!productId) return;
    const price = Number(product.price ?? 0);
    const name = String(product.name ?? "Unnamed Product");

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { productId, name, price, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = queryText.trim().toLowerCase();
    const normalizedBarcode = barcodeText.trim().toLowerCase();

    return products.filter((product) => {
      const productName = String(product.name ?? "").toLowerCase();
      const sku = String(product.sku ?? "").toLowerCase();
      const barcode = String(product.barcode ?? "").toLowerCase();
      const categoryId = String(product.categoryId ?? "");

      const matchesCategory = selectedCategory === "ALL" || categoryId === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        productName.includes(normalizedQuery) ||
        sku.includes(normalizedQuery) ||
        barcode.includes(normalizedQuery);
      const matchesBarcode = !normalizedBarcode || barcode === normalizedBarcode || sku === normalizedBarcode;

      return matchesCategory && matchesQuery && matchesBarcode;
    });
  }, [barcodeText, products, queryText, selectedCategory]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => productListRef.current,
    estimateSize: () => 86,
    overscan: 8,
  });

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const draftBills = useMemo(
    () => documents.filter((item) => {
      const status = String(item.status ?? "").toUpperCase();
      return status === "DRAFT" || status === "HOLD";
    }),
    [documents],
  );

  const recentBills = useMemo(
    () => documents.slice(0, 8),
    [documents],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        setFocus("barcode");
      }
      if (event.key === "F9") {
        event.preventDefault();
        window.print();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setFocus]);

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!cart.length) return;
      const payload = {
        tableId: selectedTable || undefined,
        type: selectedTable ? "DINE_IN" : "TAKEAWAY",
        customerId: customerId || undefined,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };
      return api.post("/orders", payload);
    },
    onSuccess: (response) => {
      const orderId = String((response?.data as Rec | undefined)?.id ?? "");
      if (orderId) setSelectedOrderId(orderId);
      clearCart();
      refresh();
      void offlineEngine.saveRecovery(recoveryKey, {
        selectedTable,
        selectedDocumentId,
        selectedOrderId: orderId,
        selectedCategory,
        cart: [],
        customerId,
        paymentAmount: "",
        query: queryText,
        barcode: "",
      });
    },
  });

  const createDraftBill = useMutation({
    mutationFn: async () => {
      if (!cart.length) return;
      return api.post("/billing-pos/documents", {
        type: "POS_BILL",
        customerId: customerId || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          description: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      });
    },
    onSuccess: (response) => {
      const createdId = String((response?.data as Rec | undefined)?.id ?? "");
      if (createdId) setSelectedDocumentId(createdId);
      clearCart();
      refresh();
      void offlineEngine.saveRecovery(recoveryKey, {
        selectedTable,
        selectedDocumentId: createdId,
        selectedOrderId,
        selectedCategory,
        cart: [],
        customerId,
        paymentAmount: "",
        query: queryText,
        barcode: "",
      });
    },
  });

  const holdBill = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocumentId}/hold`), onSuccess: refresh });
  const resumeBill = useMutation({ mutationFn: async () => api.post(`/billing-pos/documents/${selectedDocumentId}/resume`), onSuccess: refresh });
  const payBill = useMutation({
    mutationFn: async () =>
      api.post(`/billing-pos/documents/${selectedDocumentId}/payments`, {
        payments: [
          {
            amount: Number(paymentAmount || 0),
            method: "CASH",
          },
        ],
      }),
    onSuccess: () => {
      setValue("paymentAmount", "");
      refresh();
      void offlineEngine.clearRecovery(recoveryKey);
    },
  });

  const generateInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId) return;
      return api.post("/invoices", { orderId: selectedOrderId });
    },
    onSuccess: refresh,
  });

  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === selectedDocumentId);
  const isLocalOfflineDocument = selectedDocumentId.startsWith("offline-doc-");

  useEffect(() => {
    void (async () => {
      const snapshot = await offlineEngine.readRecovery<{
        selectedTable: string;
        selectedDocumentId: string;
        selectedOrderId: string;
        selectedCategory: string;
        cart: CartItem[];
        customerId: string;
        paymentAmount: string;
        query: string;
        barcode: string;
      }>(recoveryKey);

      if (!snapshot) return;
      setSelectedTable(snapshot.selectedTable ?? "");
      setSelectedDocumentId(snapshot.selectedDocumentId ?? "");
      setSelectedOrderId(snapshot.selectedOrderId ?? "");
      setSelectedCategory(snapshot.selectedCategory ?? "ALL");
      setCart(Array.isArray(snapshot.cart) ? snapshot.cart : []);
      setValue("customerId", snapshot.customerId ?? "");
      setValue("paymentAmount", snapshot.paymentAmount ?? "");
      setValue("query", snapshot.query ?? "");
      setValue("barcode", snapshot.barcode ?? "");
    })();
  }, [setValue]);

  useEffect(() => {
    void offlineEngine.saveRecovery(recoveryKey, {
      selectedTable,
      selectedDocumentId,
      selectedOrderId,
      selectedCategory,
      cart,
      customerId,
      paymentAmount,
      query: queryText,
      barcode: barcodeText,
    });
  }, [barcodeText, cart, customerId, paymentAmount, queryText, selectedCategory, selectedDocumentId, selectedOrderId, selectedTable]);

  const onBarcodeEnter = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    const match = products.find((product) => {
      const barcode = String(product.barcode ?? "").toLowerCase();
      const sku = String(product.sku ?? "").toLowerCase();
      return barcode === normalized || sku === normalized;
    });
    if (match) {
      addToCart(match);
      setValue("barcode", "");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">SmartBiz POS Foundation</h1>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 rounded-md border border-slate-200 p-3 text-xs dark:border-slate-800 md:grid-cols-5">
            <p><strong>Connection:</strong> {offlineState.online ? "Online" : "Offline"}</p>
            <p><strong>Network:</strong> {offlineState.networkQuality}</p>
            <p><strong>Queue:</strong> {offlineState.pendingCount} pending / {offlineState.failedCount} failed</p>
            <p><strong>Mode:</strong> {offlineState.paused ? "Sync Paused" : "Auto Sync"}</p>
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
          <Input
            placeholder="Search product, SKU or barcode"
            className="h-12 lg:col-span-2"
            {...register("query")}
          />
          <Input
            placeholder="Barcode Scanner Input (F2)"
            className="h-12"
            {...register("barcode")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onBarcodeEnter((event.currentTarget as HTMLInputElement).value);
              }
            }}
          />
          <Select
            className="h-12"
            value={selectedCategory}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedCategory(value);
              setValue("category", value);
            }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((category) => (
              <option key={String(category.id)} value={String(category.id)}>
                {String(category.name ?? category.id)}
              </option>
            ))}
          </Select>
          <Select
            className="h-12"
            value={customerId}
            onChange={(event) => setValue("customerId", event.target.value)}
          >
            <option value="">Walk-in Customer</option>
            {customers.map((customer) => (
              <option key={String(customer.id)} value={String(customer.id)}>
                {String(customer.name ?? customer.phone ?? customer.id)}
              </option>
            ))}
          </Select>
          <Select className="h-12" value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)}>
            <option value="">Takeaway Counter</option>
            {tables.map((table) => (
              <option key={String(table.id)} value={String(table.id)}>
                {String(table.label ?? table.id)} - {String(table.status ?? "")}
              </option>
            ))}
          </Select>

          {errors.query ? <p className="text-xs text-red-600">{errors.query.message}</p> : null}
          {createOrder.isError ? <ErrorState message={extractErrorMessage(createOrder.error)} /> : null}
          {createDraftBill.isError ? <ErrorState message={extractErrorMessage(createDraftBill.error)} /> : null}
          {payBill.isError ? <ErrorState message={extractErrorMessage(payBill.error)} /> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Category Grid</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                className="h-12"
                variant={selectedCategory === "ALL" ? "default" : "outline"}
                onClick={() => {
                  setSelectedCategory("ALL");
                  setValue("category", "ALL");
                }}
              >
                All Products
              </Button>
              {categories.map((category) => (
                <Button
                  key={String(category.id)}
                  className="h-12"
                  variant={selectedCategory === String(category.id) ? "default" : "outline"}
                  onClick={() => {
                    const id = String(category.id);
                    setSelectedCategory(id);
                    setValue("category", id);
                  }}
                >
                  {String(category.name ?? category.id)}
                </Button>
              ))}
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold">Virtualized Product List</h3>
              </CardHeader>
              <CardContent>
                {productsQuery.isLoading ? <LoadingState message="Loading products..." /> : null}
                {productsQuery.isError ? <ErrorState message={extractErrorMessage(productsQuery.error)} /> : null}
                {!productsQuery.isLoading && !productsQuery.isError && filteredProducts.length === 0 ? (
                  <EmptyState message="No products match current filters." />
                ) : null}

                <div ref={productListRef} className="max-h-[58vh] overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
                  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const product = filteredProducts[virtualRow.index];
                      if (!product) return null;
                      return (
                        <div
                          key={String(product.id)}
                          className="absolute left-0 top-0 w-full border-b border-slate-200 p-2 dark:border-slate-800"
                          style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                          <button
                            className="flex w-full items-center justify-between rounded-md bg-slate-50 p-3 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:bg-slate-900 dark:hover:bg-slate-800"
                            onClick={() => addToCart(product)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") addToCart(product);
                            }}
                          >
                            <span>
                              <p className="text-sm font-semibold">{String(product.name ?? "Unnamed Product")}</p>
                              <p className="text-xs text-slate-500">
                                SKU: {String(product.sku ?? "-")} • Barcode: {String(product.barcode ?? "-")}
                              </p>
                            </span>
                            <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                              ₹{Number(product.price ?? 0).toFixed(2)}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-base font-semibold">Shopping Cart and Payment Panel</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[34vh] space-y-2 overflow-auto rounded-md border border-slate-200 p-2 dark:border-slate-800">
              {cart.length === 0 ? <EmptyState message="Cart is empty. Add products using touch or barcode scan." /> : null}
              {cart.map((item) => (
                <article key={item.productId} className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-500">₹{item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="h-10 w-10 p-0" variant="outline" onClick={() => updateQty(item.productId, -1)}>-</Button>
                      <span className="min-w-6 text-center text-base font-semibold">{item.quantity}</span>
                      <Button className="h-10 w-10 p-0" variant="outline" onClick={() => updateQty(item.productId, 1)}>+</Button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                </article>
              ))}
            </div>

            <div className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <Input
              className="h-12"
              placeholder="Payment Amount"
              type="number"
              {...register("paymentAmount")}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <Button className="h-12 text-base" disabled={!can("pos.manage") || !cart.length || createOrder.isPending} onClick={() => createOrder.mutate()}>
                Place Order
              </Button>
              <Button className="h-12 text-base" variant="secondary" disabled={!can("pos.manage") || !cart.length || createDraftBill.isPending} onClick={() => createDraftBill.mutate()}>
                Save Draft Bill
              </Button>
              <Button className="h-12 text-base" variant="outline" disabled={!selectedDocumentId || holdBill.isPending} onClick={() => holdBill.mutate()}>
                Hold Bill
              </Button>
              <Button className="h-12 text-base" variant="outline" disabled={!selectedDocumentId || resumeBill.isPending} onClick={() => resumeBill.mutate()}>
                Resume Bill
              </Button>
              <Button className="h-12 text-base" disabled={!selectedDocumentId || !paymentAmount || payBill.isPending || isLocalOfflineDocument} onClick={() => payBill.mutate()}>
                Confirm Payment
              </Button>
              <Button className="h-12 text-base" variant="secondary" disabled={!selectedOrderId || generateInvoice.isPending} onClick={() => generateInvoice.mutate()}>
                Generate Invoice
              </Button>
              <Button className="h-12 text-base" variant="outline" onClick={clearCart}>Clear Cart</Button>
              <Button className="h-12 text-base" variant="outline" onClick={() => window.print()}>Receipt Preview / Print</Button>
            </div>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Draft and Hold Bills</h3></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {draftBills.length === 0 ? <EmptyState message="No draft or hold bills." /> : null}
                {draftBills.map((bill) => (
                  <button
                    key={String(bill.id)}
                    className="rounded-md border border-slate-200 p-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    onClick={() => setSelectedDocumentId(String(bill.id))}
                  >
                    <p className="text-sm font-semibold">{String(bill.id)}</p>
                    <p className="text-xs text-slate-500">{String(bill.status ?? "DRAFT")}</p>
                    <p className="text-xs text-slate-500">₹{Number(bill.grandTotal ?? 0).toFixed(2)}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Recent Bills</h3></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {recentBills.map((bill) => (
                  <button
                    key={String(bill.id)}
                    className="rounded-md border border-slate-200 p-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    onClick={() => setSelectedDocumentId(String(bill.id))}
                  >
                    <p className="text-sm font-semibold">{String(bill.id)}</p>
                    <p className="text-xs text-slate-500">{String(bill.status ?? "")}</p>
                    <p className="text-xs text-slate-500">{String(bill.createdAt ?? "")}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h3 className="text-sm font-semibold">Receipt Preview</h3></CardHeader>
              <CardContent>
                {isLocalOfflineDocument ? (
                  <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    This bill is currently local and queued for sync. Payments will be enabled after synchronization.
                  </p>
                ) : null}
                {documentDetailQuery.isLoading ? <LoadingState message="Loading receipt..." /> : null}
                {documentDetailQuery.isError ? <ErrorState message={extractErrorMessage(documentDetailQuery.error)} /> : null}
                {!selectedDocumentId ? <EmptyState message="Select a bill to preview receipt." /> : null}
                {documentDetailQuery.data ? (
                  <pre className="max-h-[260px] overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">
                    {JSON.stringify(documentDetailQuery.data, null, 2)}
                  </pre>
                ) : null}
                {selectedInvoice ? (
                  <div className="mt-2 rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800">
                    <p>Invoice: {String(selectedInvoice.id)}</p>
                    <p>Total: ₹{Number(selectedInvoice.grandTotal ?? 0).toFixed(2)}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Operational Status</h2>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <p className="font-semibold">Recent Orders</p>
            {ordersQuery.isLoading ? <LoadingState message="Loading orders..." /> : null}
            {ordersQuery.isError ? <ErrorState message={extractErrorMessage(ordersQuery.error)} /> : null}
            {!ordersQuery.isLoading && !ordersQuery.isError ? <p>{orders.length} orders loaded</p> : null}
          </div>
          <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <p className="font-semibold">Documents</p>
            {documentsQuery.isLoading ? <LoadingState message="Loading bills..." /> : null}
            {documentsQuery.isError ? <ErrorState message={extractErrorMessage(documentsQuery.error)} /> : null}
            {!documentsQuery.isLoading && !documentsQuery.isError ? <p>{documents.length} bills loaded</p> : null}
          </div>
          <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <p className="font-semibold">Keyboard Shortcuts</p>
            <p className="text-xs text-slate-500">F2: Focus barcode</p>
            <p className="text-xs text-slate-500">F9: Print receipt</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
