import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, extractErrorMessage } from "../api/client";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Tabs } from "../components/ui/tabs";
import { downloadJson } from "../lib/utils";

function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown[] }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

function toSeries(payload: unknown) {
  return rows(payload).slice(0, 12).map((item, index) => ({
    name: String(item.name ?? item.productName ?? item.customerName ?? item.label ?? `Item ${index + 1}`),
    total: Number(item.total ?? item.totalSales ?? item.amount ?? item.count ?? 0),
  }));
}

export default function ReportsPage() {
  const tabs = [
    { key: "dashboard", label: "Dashboard Reports" },
    { key: "sales", label: "Sales Reports" },
    { key: "inventory", label: "Inventory Reports" },
    { key: "purchase", label: "Purchase Reports" },
    { key: "customer", label: "Customer Reports" },
    { key: "supplier", label: "Supplier Reports" },
    { key: "financial", label: "Financial Reports" },
  ];

  const [tab, setTab] = useState("dashboard");

  const dashboardQuery = useQuery({ queryKey: ["reports-dashboard-c"], queryFn: async () => (await api.get("/reports-analytics/dashboard")).data });
  const salesProductsQuery = useQuery({ queryKey: ["reports-sales-products-c"], queryFn: async () => (await api.get("/reports-analytics/sales/top-products")).data });
  const salesCustomersQuery = useQuery({ queryKey: ["reports-sales-customers-c"], queryFn: async () => (await api.get("/reports-analytics/sales/top-customers")).data });
  const inventoryCurrentQuery = useQuery({ queryKey: ["reports-inventory-current-c"], queryFn: async () => (await api.get("/reports-analytics/inventory/current-stock")).data });
  const inventoryValuationQuery = useQuery({ queryKey: ["reports-inventory-value-c"], queryFn: async () => (await api.get("/reports-analytics/inventory/stock-valuation")).data });
  const purchaseQuery = useQuery({ queryKey: ["reports-purchase-c"], queryFn: async () => (await api.get("/billing-pos/documents", { params: { type: "PURCHASE", page: 1, limit: 200 } })).data });
  const customerQuery = useQuery({ queryKey: ["reports-customer-c"], queryFn: async () => (await api.get("/customers", { params: { page: 1, limit: 200 } })).data });
  const supplierQuery = useQuery({ queryKey: ["reports-supplier-c"], queryFn: async () => (await api.get("/suppliers", { params: { page: 1, limit: 200 } })).data });
  const financialQuery = useQuery({ queryKey: ["reports-financial-c"], queryFn: async () => (await api.get("/billing-pos/documents", { params: { page: 1, limit: 200 } })).data });

  const reportMap: Record<string, unknown> = {
    dashboard: dashboardQuery.data,
    sales: { topProducts: salesProductsQuery.data, topCustomers: salesCustomersQuery.data },
    inventory: { currentStock: inventoryCurrentQuery.data, valuation: inventoryValuationQuery.data },
    purchase: purchaseQuery.data,
    customer: customerQuery.data,
    supplier: supplierQuery.data,
    financial: financialQuery.data,
  };

  const activeData = reportMap[tab] ?? {};

  const loading =
    dashboardQuery.isLoading ||
    salesProductsQuery.isLoading ||
    salesCustomersQuery.isLoading ||
    inventoryCurrentQuery.isLoading ||
    inventoryValuationQuery.isLoading ||
    purchaseQuery.isLoading ||
    customerQuery.isLoading ||
    supplierQuery.isLoading ||
    financialQuery.isLoading;

  const error =
    dashboardQuery.error ||
    salesProductsQuery.error ||
    salesCustomersQuery.error ||
    inventoryCurrentQuery.error ||
    inventoryValuationQuery.error ||
    purchaseQuery.error ||
    customerQuery.error ||
    supplierQuery.error ||
    financialQuery.error;

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Enterprise Reports</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => downloadJson(`report-${tab}.pdf.json`, activeData)}>Export PDF</Button>
            <Button variant="outline" onClick={() => downloadJson(`report-${tab}.xlsx.json`, activeData)}>Export Excel</Button>
            <Button variant="secondary" onClick={() => downloadJson(`report-${tab}.csv.json`, activeData)}>Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <LoadingState message="Loading reports..." /> : null}
          {error ? <ErrorState message={extractErrorMessage(error)} /> : null}
          {!loading && !error ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportChart title="Sales Insights" data={toSeries(salesProductsQuery.data)} />
                <ReportChart title="Customer Insights" data={toSeries(salesCustomersQuery.data)} />
              </div>
              <DataTable
                data={rows(
                  tab === "sales"
                    ? salesProductsQuery.data
                    : tab === "inventory"
                    ? inventoryCurrentQuery.data
                    : tab === "purchase"
                    ? purchaseQuery.data
                    : tab === "customer"
                    ? customerQuery.data
                    : tab === "supplier"
                    ? supplierQuery.data
                    : tab === "financial"
                    ? financialQuery.data
                    : dashboardQuery.data,
                )}
                columns={[
                  { accessorKey: "id", header: "ID" },
                  { accessorKey: "name", header: "Name" },
                  { accessorKey: "status", header: "Status" },
                  { accessorKey: "total", header: "Total" },
                  { accessorKey: "createdAt", header: "Created" },
                ]}
              />
            </>
          ) : null}
          {!loading && !error && rows(activeData).length === 0 && tab !== "dashboard" ? <EmptyState message="No report records available." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportChart({ title, data }: { title: string; data: { name: string; total: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#0284c7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
