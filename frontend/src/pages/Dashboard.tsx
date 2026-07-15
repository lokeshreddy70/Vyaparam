import { useQuery } from "@tanstack/react-query";
import { Activity, BriefcaseBusiness, Boxes, CircleDollarSign, PackageCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { APP_NAV_ITEMS } from "../app/navigation";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { usePermissions } from "../hooks/usePermissions";
import { useWorkspacePreferences } from "../hooks/useWorkspacePreferences";

type Summary = Record<string, unknown>;
type GenericList = Record<string, unknown>[];

function count(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    if (typeof data.total === "number") return data.total;
    if (typeof data.count === "number") return data.count;
    if (Array.isArray(data.items)) return data.items.length;
  }
  return 0;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function chartSeries(payload: unknown) {
  const rows = Array.isArray(payload) ? payload : ((payload as { items?: unknown[] } | undefined)?.items ?? []);
  return rows.slice(0, 10).map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      name: String(item.name ?? item.productName ?? item.label ?? `P${index + 1}`),
      value: numberValue(item.totalSales ?? item.total ?? item.amount ?? item.count),
    };
  });
}

export default function DashboardPage() {
  const { can } = usePermissions();
  const {
    favoritePaths,
    pinnedPaths,
    recentPaths,
    toggleFavorite,
    togglePinned,
  } = useWorkspacePreferences();

  const visibleNav = APP_NAV_ITEMS.filter((item) => can(item.permission));
  const favoriteNav = visibleNav.filter((item) => favoritePaths.includes(item.path));
  const pinnedNav = visibleNav.filter((item) => pinnedPaths.includes(item.path));
  const recentNav = recentPaths.map((path) => visibleNav.find((item) => item.path === path)).filter(Boolean) as typeof visibleNav;

  const summaryQuery = useQuery({
    queryKey: ["dash-summary"],
    queryFn: async () => (await api.get<Summary>("/reports-analytics/dashboard")).data,
  });

  const healthQuery = useQuery({
    queryKey: ["dash-health"],
    queryFn: async () => (await api.get<Summary>("/monitoring/health")).data,
    refetchInterval: 30000,
  });

  const recentActivityQuery = useQuery({
    queryKey: ["dash-activities"],
    queryFn: async () => (await api.get<GenericList>("/monitoring/logs/activity", { params: { page: 1, limit: 12 } })).data,
  });

  const lowStockQuery = useQuery({
    queryKey: ["dash-low-stock"],
    queryFn: async () => (await api.get<GenericList>("/inventory/low-stock")).data,
  });

  const topProductsQuery = useQuery({
    queryKey: ["dash-top-products"],
    queryFn: async () => (await api.get<GenericList>("/reports-analytics/sales/top-products")).data,
  });

  const remindersQuery = useQuery({
    queryKey: ["dash-reminders"],
    queryFn: async () => (await api.get<GenericList>("/notifications/reminders", { params: { page: 1, limit: 12 } })).data,
    enabled: can("notification.read"),
  });

  const employeesQuery = useQuery({
    queryKey: ["dash-employees"],
    queryFn: async () => (await api.get<unknown>("/employees", { params: { page: 1, limit: 1 } })).data,
  });

  const customersQuery = useQuery({
    queryKey: ["dash-customers"],
    queryFn: async () => (await api.get<unknown>("/customers", { params: { page: 1, limit: 1 } })).data,
  });

  const suppliersQuery = useQuery({
    queryKey: ["dash-suppliers"],
    queryFn: async () => (await api.get<unknown>("/suppliers", { params: { page: 1, limit: 1 } })).data,
  });

  const inventoryQuery = useQuery({
    queryKey: ["dash-inventory"],
    queryFn: async () => (await api.get<unknown>("/inventory", { params: { page: 1, limit: 1 } })).data,
  });

  const summary = summaryQuery.data ?? {};
  const activities = Array.isArray(recentActivityQuery.data)
    ? recentActivityQuery.data
    : ((recentActivityQuery.data as { items?: GenericList } | undefined)?.items ?? []);
  const lowStock = Array.isArray(lowStockQuery.data)
    ? lowStockQuery.data
    : ((lowStockQuery.data as { items?: GenericList } | undefined)?.items ?? []);
  const topSeries = chartSeries(topProductsQuery.data);
  const reminders = Array.isArray(remindersQuery.data)
    ? remindersQuery.data
    : ((remindersQuery.data as { items?: GenericList } | undefined)?.items ?? []);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<CircleDollarSign size={16} />} title="Revenue" value={numberValue(summary.totalRevenue ?? summary.revenue ?? summary.salesToday).toFixed(2)} />
        <KpiCard icon={<Wallet size={16} />} title="Profit" value={numberValue(summary.totalProfit ?? summary.profit).toFixed(2)} />
        <KpiCard icon={<BriefcaseBusiness size={16} />} title="Sales" value={numberValue(summary.totalSales ?? summary.sales).toFixed(2)} />
        <KpiCard icon={<TrendingUp size={16} />} title="Invoices" value={numberValue(summary.invoicesToday ?? summary.invoiceCount).toString()} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users size={16} />} title="Employees" value={count(employeesQuery.data).toString()} />
        <KpiCard icon={<Users size={16} />} title="Customers" value={count(customersQuery.data).toString()} />
        <KpiCard icon={<Users size={16} />} title="Suppliers" value={count(suppliersQuery.data).toString()} />
        <KpiCard icon={<Boxes size={16} />} title="Inventory Records" value={count(inventoryQuery.data).toString()} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <h2 className="text-base font-semibold">Sales Summary Trend</h2>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={topSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#0284c7" fill="#7dd3fc" fillOpacity={0.45} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">System Health</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800">
              <Activity size={14} />
              <span>Status</span>
              <span className="ml-auto font-medium">{String((healthQuery.data as Record<string, unknown> | undefined)?.status ?? "UNKNOWN")}</span>
            </div>
            <pre className="max-h-52 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">
              {JSON.stringify(healthQuery.data ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Workspace Favorites and Pinned Pages</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Pinned</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {pinnedNav.length ? pinnedNav.map((item) => (
                  <div key={`p-${item.key}`} className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                    <Link to={item.path} className="flex-1">{item.label}</Link>
                    <Button size="sm" variant="outline" onClick={() => togglePinned(item.path)}>Unpin</Button>
                  </div>
                )) : <p className="text-sm text-slate-500">No pinned pages yet.</p>}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Favorites</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {favoriteNav.length ? favoriteNav.map((item) => (
                  <div key={`f-${item.key}`} className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                    <Link to={item.path} className="flex-1">{item.label}</Link>
                    <Button size="sm" variant="outline" onClick={() => toggleFavorite(item.path)}>Remove</Button>
                  </div>
                )) : <p className="text-sm text-slate-500">No favorite pages yet.</p>}
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Recent</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {recentNav.length ? recentNav.slice(0, 8).map((item) => (
                  <div key={`r-${item.key}`} className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                    <Link to={item.path} className="flex-1">{item.label}</Link>
                    <Button size="sm" variant="outline" onClick={() => togglePinned(item.path)}>Pin</Button>
                    <Button size="sm" variant="outline" onClick={() => toggleFavorite(item.path)}>Fav</Button>
                  </div>
                )) : <p className="text-sm text-slate-500">No recent pages yet.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Recent Activities</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities.length ? (
              activities.map((row, index) => (
                <article key={String(row.id ?? index)} className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                  <p className="font-medium">{String(row.action ?? row.type ?? "ACTIVITY")}</p>
                  <p className="text-xs text-slate-500">{String(row.module ?? row.context ?? "SYSTEM")}</p>
                  <p className="text-xs text-slate-500">{String(row.createdAt ?? row.timestamp ?? "")}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-500">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Quick Actions</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <QuickAction to="/products" label="Manage Products" enabled={can("product.read")} />
              <QuickAction to="/inventory" label="Inventory Dashboard" enabled={can("inventory.read")} />
              <QuickAction to="/customers" label="Manage Customers" enabled={can("customer.read")} />
              <QuickAction to="/suppliers" label="Manage Suppliers" enabled={can("supplier.read")} />
              <QuickAction to="/categories" label="Category Masters" enabled={can("category.read")} />
              <QuickAction to="/settings" label="Business Settings" enabled={can("business.read")} />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Low Stock Alerts: {lowStock.length}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Tasks and Reminder Queue</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {reminders.length ? reminders.map((item, index) => (
              <article key={String(item.id ?? index)} className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                <p className="font-medium">{String(item.title ?? item.message ?? "Reminder")}</p>
                <p className="text-xs text-slate-500">{String(item.dueAt ?? item.scheduledAt ?? item.createdAt ?? "")}</p>
              </article>
            )) : <p className="text-sm text-slate-500">No pending reminders.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Calendar Ready Workspace</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Notification reminders and scheduled items are available through existing notification APIs.</p>
            <p>Workspace calendar panels can render from reminders without backend changes.</p>
            <p>Current reminders loaded: {reminders.length}</p>
            <p>Global search, command palette, notifications, profile menu, and settings are active in the shared shell.</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Inventory Summary</h2>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {lowStock.slice(0, 8).map((row, index) => (
              <article key={String(row.id ?? index)} className="rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800">
                <p className="font-medium">{String(row.productName ?? row.productId ?? "Unknown Product")}</p>
                <p>Warehouse: {String(row.warehouseName ?? row.warehouseId ?? "-")}</p>
                <p>Available: {numberValue(row.availableQuantity ?? row.quantity)}</p>
              </article>
            ))}
            {!lowStock.length ? <p className="text-sm text-slate-500">No low stock alerts.</p> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="inline-flex rounded-md bg-slate-100 p-2 dark:bg-slate-800">{icon}</span>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, label, enabled }: { to: string; label: string; enabled: boolean }) {
  if (!enabled) {
    return (
      <Button variant="outline" disabled className="w-full justify-start">
        {label}
      </Button>
    );
  }

  return (
    <Link to={to}>
      <Button variant="outline" className="w-full justify-start">
        {label}
      </Button>
    </Link>
  );
}
