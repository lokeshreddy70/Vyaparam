import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "../../components/app/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../../components/app/OperationState";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { api, extractErrorMessage } from "../../api/client";
import { usePermissions } from "../../hooks/usePermissions";

export default function RetailModulePage() {
  const qc = useQueryClient();
  const { can } = usePermissions();

  const dashboardQuery = useQuery({
    queryKey: ["industry", "retail", "dashboard"],
    queryFn: async () => (await api.get("/reports-analytics/dashboard")).data,
    enabled: can("reports.read"),
  });

  const inventoryQuery = useQuery({
    queryKey: ["industry", "retail", "inventory"],
    queryFn: async () => (await api.get("/inventory")).data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>,
    enabled: can("inventory.read"),
  });

  const lowStockQuery = useQuery({
    queryKey: ["industry", "retail", "low-stock"],
    queryFn: async () => (await api.get("/inventory/low-stock")).data,
    enabled: can("inventory.read"),
  });

  const salesReportsQuery = useQuery({
    queryKey: ["industry", "retail", "reports"],
    queryFn: async () => ({
      topProducts: (await api.get("/reports-analytics/sales/top-products")).data,
      discounts: (await api.get("/reports-analytics/sales/discount")).data,
      payments: (await api.get("/reports-analytics/sales/payment-method")).data,
    }),
    enabled: can("reports.read"),
  });

  const searchMutation = useMutation({
    mutationFn: async (payload: { q?: string; barcode?: string; sku?: string }) =>
      (await api.get("/billing-pos/search", { params: payload })).data as Array<Record<string, unknown>>,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (payload: { promotionCode: string; promotionTitle: string; promotionDiscount: number; barcodeFormat: string }) =>
      api.patch("/settings/business-configuration", {
        businessPreferences: {
          retailPromotion: {
            code: payload.promotionCode,
            title: payload.promotionTitle,
            discountPercent: payload.promotionDiscount,
            active: true,
          },
        },
        barcodeSettings: {
          retail: {
            format: payload.barcodeFormat,
            workflowEnabled: true,
          },
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings-config"] }),
  });

  const [promotionCode, setPromotionCode] = useState("RETAIL-OFFER");
  const [promotionTitle, setPromotionTitle] = useState("Retail Campaign");
  const [promotionDiscount, setPromotionDiscount] = useState("10");
  const [barcodeFormat, setBarcodeFormat] = useState("EAN13");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchBarcode, setSearchBarcode] = useState("");
  const [searchSku, setSearchSku] = useState("");

  const inventoryRows = useMemo(() => {
    const payload = inventoryQuery.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
    return [];
  }, [inventoryQuery.data]);

  const lowStockRows = useMemo(() => {
    const payload = lowStockQuery.data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | undefined;
    if (Array.isArray(payload)) return payload;
    return payload?.items ?? [];
  }, [lowStockQuery.data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Retail Module</h1>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Inventory Records" value={inventoryRows.length} />
          <Metric label="Low Stock Alerts" value={lowStockRows.length} />
          <Metric label="Promotion Engine" value={updateConfigMutation.isSuccess ? 1 : 0} />
          <Metric label="Barcode Search Results" value={Array.isArray(searchMutation.data) ? searchMutation.data.length : 0} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Retail Dashboard and Reports</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardQuery.isLoading ? <LoadingState message="Loading retail dashboard..." /> : null}
            {dashboardQuery.isError ? <ErrorState message={extractErrorMessage(dashboardQuery.error)} /> : null}
            {dashboardQuery.data ? (
              <pre className="max-h-64 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(dashboardQuery.data, null, 2)}</pre>
            ) : null}

            {salesReportsQuery.isLoading ? <LoadingState message="Loading retail reports..." /> : null}
            {salesReportsQuery.isError ? <ErrorState message={extractErrorMessage(salesReportsQuery.error)} /> : null}
            {salesReportsQuery.data ? (
              <pre className="max-h-64 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(salesReportsQuery.data, null, 2)}</pre>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Retail Promotions and Barcode Workflow</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Promotion Code" value={promotionCode} onChange={(event) => setPromotionCode(event.target.value)} />
              <Input placeholder="Promotion Title" value={promotionTitle} onChange={(event) => setPromotionTitle(event.target.value)} />
              <Input type="number" min={0} max={100} placeholder="Discount %" value={promotionDiscount} onChange={(event) => setPromotionDiscount(event.target.value)} />
              <Select value={barcodeFormat} onChange={(event) => setBarcodeFormat(event.target.value)}>
                <option value="EAN13">EAN13</option>
                <option value="EAN8">EAN8</option>
                <option value="CODE128">CODE128</option>
                <option value="QR">QR</option>
              </Select>
            </div>
            <Button
              disabled={!can("business.manage") || updateConfigMutation.isPending}
              onClick={() =>
                updateConfigMutation.mutate({
                  promotionCode,
                  promotionTitle,
                  promotionDiscount: Math.max(0, Math.min(100, Number(promotionDiscount) || 0)),
                  barcodeFormat,
                })
              }
            >
              Save Promotion and Barcode Settings
            </Button>
            {updateConfigMutation.isError ? <ErrorState message={extractErrorMessage(updateConfigMutation.error)} /> : null}

            <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold">Product Barcode Search</p>
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Search Query" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                <Input placeholder="Barcode" value={searchBarcode} onChange={(event) => setSearchBarcode(event.target.value)} />
                <Input placeholder="SKU" value={searchSku} onChange={(event) => setSearchSku(event.target.value)} />
              </div>
              <Button
                variant="outline"
                disabled={!can("billing.read") || searchMutation.isPending}
                onClick={() => searchMutation.mutate({ q: searchQuery || undefined, barcode: searchBarcode || undefined, sku: searchSku || undefined })}
              >
                Search POS Catalog
              </Button>
              {searchMutation.isError ? <ErrorState message={extractErrorMessage(searchMutation.error)} /> : null}
              {Array.isArray(searchMutation.data) && searchMutation.data.length > 0 ? (
                <DataTable data={searchMutation.data} columns={[{ accessorKey: "id", header: "Product" }, { accessorKey: "name", header: "Name" }, { accessorKey: "sku", header: "SKU" }, { accessorKey: "barcode", header: "Barcode" }, { accessorKey: "sellingPrice", header: "Price" }]} />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Retail Inventory and Alerts</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {inventoryQuery.isLoading ? <LoadingState message="Loading inventory..." /> : null}
          {inventoryQuery.isError ? <ErrorState message={extractErrorMessage(inventoryQuery.error)} /> : null}
          {!inventoryQuery.isLoading && !inventoryQuery.isError && inventoryRows.length === 0 ? <EmptyState message="No inventory rows found." /> : null}
          {inventoryRows.length > 0 ? (
            <DataTable
              data={inventoryRows}
              columns={[
                { accessorKey: "id", header: "Inventory ID" },
                { accessorKey: "product.name", header: "Product" },
                { accessorKey: "quantity", header: "Quantity" },
                { accessorKey: "reorderLevel", header: "Reorder" },
                { accessorKey: "warehouseId", header: "Warehouse" },
              ]}
            />
          ) : null}

          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <h3 className="text-sm font-semibold">Low Stock Feed</h3>
            {lowStockQuery.isLoading ? <LoadingState message="Loading low stock..." /> : null}
            {lowStockQuery.isError ? <ErrorState message={extractErrorMessage(lowStockQuery.error)} /> : null}
            {!lowStockQuery.isLoading && !lowStockQuery.isError && lowStockRows.length === 0 ? <EmptyState message="No low stock alerts." /> : null}
            {lowStockRows.length > 0 ? <DataTable data={lowStockRows} columns={[{ accessorKey: "id", header: "Inventory" }, { accessorKey: "productName", header: "Product" }, { accessorKey: "quantity", header: "Stock" }, { accessorKey: "reorderLevel", header: "Reorder" }]} /> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
