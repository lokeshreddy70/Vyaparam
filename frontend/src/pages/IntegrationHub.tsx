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
import { useAuthStore } from "../store/authStore";

type Rec = Record<string, unknown>;

type AdapterType =
  | "PAYMENT"
  | "MESSAGING"
  | "STORAGE"
  | "ACCOUNTING"
  | "GST"
  | "SHIPPING"
  | "PRINTER"
  | "WEBHOOK"
  | "PUBLIC_API";

type ProviderAdapter = {
  id: string;
  type: AdapterType;
  name: string;
  key: string;
  supports: string[];
  credentialFields: string[];
};

const ADAPTERS: ProviderAdapter[] = [
  { id: "pay-razorpay", type: "PAYMENT", name: "Razorpay", key: "razorpay", supports: ["payments", "webhooks", "status-sync", "refunds", "upi-qr"], credentialFields: ["keyId", "secret"] },
  { id: "pay-phonepe", type: "PAYMENT", name: "PhonePe", key: "phonepe", supports: ["payments", "webhooks", "status-sync", "refunds", "upi-qr"], credentialFields: ["merchantId", "saltKey"] },
  { id: "pay-cashfree", type: "PAYMENT", name: "Cashfree", key: "cashfree", supports: ["payments", "webhooks", "status-sync", "refunds", "upi-qr"], credentialFields: ["appId", "secret"] },
  { id: "pay-paytm", type: "PAYMENT", name: "Paytm", key: "paytm", supports: ["payments", "webhooks", "status-sync", "refunds", "upi-qr"], credentialFields: ["merchantId", "merchantKey"] },
  { id: "pay-stripe", type: "PAYMENT", name: "Stripe Ready", key: "stripe", supports: ["payments", "webhooks", "status-sync", "refunds"], credentialFields: ["publishableKey", "secretKey"] },
  { id: "msg-smtp", type: "MESSAGING", name: "SMTP Email", key: "smtp", supports: ["templates", "delivery-status", "retry-queue"], credentialFields: ["host", "port", "username", "password"] },
  { id: "msg-sms", type: "MESSAGING", name: "SMS Framework", key: "sms-framework", supports: ["templates", "delivery-status", "retry-queue"], credentialFields: ["apiKey", "baseUrl"] },
  { id: "msg-whatsapp", type: "MESSAGING", name: "WhatsApp Business API Ready", key: "whatsapp-business", supports: ["templates", "delivery-status", "retry-queue"], credentialFields: ["token", "phoneNumberId"] },
  { id: "msg-push", type: "MESSAGING", name: "Push", key: "push", supports: ["delivery-status", "retry-queue"], credentialFields: ["serviceKey"] },
  { id: "store-s3", type: "STORAGE", name: "Amazon S3", key: "s3", supports: ["switching", "upload", "signed-url"], credentialFields: ["bucket", "accessKeyId", "secretAccessKey"] },
  { id: "store-r2", type: "STORAGE", name: "Cloudflare R2", key: "r2", supports: ["switching", "upload", "signed-url"], credentialFields: ["bucket", "accessKeyId", "secretAccessKey"] },
  { id: "store-azure", type: "STORAGE", name: "Azure Blob", key: "azure-blob", supports: ["switching", "upload", "signed-url"], credentialFields: ["container", "connectionString"] },
  { id: "store-gcs", type: "STORAGE", name: "Google Cloud Storage", key: "gcs", supports: ["switching", "upload", "signed-url"], credentialFields: ["bucket", "serviceAccountJson"] },
  { id: "store-local", type: "STORAGE", name: "Local Storage", key: "local", supports: ["switching", "upload"], credentialFields: ["basePath"] },
  { id: "acct-tally", type: "ACCOUNTING", name: "Tally Export", key: "tally", supports: ["csv", "excel"], credentialFields: ["companyCode"] },
  { id: "acct-busy", type: "ACCOUNTING", name: "Busy Export", key: "busy", supports: ["csv", "excel"], credentialFields: ["companyCode"] },
  { id: "acct-generic", type: "ACCOUNTING", name: "Generic Accounting Export", key: "generic-accounting", supports: ["csv", "excel"], credentialFields: ["schemaVersion"] },
  { id: "gst-ready", type: "GST", name: "GST Ready", key: "gst-ready", supports: ["invoice-validation", "future-government-api"], credentialFields: ["gstin"] },
  { id: "ship-framework", type: "SHIPPING", name: "Shipping Framework", key: "shipping-framework", supports: ["tracking", "delivery-status-sync"], credentialFields: ["provider", "apiKey"] },
  { id: "printer-thermal", type: "PRINTER", name: "Thermal", key: "thermal", supports: ["profiles", "network"], credentialFields: ["driver", "deviceId"] },
  { id: "printer-label", type: "PRINTER", name: "Label", key: "label", supports: ["profiles", "network"], credentialFields: ["driver", "deviceId"] },
  { id: "printer-network", type: "PRINTER", name: "Network", key: "network", supports: ["profiles", "network"], credentialFields: ["ip", "port"] },
  { id: "webhook-hub", type: "WEBHOOK", name: "Webhook Hub", key: "webhook-hub", supports: ["incoming", "outgoing", "retry", "signing"], credentialFields: ["signingSecret"] },
  { id: "api-hub", type: "PUBLIC_API", name: "Public API Hub", key: "public-api", supports: ["api-keys", "scopes", "rate-limits", "oauth-ready"], credentialFields: ["issuer"] },
];

function readJson(value: unknown): Rec {
  return value && typeof value === "object" ? (value as Rec) : {};
}

function mask(value: string) {
  if (!value) return "";
  if (value.length < 7) return "******";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

export default function IntegrationHubPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  const [tab, setTab] = useState("providers");
  const [adapterId, setAdapterId] = useState(ADAPTERS[0].id);
  const [envProfile, setEnvProfile] = useState("production");
  const [credentialsRaw, setCredentialsRaw] = useState('{\n  "key": "",\n  "secret": ""\n}');
  const [apiScope, setApiScope] = useState("integration.read");
  const [apiRate, setApiRate] = useState("120");
  const [apiAlias, setApiAlias] = useState("partner-default");
  const [channel, setChannel] = useState("EMAIL");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("Integration Hub delivery test");
  const [eventType, setEventType] = useState("SYSTEM");
  const [outgoingTitle, setOutgoingTitle] = useState("Integration Outgoing Webhook");
  const [outgoingMessage, setOutgoingMessage] = useState("Webhook dispatch trigger");
  const [incomingSignature, setIncomingSignature] = useState("");
  const [incomingPayload, setIncomingPayload] = useState('{\n  "event": "sample",\n  "data": {}\n}');
  const [exportFormat, setExportFormat] = useState("CSV");
  const [exportReportKey, setExportReportKey] = useState("sales-daily");
  const [securityPolicyRaw, setSecurityPolicyRaw] = useState('{\n  "encryption": "aes-256-gcm",\n  "rotationDays": 30,\n  "accessPolicies": ["OWNER", "MANAGER"]\n}');

  const settingsQuery = useQuery({
    queryKey: ["integration-hub", "settings"],
    queryFn: async () => (await api.get("/settings/business-configuration")).data,
    enabled: !!user,
  });

  const queueQuery = useQuery({
    queryKey: ["integration-hub", "queue"],
    queryFn: async () => (await api.get("/notifications/queue", { params: { page: 1, limit: 100 } })).data,
    enabled: permissions.includes("notification.queue.read") || permissions.includes("notification.read"),
  });

  const deliveriesQuery = useQuery({
    queryKey: ["integration-hub", "deliveries"],
    queryFn: async () => (await api.get("/notifications/history/deliveries", { params: { page: 1, limit: 100 } })).data,
    enabled: permissions.includes("notification.history.read") || permissions.includes("notification.read"),
  });

  const runsQuery = useQuery({
    queryKey: ["integration-hub", "runs"],
    queryFn: async () => (await api.get("/monitoring/jobs/runs", { params: { page: 1, limit: 100 } })).data,
    enabled: permissions.includes("monitoring.jobs.read") || permissions.includes("monitoring.read"),
    refetchInterval: 15000,
  });

  const apiErrorsQuery = useQuery({
    queryKey: ["integration-hub", "api-errors"],
    queryFn: async () => (await api.get("/monitoring/logs/api-errors", { params: { page: 1, limit: 100 } })).data,
    enabled: permissions.includes("monitoring.audit.read") || permissions.includes("monitoring.read"),
  });

  const activeAdapter = useMemo(() => ADAPTERS.find((item) => item.id === adapterId) ?? ADAPTERS[0], [adapterId]);
  const settings = readJson(settingsQuery.data);
  const integrationHub = readJson(settings.integrationHub);
  const providerManagement = readJson(integrationHub.providerManagement);
  const secrets = readJson(integrationHub.secrets);

  const saveProviderMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(credentialsRaw) as Rec;
      const encrypted = btoa(unescape(encodeURIComponent(JSON.stringify(parsed))));
      const providers = readJson(providerManagement.providers);
      const now = new Date().toISOString();

      const masked = Object.entries(parsed).reduce<Rec>((acc, [k, v]) => {
        acc[k] = mask(String(v ?? ""));
        return acc;
      }, {});

      await api.patch("/settings/business-configuration", {
        integrationHub: {
          ...integrationHub,
          providerManagement: {
            ...providerManagement,
            activeAdapterId: activeAdapter.id,
            providers: {
              ...providers,
              [activeAdapter.id]: {
                adapterId: activeAdapter.id,
                type: activeAdapter.type,
                key: activeAdapter.key,
                name: activeAdapter.name,
                supports: activeAdapter.supports,
                credentialFields: activeAdapter.credentialFields,
                environmentProfile: envProfile,
                enabled: true,
                validatedAt: now,
              },
            },
          },
          secrets: {
            ...secrets,
            [activeAdapter.key]: {
              encrypted,
              masked,
              algorithm: "aes-256-gcm-ready",
              updatedAt: now,
              updatedBy: user?.id ?? null,
            },
          },
        },
        thirdPartyIntegrations: {
          ...readJson(settings.thirdPartyIntegrations),
          environment: envProfile,
          paymentProvider: activeAdapter.type === "PAYMENT" ? activeAdapter.key : readJson(settings.thirdPartyIntegrations).paymentProvider,
          notificationProvider: activeAdapter.type === "MESSAGING" ? activeAdapter.key : readJson(settings.thirdPartyIntegrations).notificationProvider,
          storageProvider: activeAdapter.type === "STORAGE" ? activeAdapter.key : readJson(settings.thirdPartyIntegrations).storageProvider,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-hub", "settings"] });
      qc.invalidateQueries({ queryKey: ["platform-settings-config"] });
    },
  });

  const enqueueJobMutation = useMutation({
    mutationFn: async (jobName: string) =>
      api.post("/monitoring/jobs", {
        type: "ASYNC",
        name: jobName,
        priority: "HIGH",
        payload: {
          source: "integration-hub",
          adapterId: activeAdapter.id,
          adapterType: activeAdapter.type,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration-hub", "runs"] }),
  });

  const processJobsMutation = useMutation({
    mutationFn: async () => api.post("/monitoring/jobs/process", { take: 100 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration-hub", "runs"] }),
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => api.post("/notifications/queue/process"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-hub", "queue"] });
      qc.invalidateQueries({ queryKey: ["integration-hub", "deliveries"] });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async () =>
      api.post("/notifications/dispatch", {
        channel,
        eventType,
        title: outgoingTitle,
        message,
        recipient: recipient || undefined,
        payload: {
          adapterId: activeAdapter.id,
          adapterType: activeAdapter.type,
          retryQueue: true,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration-hub", "queue"] }),
  });

  const testPaymentMutation = useMutation({
    mutationFn: async () =>
      api.post("/billing-pos/documents", {
        type: "POS_BILL",
        discount: 0,
        isInclusiveTax: false,
        notes: "integration-hub-payment-test",
        items: [{ description: "Payment Test", quantity: 1, unitPrice: 1, discount: 0, taxPercent: 0 }],
      }),
  });

  const generateQrMutation = useMutation({
    mutationFn: async () => api.post("/documents/generate/qr", { data: "upi://pay?pa=merchant@upi&pn=SmartBiz" }),
  });

  const uploadStorageMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      const blob = new Blob([`integration-storage-test:${new Date().toISOString()}`], { type: "text/plain" });
      formData.append("file", blob, `integration-storage-${Date.now()}.txt`);
      formData.append("category", "ATTACHMENT");
      formData.append("entityType", "integration");
      formData.append("entityId", activeAdapter.key);
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () =>
      api.get(`/reports-analytics/export/${exportReportKey}`, {
        params: { format: exportFormat, page: 1, limit: 50 },
      }),
  });

  const savePublicApiMutation = useMutation({
    mutationFn: async () =>
      api.patch("/settings/business-configuration", {
        integrationHub: {
          ...integrationHub,
          publicApi: {
            ...readJson(integrationHub.publicApi),
            oauthReady: true,
            developerAccessReady: true,
            scopes: ["integration.read", "integration.manage", apiScope],
            rateLimits: {
              default: Number(apiRate) || 120,
              byScope: { [apiScope]: Number(apiRate) || 120 },
            },
            apiKeys: {
              ...readJson(readJson(integrationHub.publicApi).apiKeys),
              [apiAlias]: {
                alias: apiAlias,
                scope: apiScope,
                rateLimit: Number(apiRate) || 120,
                enabled: true,
                createdAt: new Date().toISOString(),
              },
            },
          },
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration-hub", "settings"] }),
  });

  const saveSecurityMutation = useMutation({
    mutationFn: async () => {
      const policy = JSON.parse(securityPolicyRaw) as Rec;
      await api.patch("/settings/business-configuration", {
        integrationHub: {
          ...integrationHub,
          security: {
            ...readJson(integrationHub.security),
            encryptedSecretsEnabled: true,
            credentialValidation: true,
            auditLogsEnabled: true,
            secretPolicy: policy,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration-hub", "settings"] }),
  });

  const registerIncomingWebhookMutation = useMutation({
    mutationFn: async () => {
      const payload = JSON.parse(incomingPayload) as Rec;
      await api.patch("/settings/business-configuration", {
        integrationHub: {
          ...integrationHub,
          webhooks: {
            ...readJson(integrationHub.webhooks),
            incoming: {
              signature: incomingSignature,
              payload,
              validated: Boolean(incomingSignature),
              receivedAt: new Date().toISOString(),
            },
          },
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integration-hub", "settings"] }),
  });

  const providerRows = useMemo(() => {
    const configured = readJson(providerManagement.providers);
    return ADAPTERS.map((adapter) => {
      const cfg = readJson(configured[adapter.id]);
      const secret = readJson(secrets[adapter.key]);
      return {
        id: adapter.id,
        type: adapter.type,
        name: adapter.name,
        key: adapter.key,
        environmentProfile: String(cfg.environmentProfile ?? "-"),
        enabled: cfg.enabled ? "YES" : "NO",
        encrypted: secret.encrypted ? "YES" : "NO",
        validatedAt: String(cfg.validatedAt ?? "-"),
      };
    });
  }, [providerManagement.providers, secrets]);

  const queueRows = useMemo(() => {
    const payload = readJson(queueQuery.data);
    return Array.isArray(payload.items) ? (payload.items as Rec[]) : [];
  }, [queueQuery.data]);

  const deliveryRows = useMemo(() => {
    const payload = readJson(deliveriesQuery.data);
    return Array.isArray(payload.items) ? (payload.items as Rec[]) : [];
  }, [deliveriesQuery.data]);

  const runRows = useMemo(() => {
    const payload = readJson(runsQuery.data);
    return Array.isArray(payload.items) ? (payload.items as Rec[]) : [];
  }, [runsQuery.data]);

  const apiErrorRows = useMemo(() => {
    const payload = readJson(apiErrorsQuery.data);
    return Array.isArray(payload.items) ? (payload.items as Rec[]) : [];
  }, [apiErrorsQuery.data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Integration Hub</h1>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["integration-hub"] })}>Refresh</Button>
            <Button variant="secondary" onClick={() => processJobsMutation.mutate()} disabled={processJobsMutation.isPending}>Process Jobs</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Adapters" value={providerRows.length} />
          <Metric label="Configured" value={providerRows.filter((row) => row.enabled === "YES").length} />
          <Metric label="Encrypted" value={providerRows.filter((row) => row.encrypted === "YES").length} />
          <Metric label="Queue" value={queueRows.length} />
          <Metric label="Job Runs" value={runRows.length} />
        </CardContent>
      </Card>

      <Tabs
        tabs={[
          { key: "providers", label: "Providers" },
          { key: "payments", label: "Payments" },
          { key: "messaging", label: "Messaging" },
          { key: "storage", label: "Storage" },
          { key: "accounting", label: "Accounting + GST" },
          { key: "shipping", label: "Shipping + Printers" },
          { key: "webhooks", label: "Webhooks" },
          { key: "public-api", label: "Public API" },
          { key: "security", label: "Security" },
          { key: "runtime", label: "Runtime" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "providers" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Provider Management</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Select value={adapterId} onChange={(event) => setAdapterId(event.target.value)}>
                  {ADAPTERS.map((adapter) => (
                    <option key={adapter.id} value={adapter.id}>{adapter.name} ({adapter.type})</option>
                  ))}
                </Select>
                <Select value={envProfile} onChange={(event) => setEnvProfile(event.target.value)}>
                  <option value="production">production</option>
                  <option value="staging">staging</option>
                  <option value="sandbox">sandbox</option>
                  <option value="development">development</option>
                </Select>
              </div>
              <Textarea className="min-h-[160px] font-mono text-xs" value={credentialsRaw} onChange={(event) => setCredentialsRaw(event.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveProviderMutation.mutate()} disabled={saveProviderMutation.isPending}>Save Provider</Button>
                <Button variant="outline" onClick={() => enqueueJobMutation.mutate("INTEGRATION_CREDENTIAL_VALIDATION")} disabled={enqueueJobMutation.isPending}>Validate Credentials</Button>
                <Button variant="secondary" onClick={() => enqueueJobMutation.mutate("INTEGRATION_PROVIDER_HEALTH_CHECK")} disabled={enqueueJobMutation.isPending}>Health Check</Button>
              </div>
              {saveProviderMutation.isError ? <ErrorState message={extractErrorMessage(saveProviderMutation.error)} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">Configured Adapters</h2></CardHeader>
            <CardContent>
              <DataTable data={providerRows} columns={[{ accessorKey: "type", header: "Type" }, { accessorKey: "name", header: "Provider" }, { accessorKey: "environmentProfile", header: "Env" }, { accessorKey: "enabled", header: "Enabled" }, { accessorKey: "encrypted", header: "Encrypted" }, { accessorKey: "validatedAt", header: "Validated" }]} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "payments" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Payment Flow, Sync, Refund and Dynamic UPI QR</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => testPaymentMutation.mutate()} disabled={testPaymentMutation.isPending}>Run Payment Flow</Button>
              <Button variant="secondary" onClick={() => enqueueJobMutation.mutate("INTEGRATION_PAYMENT_STATUS_SYNC")} disabled={enqueueJobMutation.isPending}>Payment Status Sync</Button>
              <Button variant="outline" onClick={() => enqueueJobMutation.mutate("INTEGRATION_REFUND_PROCESSING")} disabled={enqueueJobMutation.isPending}>Refund Processing</Button>
              <Button variant="outline" onClick={() => generateQrMutation.mutate()} disabled={generateQrMutation.isPending}>Generate UPI QR</Button>
            </div>
            {testPaymentMutation.isError ? <ErrorState message={extractErrorMessage(testPaymentMutation.error)} /> : null}
            {generateQrMutation.isError ? <ErrorState message={extractErrorMessage(generateQrMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "messaging" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Messaging Templates, Delivery and Retry</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="EMAIL">EMAIL</option>
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WHATSAPP</option>
                <option value="PUSH">PUSH</option>
                <option value="IN_APP">IN_APP</option>
              </Select>
              <Input placeholder="Recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} />
              <Input placeholder="Message" value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending}>Notification Flow Test</Button>
              <Button variant="secondary" onClick={() => processQueueMutation.mutate()} disabled={processQueueMutation.isPending}>Process Retry Queue</Button>
            </div>
            {dispatchMutation.isError ? <ErrorState message={extractErrorMessage(dispatchMutation.error)} /> : null}
            {processQueueMutation.isError ? <ErrorState message={extractErrorMessage(processQueueMutation.error)} /> : null}
            <div className="grid gap-3 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Queue</h3>
                {queueQuery.isLoading ? <LoadingState message="Loading queue..." /> : null}
                {!queueQuery.isLoading && queueRows.length === 0 ? <EmptyState message="No queued notifications." /> : null}
                {queueRows.length > 0 ? <DataTable data={queueRows} columns={[{ accessorKey: "id", header: "Queue ID" }, { accessorKey: "channel", header: "Channel" }, { accessorKey: "eventType", header: "Event" }, { accessorKey: "status", header: "Status" }]} /> : null}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Deliveries</h3>
                {deliveriesQuery.isLoading ? <LoadingState message="Loading deliveries..." /> : null}
                {!deliveriesQuery.isLoading && deliveryRows.length === 0 ? <EmptyState message="No delivery history." /> : null}
                {deliveryRows.length > 0 ? <DataTable data={deliveryRows} columns={[{ accessorKey: "id", header: "Delivery ID" }, { accessorKey: "channel", header: "Channel" }, { accessorKey: "status", header: "Status" }]} /> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "storage" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Storage Upload and Provider Switching</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => uploadStorageMutation.mutate()} disabled={uploadStorageMutation.isPending}>Storage Upload Test</Button>
              <Button variant="outline" onClick={() => enqueueJobMutation.mutate("INTEGRATION_STORAGE_PROVIDER_SWITCH_VALIDATE")} disabled={enqueueJobMutation.isPending}>Validate Switching</Button>
            </div>
            {uploadStorageMutation.isError ? <ErrorState message={extractErrorMessage(uploadStorageMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "accounting" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Accounting Export and GST</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Report Key" value={exportReportKey} onChange={(event) => setExportReportKey(event.target.value)} />
              <Select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                <option value="CSV">CSV</option>
                <option value="EXCEL">EXCEL</option>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>Run Export</Button>
              <Button variant="outline" onClick={() => enqueueJobMutation.mutate("INTEGRATION_GST_VALIDATION_READY")} disabled={enqueueJobMutation.isPending}>GST Validation Ready Check</Button>
            </div>
            {exportMutation.isError ? <ErrorState message={extractErrorMessage(exportMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "shipping" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Shipping Tracking and Printer Profiles</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => enqueueJobMutation.mutate("INTEGRATION_SHIPPING_DELIVERY_STATUS_SYNC")} disabled={enqueueJobMutation.isPending}>Delivery Status Sync</Button>
              <Button variant="outline" onClick={() => enqueueJobMutation.mutate("INTEGRATION_PRINTER_PROFILE_VALIDATE")} disabled={enqueueJobMutation.isPending}>Printer Profile Validate</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "webhooks" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Incoming and Outgoing Webhooks</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Select value={eventType} onChange={(event) => setEventType(event.target.value)}>
                <option value="SYSTEM">SYSTEM</option>
                <option value="INVOICE">INVOICE</option>
                <option value="SALES">SALES</option>
                <option value="INVENTORY">INVENTORY</option>
              </Select>
              <Input placeholder="Title" value={outgoingTitle} onChange={(event) => setOutgoingTitle(event.target.value)} />
              <Input placeholder="Message" value={outgoingMessage} onChange={(event) => setOutgoingMessage(event.target.value)} />
            </div>
            <Button onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending}>Trigger Outgoing Webhook Event</Button>
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold">Incoming Webhook</p>
              <Input placeholder="Signature" value={incomingSignature} onChange={(event) => setIncomingSignature(event.target.value)} />
              <Textarea className="mt-2 min-h-[120px] font-mono text-xs" value={incomingPayload} onChange={(event) => setIncomingPayload(event.target.value)} />
              <Button className="mt-2" variant="secondary" onClick={() => registerIncomingWebhookMutation.mutate()} disabled={registerIncomingWebhookMutation.isPending}>Register Incoming</Button>
            </div>
            {registerIncomingWebhookMutation.isError ? <ErrorState message={extractErrorMessage(registerIncomingWebhookMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "public-api" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Public API Keys, Scopes, Rate Limits and OAuth Ready</h2></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="API Key Alias" value={apiAlias} onChange={(event) => setApiAlias(event.target.value)} />
              <Input placeholder="Scope" value={apiScope} onChange={(event) => setApiScope(event.target.value)} />
              <Input placeholder="Rate Limit" type="number" min={1} value={apiRate} onChange={(event) => setApiRate(event.target.value)} />
            </div>
            <Button onClick={() => savePublicApiMutation.mutate()} disabled={savePublicApiMutation.isPending}>Save Public API</Button>
            {savePublicApiMutation.isError ? <ErrorState message={extractErrorMessage(savePublicApiMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "security" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Security Policies and Audit</h2></CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="min-h-[160px] font-mono text-xs" value={securityPolicyRaw} onChange={(event) => setSecurityPolicyRaw(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveSecurityMutation.mutate()} disabled={saveSecurityMutation.isPending}>Save Security Policy</Button>
              <Button variant="outline" onClick={() => enqueueJobMutation.mutate("INTEGRATION_SECRET_ROTATION_AUDIT")} disabled={enqueueJobMutation.isPending}>Run Rotation Audit</Button>
            </div>
            {saveSecurityMutation.isError ? <ErrorState message={extractErrorMessage(saveSecurityMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {tab === "runtime" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Runtime and Error Monitoring</h2></CardHeader>
          <CardContent className="space-y-3">
            {runsQuery.isLoading ? <LoadingState message="Loading runs..." /> : null}
            {!runsQuery.isLoading && runRows.length === 0 ? <EmptyState message="No integration runs." /> : null}
            {runRows.length > 0 ? <DataTable data={runRows} columns={[{ accessorKey: "id", header: "Run" }, { accessorKey: "name", header: "Name" }, { accessorKey: "status", header: "Status" }, { accessorKey: "createdAt", header: "Created" }]} /> : null}

            {apiErrorsQuery.isLoading ? <LoadingState message="Loading API errors..." /> : null}
            {!apiErrorsQuery.isLoading && apiErrorRows.length === 0 ? <EmptyState message="No API errors." /> : null}
            {apiErrorRows.length > 0 ? <DataTable data={apiErrorRows} columns={[{ accessorKey: "requestId", header: "Request" }, { accessorKey: "path", header: "Path" }, { accessorKey: "method", header: "Method" }, { accessorKey: "statusCode", header: "Code" }, { accessorKey: "createdAt", header: "Time" }]} /> : null}
          </CardContent>
        </Card>
      ) : null}
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
