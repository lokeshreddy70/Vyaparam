import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";

type GenericRecord = Record<string, unknown>;

function rows(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  if (payload && typeof payload === "object") {
    const data = payload as { items?: unknown[] };
    if (Array.isArray(data.items)) return data.items as GenericRecord[];
  }
  return [];
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [transferToWarehouse, setTransferToWarehouse] = useState("");

  const inventoryQuery = useQuery({ queryKey: ["inventory-current"], queryFn: async () => (await api.get("/inventory", { params: { page: 1, limit: 200 } })).data });
  const lowStockQuery = useQuery({ queryKey: ["inventory-low"], queryFn: async () => (await api.get("/inventory/low-stock")).data });
  const outStockQuery = useQuery({ queryKey: ["inventory-out"], queryFn: async () => (await api.get("/reports-analytics/inventory/out-of-stock")).data });
  const warehousesQuery = useQuery({ queryKey: ["inventory-warehouses"], queryFn: async () => (await api.get("/warehouses", { params: { page: 1, limit: 100 } })).data });
  const productsQuery = useQuery({ queryKey: ["inventory-products"], queryFn: async () => (await api.get("/products", { params: { page: 1, limit: 200 } })).data });

  const [historyInventoryId, setHistoryInventoryId] = useState("");
  const historyQuery = useQuery({
    queryKey: ["inventory-history", historyInventoryId],
    enabled: !!historyInventoryId,
    queryFn: async () => (await api.get(`/inventory/${historyInventoryId}/history`)).data,
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/inventory/adjustments", {
        productId,
        warehouseId: warehouseId || undefined,
        quantity: numberValue(quantity),
        reason: adjustmentReason || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-current"] });
      qc.invalidateQueries({ queryKey: ["inventory-low"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      await api.post("/inventory/transfers", {
        productId,
        fromWarehouseId: warehouseId,
        toWarehouseId: transferToWarehouse,
        quantity: numberValue(quantity),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-current"] });
      qc.invalidateQueries({ queryKey: ["inventory-low"] });
    },
  });

  const currentRows = rows(inventoryQuery.data);
  const lowRows = rows(lowStockQuery.data);
  const outRows = rows(outStockQuery.data);
  const warehouseRows = rows(warehousesQuery.data);
  const productRows = rows(productsQuery.data);
  const historyRows = rows(historyQuery.data);

  const totalQty = currentRows.reduce((sum, row) => sum + numberValue(row.quantity), 0);

  const tabContent = useMemo(() => {
    if (tab === "dashboard") {
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Current Stock Records" value={String(currentRows.length)} />
          <Kpi title="Total Quantity" value={String(totalQty)} />
          <Kpi title="Low Stock" value={String(lowRows.length)} />
          <Kpi title="Out Of Stock" value={String(outRows.length)} />
        </div>
      );
    }

    if (tab === "current") {
      return (
        <DataTable
          data={currentRows}
          columns={[
            { accessorKey: "id", header: "Inventory ID" },
            { accessorKey: "productId", header: "Product" },
            { accessorKey: "warehouseId", header: "Warehouse" },
            { accessorKey: "quantity", header: "Current Stock" },
            { accessorKey: "reservedQuantity", header: "Reserved" },
            { accessorKey: "availableQuantity", header: "Available" },
            { accessorKey: "updatedAt", header: "Updated" },
          ]}
        />
      );
    }

    if (tab === "low") {
      return (
        <DataTable
          data={lowRows}
          columns={[
            { accessorKey: "productId", header: "Product" },
            { accessorKey: "warehouseId", header: "Warehouse" },
            { accessorKey: "availableQuantity", header: "Available" },
            { accessorKey: "threshold", header: "Threshold" },
          ]}
        />
      );
    }

    if (tab === "out") {
      return (
        <DataTable
          data={outRows}
          columns={[
            { accessorKey: "productId", header: "Product" },
            { accessorKey: "warehouseId", header: "Warehouse" },
            { accessorKey: "quantity", header: "Quantity" },
            { accessorKey: "updatedAt", header: "Updated" },
          ]}
        />
      );
    }

    if (tab === "warehouses") {
      return (
        <DataTable
          data={warehouseRows}
          columns={[
            { accessorKey: "id", header: "Warehouse ID" },
            { accessorKey: "name", header: "Name" },
            { accessorKey: "code", header: "Code" },
            { accessorKey: "location", header: "Location" },
            { accessorKey: "isActive", header: "Active" },
          ]}
        />
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Stock Adjustment</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">Select product</option>
              {productRows.map((product) => (
                <option key={String(product.id)} value={String(product.id)}>
                  {String(product.name ?? product.id)}
                </option>
              ))}
            </Select>
            <Select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
              <option value="">Select warehouse</option>
              {warehouseRows.map((warehouse) => (
                <option key={String(warehouse.id)} value={String(warehouse.id)}>
                  {String(warehouse.name ?? warehouse.id)}
                </option>
              ))}
            </Select>
            <Input type="number" placeholder="Quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Input placeholder="Adjustment reason" value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} />
            <Button onClick={() => adjustMutation.mutate()} disabled={!productId || !quantity || adjustMutation.isPending}>Apply Adjustment</Button>
            {adjustMutation.isError ? <p className="text-sm text-red-600">{extractErrorMessage(adjustMutation.error)}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Stock Transfer</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={transferToWarehouse} onChange={(event) => setTransferToWarehouse(event.target.value)}>
              <option value="">To warehouse</option>
              {warehouseRows.map((warehouse) => (
                <option key={String(warehouse.id)} value={String(warehouse.id)}>
                  {String(warehouse.name ?? warehouse.id)}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              onClick={() => transferMutation.mutate()}
              disabled={!productId || !warehouseId || !transferToWarehouse || !quantity || transferMutation.isPending}
            >
              Transfer Stock
            </Button>
            {transferMutation.isError ? <p className="text-sm text-red-600">{extractErrorMessage(transferMutation.error)}</p> : null}

            <hr className="border-slate-200 dark:border-slate-800" />

            <Input
              placeholder="Inventory ID for stock history"
              value={historyInventoryId}
              onChange={(event) => setHistoryInventoryId(event.target.value)}
            />
            <div className="max-h-52 space-y-2 overflow-auto rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800">
              {historyRows.length ? (
                historyRows.map((entry, index) => (
                  <article key={String(entry.id ?? index)} className="rounded border border-slate-200 p-2 dark:border-slate-700">
                    <p className="font-medium">{String(entry.type ?? entry.action ?? "ENTRY")}</p>
                    <p>Qty: {String(entry.quantity ?? entry.delta ?? "-")}</p>
                    <p>Date: {String(entry.createdAt ?? entry.date ?? "-")}</p>
                  </article>
                ))
              ) : (
                <p className="text-slate-500">Stock history appears here when inventory ID is provided.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [
    adjustMutation,
    currentRows,
    historyInventoryId,
    historyRows,
    lowRows,
    outRows,
    productId,
    productRows,
    quantity,
    tab,
    totalQty,
    transferMutation,
    transferToWarehouse,
    warehouseId,
    warehouseRows,
    adjustmentReason,
  ]);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "dashboard", label: "Inventory Dashboard" },
          { key: "current", label: "Current Stock" },
          { key: "low", label: "Low Stock" },
          { key: "out", label: "Out Of Stock" },
          { key: "warehouses", label: "Warehouse View" },
          { key: "operations", label: "Adjustments, History, Transfer" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tabContent}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
