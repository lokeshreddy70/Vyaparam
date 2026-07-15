import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { usePermissions } from "../hooks/usePermissions";
import { useAuthStore } from "../store/authStore";

type Rec = Record<string, unknown>;

function rows(payload: unknown): Rec[] {
  if (Array.isArray(payload)) return payload as Rec[];
  if (payload && typeof payload === "object") {
    const value = payload as { items?: unknown[]; data?: unknown[] };
    if (Array.isArray(value.items)) return value.items as Rec[];
    if (Array.isArray(value.data)) return value.data as Rec[];
  }
  return [];
}

function totalFrom(payload: unknown): number {
  if (payload && typeof payload === "object") {
    const data = payload as Rec;
    if (typeof data.total === "number") return data.total;
    if (typeof data.count === "number") return data.count;
  }
  return rows(payload).length;
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const platformTabs = [
  { key: "super-admin", label: "Super Admin" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "customer-management", label: "Customer Management" },
  { key: "support-center", label: "Support Center" },
  { key: "monitoring", label: "Platform Monitoring" },
  { key: "audit", label: "Audit" },
  { key: "feature-flags", label: "Feature Flags" },
  { key: "global-settings", label: "Global Settings" },
  { key: "analytics", label: "Analytics" },
  { key: "security", label: "Security" },
];

export default function PlatformAdminPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const user = useAuthStore((state) => state.user);

  const [tab, setTab] = useState("super-admin");

  const [wizard, setWizard] = useState({
    businessName: "",
    businessType: "RETAIL",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [businessPatch, setBusinessPatch] = useState({ name: "", type: "RETAIL", phone: "", address: "", gstNumber: "" });

  const [subscriptionForm, setSubscriptionForm] = useState({
    plan: "PRO",
    billingCycle: "MONTHLY",
    price: "0",
    trialDays: "14",
    expiryDate: "",
    licenseSeats: "50",
    storageLimitGb: "100",
  });

  const [supportForm, setSupportForm] = useState({
    name: "Support Ticket",
    type: "SYNC",
    priority: "MEDIUM",
    note: "",
    assignedTo: "",
    status: "OPEN",
  });

  const [flagKey, setFlagKey] = useState("platform.superAdmin");
  const [moduleKey, setModuleKey] = useState("RESTAURANT");
  const [flagEnabled, setFlagEnabled] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(true);

  const [providerConfig, setProviderConfig] = useState({
    emailProvider: "smtp",
    smsProvider: "twilio",
    notificationProvider: "in_app",
    storageProvider: "local",
    paymentProvider: "razorpay",
    upiProvider: "upi_default",
    printerProvider: "thermal80",
    envMode: "production",
  });

  const [securityConfig, setSecurityConfig] = useState({
    sessionTimeoutMinutes: "30",
    maxLoginAttempts: "5",
    mfaRequired: "true",
    tenantIsolationMode: "strict",
  });

  const businessesQuery = useQuery({
    queryKey: ["platform-businesses"],
    queryFn: async () => (await api.get("/businesses")).data,
    enabled: can("business.read"),
  });

  const businessDetailQuery = useQuery({
    queryKey: ["platform-business-detail", selectedBusinessId],
    queryFn: async () => (await api.get(`/businesses/${selectedBusinessId}`)).data,
    enabled: !!selectedBusinessId && can("business.read"),
  });

  const usersQuery = useQuery({ queryKey: ["platform-users"], queryFn: async () => (await api.get("/users")).data, enabled: can("user.read") || can("business.read") });
  const employeesQuery = useQuery({ queryKey: ["platform-employees"], queryFn: async () => (await api.get("/employees", { params: { page: 1, limit: 200 } })).data, enabled: can("employee.read") || can("business.read") });
  const branchesQuery = useQuery({ queryKey: ["platform-branches"], queryFn: async () => (await api.get("/branches", { params: { page: 1, limit: 200 } })).data, enabled: can("branch.read") || can("business.read") });
  const devicesQuery = useQuery({ queryKey: ["platform-devices"], queryFn: async () => (await api.get("/monitoring/metrics", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.read") });

  const settingsQuery = useQuery({
    queryKey: ["platform-settings-config"],
    queryFn: async () => (await api.get("/settings/business-configuration")).data,
    enabled: can("business.read"),
  });

  const monitoringHealthQuery = useQuery({ queryKey: ["platform-health"], queryFn: async () => (await api.get("/monitoring/health")).data, enabled: can("monitoring.read"), refetchInterval: 20000 });
  const monitoringMetricsQuery = useQuery({ queryKey: ["platform-metrics"], queryFn: async () => (await api.get("/monitoring/metrics", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.read"), refetchInterval: 20000 });
  const monitoringDashboardQuery = useQuery({ queryKey: ["platform-dashboard-monitor"], queryFn: async () => (await api.get("/monitoring/dashboard")).data, enabled: can("monitoring.read"), refetchInterval: 20000 });
  const monitoringJobsQuery = useQuery({ queryKey: ["platform-jobs"], queryFn: async () => (await api.get("/monitoring/jobs", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.jobs.read") || can("monitoring.read") });
  const monitoringRunsQuery = useQuery({ queryKey: ["platform-job-runs"], queryFn: async () => (await api.get("/monitoring/jobs/runs", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.jobs.read") || can("monitoring.read") });

  const auditQuery = useQuery({ queryKey: ["platform-audit"], queryFn: async () => (await api.get("/monitoring/logs/audit", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.audit.read") });
  const activityQuery = useQuery({ queryKey: ["platform-activity"], queryFn: async () => (await api.get("/monitoring/logs/activity", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.audit.read") });
  const loginHistoryQuery = useQuery({ queryKey: ["platform-login-history"], queryFn: async () => (await api.get("/monitoring/logs/login-history", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.audit.read") });
  const securityEventsQuery = useQuery({ queryKey: ["platform-security-events"], queryFn: async () => (await api.get("/monitoring/logs/failed-logins", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.audit.read") });

  const revenueQuery = useQuery({ queryKey: ["platform-revenue"], queryFn: async () => (await api.get("/reports-analytics/sales/monthly")).data, enabled: can("reports.read") });
  const subscriptionsAnalyticsQuery = useQuery({ queryKey: ["platform-subscription-analytics"], queryFn: async () => (await api.get("/reports-analytics/dashboard")).data, enabled: can("reports.read") });
  const growthQuery = useQuery({ queryKey: ["platform-growth"], queryFn: async () => (await api.get("/reports-analytics/charts")).data, enabled: can("reports.read") });
  const churnQuery = useQuery({ queryKey: ["platform-churn"], queryFn: async () => (await api.get("/reports-analytics/sales/returned-bills")).data, enabled: can("reports.read") });
  const topBusinessesQuery = useQuery({ queryKey: ["platform-top-businesses"], queryFn: async () => (await api.get("/reports-analytics/sales/top-branches")).data, enabled: can("reports.read") });

  const notificationsQueueQuery = useQuery({ queryKey: ["platform-support-queue"], queryFn: async () => (await api.get("/notifications/queue", { params: { page: 1, limit: 200 } })).data, enabled: can("notification.queue.read") });
  const remindersQuery = useQuery({ queryKey: ["platform-reminders"], queryFn: async () => (await api.get("/notifications/reminders", { params: { page: 1, limit: 200 } })).data, enabled: can("notification.reminder.read") || can("notification.queue.read") });

  const registerBusinessMutation = useMutation({
    mutationFn: async () =>
      api.post("/auth/register", {
        businessName: wizard.businessName,
        businessType: wizard.businessType,
        ownerName: wizard.ownerName,
        email: wizard.email,
        password: wizard.password,
        phone: wizard.phone || undefined,
        address: wizard.address || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-businesses"] });
      setWizard({ businessName: "", businessType: "RETAIL", ownerName: "", email: "", password: "", phone: "", address: "" });
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async () => api.patch(`/businesses/${selectedBusinessId}`, {
      name: businessPatch.name || undefined,
      type: businessPatch.type || undefined,
      phone: businessPatch.phone || undefined,
      address: businessPatch.address || undefined,
      gstNumber: businessPatch.gstNumber || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-businesses"] });
      qc.invalidateQueries({ queryKey: ["platform-business-detail", selectedBusinessId] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: Rec) => api.patch("/settings/business-configuration", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings-config"] }),
  });

  const updateFeatureFlagMutation = useMutation({
    mutationFn: async () => api.patch("/settings/business-configuration/feature-flag", { key: flagKey, isEnabled: flagEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings-config"] }),
  });

  const updateModuleMutation = useMutation({
    mutationFn: async () => api.patch("/settings/business-configuration/module-toggle", { module: moduleKey, isEnabled: moduleEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings-config"] }),
  });

  const supportTicketMutation = useMutation({
    mutationFn: async () =>
      api.post("/monitoring/jobs", {
        type: supportForm.type,
        name: supportForm.name,
        priority: supportForm.priority,
        payload: {
          category: "SUPPORT_TICKET",
          issueTracking: true,
          status: supportForm.status,
          assignment: supportForm.assignedTo || null,
          internalNotes: supportForm.note || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-jobs"] });
      setSupportForm((prev) => ({ ...prev, note: "", assignedTo: "" }));
    },
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => api.post("/monitoring/jobs/process", { take: 100 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-jobs"] });
      qc.invalidateQueries({ queryKey: ["platform-job-runs"] });
      qc.invalidateQueries({ queryKey: ["platform-dashboard-monitor"] });
    },
  });

  const processNotificationsMutation = useMutation({
    mutationFn: async () => api.post("/notifications/queue/process"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-support-queue"] }),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["platform-businesses"] });
    qc.invalidateQueries({ queryKey: ["platform-settings-config"] });
    qc.invalidateQueries({ queryKey: ["platform-health"] });
    qc.invalidateQueries({ queryKey: ["platform-metrics"] });
    qc.invalidateQueries({ queryKey: ["platform-dashboard-monitor"] });
    qc.invalidateQueries({ queryKey: ["platform-audit"] });
    qc.invalidateQueries({ queryKey: ["platform-activity"] });
    qc.invalidateQueries({ queryKey: ["platform-login-history"] });
    qc.invalidateQueries({ queryKey: ["platform-security-events"] });
  };

  const businessRows = rows(businessesQuery.data);
  const usersRows = rows(usersQuery.data);
  const employeesRows = rows(employeesQuery.data);
  const branchesRows = rows(branchesQuery.data);
  const jobsRows = rows(monitoringJobsQuery.data);
  const runsRows = rows(monitoringRunsQuery.data);
  const auditRows = rows(auditQuery.data);
  const activityRows = rows(activityQuery.data);
  const loginRows = rows(loginHistoryQuery.data);
  const securityRows = rows(securityEventsQuery.data);
  const supportQueueRows = rows(notificationsQueueQuery.data);
  const remindersRows = rows(remindersQuery.data);
  const topBusinessesRows = rows(topBusinessesQuery.data);

  const kpis = useMemo(() => {
    const revenueSeries = rows(revenueQuery.data);
    const revenue = revenueSeries.reduce((sum, item) => sum + numeric(item.total ?? item.totalSales ?? item.amount), 0);
    const subscriptionSource = (settingsQuery.data as Rec | undefined)?.subscriptionInformation as Rec | undefined;
    const activeSubscriptions = numeric(subscriptionSource?.activeSubscriptions ?? businessRows.length);
    const churnSource = rows(churnQuery.data);
    const churnCount = churnSource.length;
    const months = 12;
    const mrr = revenue / Math.max(1, months);
    const arr = mrr * 12;
    return {
      revenue,
      activeSubscriptions,
      churnCount,
      mrr,
      arr,
      businesses: businessRows.length,
      users: totalFrom(usersQuery.data),
      devices: totalFrom(devicesQuery.data),
    };
  }, [businessRows.length, churnQuery.data, devicesQuery.data, revenueQuery.data, settingsQuery.data, usersQuery.data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Super Admin Control Center</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={refreshAll}>Refresh</Button>
            <Button variant="secondary" onClick={() => setTab("super-admin")}>Open Admin Home</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Businesses" value={kpis.businesses} />
          <Kpi label="Active Users" value={kpis.users} />
          <Kpi label="Active Devices" value={kpis.devices} />
          <Kpi label="Revenue" value={kpis.revenue.toFixed(2)} />
          <Kpi label="MRR" value={kpis.mrr.toFixed(2)} />
          <Kpi label="ARR" value={kpis.arr.toFixed(2)} />
          <Kpi label="Subscriptions" value={kpis.activeSubscriptions} />
          <Kpi label="Churn Signals" value={kpis.churnCount} />
        </CardContent>
      </Card>

      <Tabs tabs={platformTabs} active={tab} onChange={setTab} />

      {tab === "super-admin" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Business Onboarding Wizard</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Business Name" value={wizard.businessName} onChange={(event) => setWizard((prev) => ({ ...prev, businessName: event.target.value }))} />
                <Select value={wizard.businessType} onChange={(event) => setWizard((prev) => ({ ...prev, businessType: event.target.value }))}>
                  {[
                    "RETAIL",
                    "WHOLESALE",
                    "RESTAURANT",
                    "PHARMACY",
                    "SERVICE",
                    "MANUFACTURING",
                  ].map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
                <Input placeholder="Owner Name" value={wizard.ownerName} onChange={(event) => setWizard((prev) => ({ ...prev, ownerName: event.target.value }))} />
                <Input placeholder="Owner Email" value={wizard.email} onChange={(event) => setWizard((prev) => ({ ...prev, email: event.target.value }))} />
                <Input type="password" placeholder="Strong Password" value={wizard.password} onChange={(event) => setWizard((prev) => ({ ...prev, password: event.target.value }))} />
                <Input placeholder="Phone" value={wizard.phone} onChange={(event) => setWizard((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <Textarea placeholder="Address" value={wizard.address} onChange={(event) => setWizard((prev) => ({ ...prev, address: event.target.value }))} />
              <Button disabled={!wizard.businessName || !wizard.ownerName || !wizard.email || !wizard.password || registerBusinessMutation.isPending} onClick={() => registerBusinessMutation.mutate()}>
                Create Business
              </Button>
              {registerBusinessMutation.isError ? <ErrorState message={extractErrorMessage(registerBusinessMutation.error)} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">Business Lifecycle Controls</h2></CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedBusinessId} onChange={(event) => setSelectedBusinessId(event.target.value)}>
                <option value="">Select Business</option>
                {businessRows.map((business) => <option key={String(business.id)} value={String(business.id)}>{String(business.name ?? business.id)}</option>)}
              </Select>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Business Name" value={businessPatch.name} onChange={(event) => setBusinessPatch((prev) => ({ ...prev, name: event.target.value }))} />
                <Select value={businessPatch.type} onChange={(event) => setBusinessPatch((prev) => ({ ...prev, type: event.target.value }))}>
                  {[
                    "RETAIL",
                    "WHOLESALE",
                    "RESTAURANT",
                    "PHARMACY",
                    "SERVICE",
                    "MANUFACTURING",
                  ].map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
                <Input placeholder="Phone" value={businessPatch.phone} onChange={(event) => setBusinessPatch((prev) => ({ ...prev, phone: event.target.value }))} />
                <Input placeholder="GST Number" value={businessPatch.gstNumber} onChange={(event) => setBusinessPatch((prev) => ({ ...prev, gstNumber: event.target.value }))} />
              </div>
              <Textarea placeholder="Address" value={businessPatch.address} onChange={(event) => setBusinessPatch((prev) => ({ ...prev, address: event.target.value }))} />
              <div className="grid gap-2 md:grid-cols-3">
                <Button disabled={!selectedBusinessId || updateBusinessMutation.isPending} onClick={() => updateBusinessMutation.mutate()}>Update Business</Button>
                <Button
                  variant="secondary"
                  disabled={updateSettingsMutation.isPending}
                  onClick={() => updateSettingsMutation.mutate({ businessStatus: { state: "SUSPENDED", updatedBy: user?.id ?? null, updatedAt: new Date().toISOString() } })}
                >
                  Suspend Business
                </Button>
                <Button
                  variant="outline"
                  disabled={updateSettingsMutation.isPending}
                  onClick={() => updateSettingsMutation.mutate({ businessStatus: { state: "ACTIVE", updatedBy: user?.id ?? null, updatedAt: new Date().toISOString() } })}
                >
                  Activate Business
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Button
                  variant="danger"
                  disabled={updateSettingsMutation.isPending}
                  onClick={() => updateSettingsMutation.mutate({ businessStatus: { state: "DELETED", updatedBy: user?.id ?? null, updatedAt: new Date().toISOString() } })}
                >
                  Delete Business
                </Button>
                <Button
                  variant="secondary"
                  disabled={updateSettingsMutation.isPending}
                  onClick={() => {
                    const config = settingsQuery.data as Rec | undefined;
                    updateSettingsMutation.mutate({
                      featureFlags: (config?.featureFlags as Rec | undefined) ?? {},
                      moduleToggles: (config?.moduleToggles as Rec | undefined) ?? {},
                      businessPreferences: {
                        ...(config?.businessPreferences as Rec | undefined),
                        templateVersion: new Date().toISOString(),
                        templateAppliedBy: user?.id ?? null,
                      },
                    });
                  }}
                >
                  Clone Business Configuration Template
                </Button>
              </div>
              {updateBusinessMutation.isError ? <ErrorState message={extractErrorMessage(updateBusinessMutation.error)} /> : null}
              {updateSettingsMutation.isError ? <ErrorState message={extractErrorMessage(updateSettingsMutation.error)} /> : null}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader><h2 className="text-base font-semibold">Business Directory and Health</h2></CardHeader>
            <CardContent className="space-y-3">
              {businessesQuery.isLoading ? <LoadingState message="Loading businesses..." /> : null}
              {businessesQuery.isError ? <ErrorState message={extractErrorMessage(businessesQuery.error)} /> : null}
              {!businessesQuery.isLoading && !businessesQuery.isError && businessRows.length === 0 ? <EmptyState message="No businesses found." /> : null}
              {!businessesQuery.isLoading && !businessesQuery.isError && businessRows.length > 0 ? (
                <DataTable
                  data={businessRows}
                  columns={[
                    { accessorKey: "id", header: "Business ID" },
                    { accessorKey: "name", header: "Business" },
                    { accessorKey: "type", header: "Type" },
                    { accessorKey: "phone", header: "Phone" },
                    { accessorKey: "createdAt", header: "Created" },
                    {
                      id: "status",
                      header: "Status",
                      cell: ({ row }: { row: { original: Rec } }) => {
                        const statusSource = (settingsQuery.data as Rec | undefined)?.businessStatus as Rec | undefined;
                        return <span>{String(statusSource?.state ?? row.original.status ?? "ACTIVE")}</span>;
                      },
                    },
                  ]}
                />
              ) : null}
              {selectedBusinessId && businessDetailQuery.data ? (
                <pre className="max-h-56 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(businessDetailQuery.data, null, 2)}</pre>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "subscriptions" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Plans, Billing and License Management</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <Select value={subscriptionForm.plan} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, plan: event.target.value }))}>
                <option value="FREE_TRIAL">Free Trial</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="ENTERPRISE">Enterprise Plan</option>
                <option value="PRO">Pro</option>
              </Select>
              <Select value={subscriptionForm.billingCycle} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, billingCycle: event.target.value }))}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
              <Input placeholder="Price" value={subscriptionForm.price} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, price: event.target.value }))} />
              <Input placeholder="Trial Days" value={subscriptionForm.trialDays} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, trialDays: event.target.value }))} />
              <Input type="date" value={subscriptionForm.expiryDate} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, expiryDate: event.target.value }))} />
              <Input placeholder="License Seats" value={subscriptionForm.licenseSeats} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, licenseSeats: event.target.value }))} />
              <Input placeholder="Storage GB" value={subscriptionForm.storageLimitGb} onChange={(event) => setSubscriptionForm((prev) => ({ ...prev, storageLimitGb: event.target.value }))} />
              <Button
                onClick={() =>
                  updateSettingsMutation.mutate({
                    subscriptionInformation: {
                      plan: subscriptionForm.plan,
                      billingCycle: subscriptionForm.billingCycle,
                      price: numeric(subscriptionForm.price),
                      trialDays: numeric(subscriptionForm.trialDays),
                      expiryDate: subscriptionForm.expiryDate || null,
                      renewals: true,
                      invoices: true,
                      payments: true,
                      licenses: numeric(subscriptionForm.licenseSeats),
                    },
                    storageSettings: { usageGb: numeric(subscriptionForm.storageLimitGb), limitGb: numeric(subscriptionForm.storageLimitGb) },
                  })
                }
                disabled={updateSettingsMutation.isPending}
              >
                Save Subscription
              </Button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify((settingsQuery.data as Rec | undefined)?.subscriptionInformation ?? {}, null, 2)}</pre>
          </CardContent>
        </Card>
      ) : null}

      {tab === "customer-management" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Business Analytics</h2></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Kpi label="Active Users" value={totalFrom(usersQuery.data)} />
              <Kpi label="Active Employees" value={totalFrom(employeesQuery.data)} />
              <Kpi label="Active Devices" value={totalFrom(devicesQuery.data)} />
              <Kpi label="Branch Summary" value={totalFrom(branchesQuery.data)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Owner and Business Profile</h2></CardHeader>
            <CardContent>
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify({ currentUser: user, business: businessDetailQuery.data ?? settingsQuery.data ?? null }, null, 2)}</pre>
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader><h2 className="text-base font-semibold">Business Directory</h2></CardHeader>
            <CardContent>
              <DataTable data={businessRows} columns={[{ accessorKey: "id", header: "Business ID" }, { accessorKey: "name", header: "Name" }, { accessorKey: "type", header: "Type" }, { accessorKey: "phone", header: "Phone" }, { accessorKey: "createdAt", header: "Created" }]} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "support-center" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Support Tickets and Assignments</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Issue Title" value={supportForm.name} onChange={(event) => setSupportForm((prev) => ({ ...prev, name: event.target.value }))} />
                <Select value={supportForm.type} onChange={(event) => setSupportForm((prev) => ({ ...prev, type: event.target.value }))}>
                  <option value="SYNC">SYNC</option>
                  <option value="ASYNC">ASYNC</option>
                  <option value="REPORT">REPORT</option>
                  <option value="BACKUP">BACKUP</option>
                  <option value="ALERT">ALERT</option>
                </Select>
                <Select value={supportForm.priority} onChange={(event) => setSupportForm((prev) => ({ ...prev, priority: event.target.value }))}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </Select>
                <Input placeholder="Assigned To" value={supportForm.assignedTo} onChange={(event) => setSupportForm((prev) => ({ ...prev, assignedTo: event.target.value }))} />
              </div>
              <Textarea placeholder="Internal Notes" value={supportForm.note} onChange={(event) => setSupportForm((prev) => ({ ...prev, note: event.target.value }))} />
              <div className="flex flex-wrap gap-2">
                <Button disabled={!can("monitoring.jobs.manage") || supportTicketMutation.isPending} onClick={() => supportTicketMutation.mutate()}>Create Ticket</Button>
                <Button variant="secondary" disabled={!can("monitoring.jobs.manage") || processQueueMutation.isPending} onClick={() => processQueueMutation.mutate()}>
                  Process Ticket Queue
                </Button>
              </div>
              {supportTicketMutation.isError ? <ErrorState message={extractErrorMessage(supportTicketMutation.error)} /> : null}
              {processQueueMutation.isError ? <ErrorState message={extractErrorMessage(processQueueMutation.error)} /> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Customer Issues and Reminders</h2></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" disabled={!can("notification.queue.process") || processNotificationsMutation.isPending} onClick={() => processNotificationsMutation.mutate()}>
                  Process Notifications
                </Button>
              </div>
              <DataTable data={remindersRows} columns={[{ accessorKey: "id", header: "Reminder" }, { accessorKey: "title", header: "Title" }, { accessorKey: "eventType", header: "Event" }, { accessorKey: "remindAt", header: "Due" }, { accessorKey: "status", header: "Status" }]} />
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader><h2 className="text-base font-semibold">Issue Tracking Queue</h2></CardHeader>
            <CardContent>
              <DataTable data={jobsRows} columns={[{ accessorKey: "id", header: "Ticket ID" }, { accessorKey: "name", header: "Issue" }, { accessorKey: "type", header: "Type" }, { accessorKey: "priority", header: "Priority" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Created" }]} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "monitoring" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">API and Platform Health</h2></CardHeader>
            <CardContent>
              {monitoringHealthQuery.isLoading ? <LoadingState message="Loading health..." /> : null}
              {monitoringHealthQuery.isError ? <ErrorState message={extractErrorMessage(monitoringHealthQuery.error)} /> : null}
              {monitoringHealthQuery.data ? <pre className="max-h-56 overflow-auto text-xs">{JSON.stringify(monitoringHealthQuery.data, null, 2)}</pre> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Queue and Database Health</h2></CardHeader>
            <CardContent>
              {monitoringDashboardQuery.data ? <pre className="max-h-56 overflow-auto text-xs">{JSON.stringify(monitoringDashboardQuery.data, null, 2)}</pre> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Storage and Performance Metrics</h2></CardHeader>
            <CardContent>
              {monitoringMetricsQuery.data ? <pre className="max-h-56 overflow-auto text-xs">{JSON.stringify(monitoringMetricsQuery.data, null, 2)}</pre> : null}
            </CardContent>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader><h2 className="text-base font-semibold">Background Jobs and Runs</h2></CardHeader>
            <CardContent className="grid gap-3 xl:grid-cols-2">
              <DataTable data={jobsRows} columns={[{ accessorKey: "id", header: "Job" }, { accessorKey: "name", header: "Name" }, { accessorKey: "priority", header: "Priority" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Created" }]} />
              <DataTable data={runsRows} columns={[{ accessorKey: "id", header: "Run" }, { accessorKey: "name", header: "Name" }, { accessorKey: "status", header: "Status" }, { accessorKey: "duration", header: "Duration" }, { accessorKey: "createdAt", header: "Created" }]} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Global and Business Audit</h2></CardHeader>
            <CardContent>
              <DataTable data={auditRows} columns={[{ accessorKey: "id", header: "Audit ID" }, { accessorKey: "action", header: "Action" }, { accessorKey: "module", header: "Module" }, { accessorKey: "userId", header: "User" }, { accessorKey: "createdAt", header: "Time" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Admin Activity Audit</h2></CardHeader>
            <CardContent>
              <DataTable data={activityRows} columns={[{ accessorKey: "id", header: "Activity ID" }, { accessorKey: "action", header: "Action" }, { accessorKey: "module", header: "Module" }, { accessorKey: "userId", header: "User" }, { accessorKey: "createdAt", header: "Time" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Login History</h2></CardHeader>
            <CardContent>
              <DataTable data={loginRows} columns={[{ accessorKey: "id", header: "Log ID" }, { accessorKey: "email", header: "User" }, { accessorKey: "ipAddress", header: "IP" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Time" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Security Events</h2></CardHeader>
            <CardContent>
              <DataTable data={securityRows} columns={[{ accessorKey: "id", header: "Event" }, { accessorKey: "email", header: "Identity" }, { accessorKey: "ipAddress", header: "IP" }, { accessorKey: "reason", header: "Reason" }, { accessorKey: "createdAt", header: "Time" }]} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "feature-flags" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Module and Feature Flag Control</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-5">
              <Input placeholder="Feature Flag Key" value={flagKey} onChange={(event) => setFlagKey(event.target.value)} />
              <Select value={flagEnabled ? "ENABLED" : "DISABLED"} onChange={(event) => setFlagEnabled(event.target.value === "ENABLED")}>
                <option value="ENABLED">Enabled</option>
                <option value="DISABLED">Disabled</option>
              </Select>
              <Input placeholder="Module" value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} />
              <Select value={moduleEnabled ? "ENABLED" : "DISABLED"} onChange={(event) => setModuleEnabled(event.target.value === "ENABLED")}>
                <option value="ENABLED">Enabled</option>
                <option value="DISABLED">Disabled</option>
              </Select>
              <div className="flex gap-2">
                <Button onClick={() => updateFeatureFlagMutation.mutate()} disabled={updateFeatureFlagMutation.isPending}>Save Flag</Button>
                <Button variant="secondary" onClick={() => updateModuleMutation.mutate()} disabled={updateModuleMutation.isPending}>Save Module</Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <Button variant="outline" onClick={() => setModuleKey("RESTAURANT")}>Restaurant</Button>
              <Button variant="outline" onClick={() => setModuleKey("RETAIL")}>Retail</Button>
              <Button variant="outline" onClick={() => setModuleKey("MEDICAL")}>Medical</Button>
              <Button variant="outline" onClick={() => setModuleKey("WAREHOUSE")}>Warehouse</Button>
              <Button variant="outline" onClick={() => setModuleKey("MANUFACTURING")}>Manufacturing</Button>
              <Button variant="outline" onClick={() => setModuleKey("SALON")}>Salon</Button>
              <Button variant="outline" onClick={() => setModuleKey("GYM")}>Gym</Button>
              <Button variant="outline" onClick={() => setModuleKey("SERVICE_BUSINESS")}>Service Business</Button>
            </div>
            {updateFeatureFlagMutation.isError ? <ErrorState message={extractErrorMessage(updateFeatureFlagMutation.error)} /> : null}
            {updateModuleMutation.isError ? <ErrorState message={extractErrorMessage(updateModuleMutation.error)} /> : null}
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">
              {JSON.stringify({ featureFlags: (settingsQuery.data as Rec | undefined)?.featureFlags ?? {}, moduleToggles: (settingsQuery.data as Rec | undefined)?.moduleToggles ?? {} }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {tab === "global-settings" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Platform Provider and Environment Settings</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <Input placeholder="Email Provider" value={providerConfig.emailProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, emailProvider: event.target.value }))} />
              <Input placeholder="SMS Provider" value={providerConfig.smsProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, smsProvider: event.target.value }))} />
              <Input placeholder="Notification Provider" value={providerConfig.notificationProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, notificationProvider: event.target.value }))} />
              <Input placeholder="Storage Provider" value={providerConfig.storageProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, storageProvider: event.target.value }))} />
              <Input placeholder="Payment Provider" value={providerConfig.paymentProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, paymentProvider: event.target.value }))} />
              <Input placeholder="UPI Provider" value={providerConfig.upiProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, upiProvider: event.target.value }))} />
              <Input placeholder="Printer Provider" value={providerConfig.printerProvider} onChange={(event) => setProviderConfig((prev) => ({ ...prev, printerProvider: event.target.value }))} />
              <Input placeholder="Environment" value={providerConfig.envMode} onChange={(event) => setProviderConfig((prev) => ({ ...prev, envMode: event.target.value }))} />
            </div>
            <Button
              onClick={() =>
                updateSettingsMutation.mutate({
                  emailSettings: { provider: providerConfig.emailProvider },
                  smsSettings: { provider: providerConfig.smsProvider },
                  notificationSettings: { provider: providerConfig.notificationProvider },
                  fileStorageConfiguration: { provider: providerConfig.storageProvider },
                  thirdPartyIntegrations: {
                    paymentProvider: providerConfig.paymentProvider,
                    upiProvider: providerConfig.upiProvider,
                    printerProvider: providerConfig.printerProvider,
                    environment: providerConfig.envMode,
                  },
                  printerConfiguration: {
                    thermal80mm: { provider: providerConfig.printerProvider },
                  },
                })
              }
              disabled={updateSettingsMutation.isPending}
            >
              Save Global Settings
            </Button>
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(settingsQuery.data ?? {}, null, 2)}</pre>
          </CardContent>
        </Card>
      ) : null}

      {tab === "analytics" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Revenue, Subscriptions and Growth</h2></CardHeader>
            <CardContent className="space-y-2">
              <Kpi label="Revenue" value={kpis.revenue.toFixed(2)} />
              <Kpi label="MRR" value={kpis.mrr.toFixed(2)} />
              <Kpi label="ARR" value={kpis.arr.toFixed(2)} />
              <Kpi label="Subscription Count" value={kpis.activeSubscriptions} />
              <Kpi label="Customer Churn Signals" value={kpis.churnCount} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Platform Usage</h2></CardHeader>
            <CardContent>
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">
                {JSON.stringify({
                  dashboard: subscriptionsAnalyticsQuery.data ?? {},
                  growth: growthQuery.data ?? {},
                  revenueSeries: revenueQuery.data ?? [],
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader><h2 className="text-base font-semibold">Top Businesses (Branch Performance)</h2></CardHeader>
            <CardContent>
              <DataTable data={topBusinessesRows} columns={[{ accessorKey: "branchName", header: "Business/Branch" }, { accessorKey: "totalSales", header: "Revenue" }, { accessorKey: "invoiceCount", header: "Invoices" }, { accessorKey: "returns", header: "Returns" }]} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "security" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Security and Session Management</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-4">
              <Input placeholder="Session Timeout Minutes" value={securityConfig.sessionTimeoutMinutes} onChange={(event) => setSecurityConfig((prev) => ({ ...prev, sessionTimeoutMinutes: event.target.value }))} />
              <Input placeholder="Max Login Attempts" value={securityConfig.maxLoginAttempts} onChange={(event) => setSecurityConfig((prev) => ({ ...prev, maxLoginAttempts: event.target.value }))} />
              <Select value={securityConfig.mfaRequired} onChange={(event) => setSecurityConfig((prev) => ({ ...prev, mfaRequired: event.target.value }))}>
                <option value="true">MFA Required</option>
                <option value="false">MFA Optional</option>
              </Select>
              <Select value={securityConfig.tenantIsolationMode} onChange={(event) => setSecurityConfig((prev) => ({ ...prev, tenantIsolationMode: event.target.value }))}>
                <option value="strict">Strict Tenant Isolation</option>
                <option value="relaxed">Relaxed</option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  updateSettingsMutation.mutate({
                    sessionTimeoutMinutes: numeric(securityConfig.sessionTimeoutMinutes),
                    passwordPolicy: {
                      maxLoginAttempts: numeric(securityConfig.maxLoginAttempts),
                      mfaRequired: securityConfig.mfaRequired === "true",
                    },
                    securitySettings: {
                      tenantIsolation: securityConfig.tenantIsolationMode,
                      permissionValidation: true,
                    },
                  })
                }
                disabled={updateSettingsMutation.isPending}
              >
                Save Security Settings
              </Button>
              <Button
                variant="secondary"
                disabled={updateSettingsMutation.isPending}
                onClick={() =>
                  updateSettingsMutation.mutate({
                    securitySettings: {
                      impersonationRequest: {
                        requestedBy: user?.id ?? null,
                        requestedAt: new Date().toISOString(),
                        auditLogged: true,
                      },
                    },
                  })
                }
              >
                Request Impersonation (Audit Logged)
              </Button>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <DataTable data={loginRows} columns={[{ accessorKey: "id", header: "Session" }, { accessorKey: "email", header: "User" }, { accessorKey: "ipAddress", header: "IP" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Login Time" }]} />
              <DataTable data={securityRows} columns={[{ accessorKey: "id", header: "Event" }, { accessorKey: "email", header: "Identity" }, { accessorKey: "reason", header: "Security Event" }, { accessorKey: "createdAt", header: "Occurred" }]} />
            </div>
            <div className="rounded-md border border-slate-200 p-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              Tenant isolation and permission validation are enforced by backend guards and tenant validators on every secured endpoint.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!can("business.read") ? (
        <ErrorState message="Current role does not have platform administration read permissions." />
      ) : null}

      {supportQueueRows.length > 0 && tab !== "support-center" ? (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">Support Queue Snapshot</h2></CardHeader>
          <CardContent>
            <DataTable data={supportQueueRows.slice(0, 10)} columns={[{ accessorKey: "id", header: "Queue ID" }, { accessorKey: "channel", header: "Channel" }, { accessorKey: "eventType", header: "Event" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Created" }]} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </article>
  );
}
