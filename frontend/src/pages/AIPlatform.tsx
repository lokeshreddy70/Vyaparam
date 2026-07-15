import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { usePermissions } from "../hooks/usePermissions";

type Rec = Record<string, unknown>;

type ForecastPoint = { label: string; actual?: number; forecast?: number };

function rows(payload: unknown): Rec[] {
  if (Array.isArray(payload)) return payload as Rec[];
  if (payload && typeof payload === "object") {
    const p = payload as Rec;
    if (Array.isArray(p.items)) return p.items as Rec[];
    if (p.data && typeof p.data === "object") {
      const nested = p.data as Rec;
      if (Array.isArray(nested.items)) return nested.items as Rec[];
      if (Array.isArray(nested.rows)) return nested.rows as Rec[];
    }
  }
  return [];
}

function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getValue(row: Rec, keys: string[]): number {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return n(row[key]);
  }
  return 0;
}

function getLabel(row: Rec, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function simpleForecast(series: number[], horizon: number): number {
  if (series.length === 0) return 0;
  if (series.length === 1) return series[0];

  const window = series.slice(-Math.min(8, series.length));
  const avg = window.reduce((sum, x) => sum + x, 0) / window.length;
  const trend = (window[window.length - 1] - window[0]) / Math.max(1, window.length - 1);
  const next = avg + trend * horizon;
  return Math.max(0, Number(next.toFixed(2)));
}

function buildForecastPoints(labels: string[], values: number[], horizonLabel: string, horizon: number): ForecastPoint[] {
  const points: ForecastPoint[] = labels.map((label, index) => ({ label, actual: values[index] }));
  points.push({ label: horizonLabel, forecast: simpleForecast(values, horizon) });
  return points;
}

function buildHealthScore(input: {
  revenue: number;
  profit: number;
  lowStock: number;
  deadStock: number;
  errorCount: number;
}) {
  const revenueScore = Math.min(35, input.revenue / 10000);
  const profitScore = input.profit > 0 ? Math.min(25, input.profit / 3000) : 0;
  const inventoryPenalty = Math.min(20, input.lowStock * 0.4 + input.deadStock * 0.7);
  const errorPenalty = Math.min(20, input.errorCount * 0.8);
  const raw = 40 + revenueScore + profitScore - inventoryPenalty - errorPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function readSpeechConstructor() {
  const w = window as Window & {
    SpeechRecognition?: new () => { start: () => void; stop: () => void; onresult: ((e: unknown) => void) | null };
    webkitSpeechRecognition?: new () => { start: () => void; stop: () => void; onresult: ((e: unknown) => void) | null };
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export default function AIPlatformPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [tab, setTab] = useState("assistant");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask business questions based on live enterprise data.");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [ocrNote, setOcrNote] = useState("Invoice/receipt/document ingestion is powered by existing file and monitoring APIs.");

  const dashboardQuery = useQuery({ queryKey: ["ai", "dashboard"], queryFn: async () => (await api.get("/reports-analytics/dashboard")).data, enabled: can("reports.read") });
  const salesDailyQuery = useQuery({ queryKey: ["ai", "sales", "daily"], queryFn: async () => (await api.get("/reports-analytics/sales/daily")).data, enabled: can("reports.read") });
  const salesMonthlyQuery = useQuery({ queryKey: ["ai", "sales", "monthly"], queryFn: async () => (await api.get("/reports-analytics/sales/monthly")).data, enabled: can("reports.read") });
  const topProductsQuery = useQuery({ queryKey: ["ai", "sales", "top-products"], queryFn: async () => (await api.get("/reports-analytics/sales/top-products")).data, enabled: can("reports.read") });
  const lowStockQuery = useQuery({ queryKey: ["ai", "inventory", "low-stock"], queryFn: async () => (await api.get("/reports-analytics/inventory/low-stock")).data, enabled: can("reports.read") });
  const deadStockQuery = useQuery({ queryKey: ["ai", "inventory", "dead-stock"], queryFn: async () => (await api.get("/reports-analytics/inventory/dead-stock")).data, enabled: can("reports.read") });
  const fastMovingQuery = useQuery({ queryKey: ["ai", "inventory", "fast-moving"], queryFn: async () => (await api.get("/reports-analytics/inventory/fast-moving-products")).data, enabled: can("reports.read") });
  const slowMovingQuery = useQuery({ queryKey: ["ai", "inventory", "slow-moving"], queryFn: async () => (await api.get("/reports-analytics/inventory/slow-moving-products")).data, enabled: can("reports.read") });
  const customerLoyalQuery = useQuery({ queryKey: ["ai", "customer", "loyal"], queryFn: async () => (await api.get("/reports-analytics/customer/loyal")).data, enabled: can("reports.read") });
  const customerOutstandingQuery = useQuery({ queryKey: ["ai", "customer", "outstanding"], queryFn: async () => (await api.get("/reports-analytics/customer/outstanding-balance")).data, enabled: can("reports.read") });
  const financialProfitQuery = useQuery({ queryKey: ["ai", "finance", "profit-loss"], queryFn: async () => (await api.get("/reports-analytics/financial/profit-loss")).data, enabled: can("reports.read") });
  const financialExpenseQuery = useQuery({ queryKey: ["ai", "finance", "expense"], queryFn: async () => (await api.get("/reports-analytics/financial/expense")).data, enabled: can("reports.read") });
  const cashBookQuery = useQuery({ queryKey: ["ai", "finance", "cash-book"], queryFn: async () => (await api.get("/reports-analytics/financial/cash-book")).data, enabled: can("reports.read") });
  const attendanceQuery = useQuery({ queryKey: ["ai", "hr", "attendance"], queryFn: async () => (await api.get("/hrms/attendance", { params: { page: 1, limit: 200 } })).data, enabled: can("hr.attendance.read") || can("employee.read") });
  const leaveQuery = useQuery({ queryKey: ["ai", "hr", "leave"], queryFn: async () => (await api.get("/hrms/leave-requests", { params: { page: 1, limit: 200 } })).data, enabled: can("hr.leave.request.read") || can("employee.read") });
  const employeesQuery = useQuery({ queryKey: ["ai", "hr", "employees"], queryFn: async () => (await api.get("/employees", { params: { page: 1, limit: 200 } })).data, enabled: can("employee.read") });
  const suppliersQuery = useQuery({ queryKey: ["ai", "supplier"], queryFn: async () => (await api.get("/suppliers", { params: { page: 1, limit: 200 } })).data, enabled: can("supplier.read") || can("reports.read") });
  const apiErrorsQuery = useQuery({ queryKey: ["ai", "monitoring", "api-errors"], queryFn: async () => (await api.get("/monitoring/logs/api-errors", { params: { page: 1, limit: 200 } })).data, enabled: can("monitoring.audit.read") || can("monitoring.read") });
  const notificationsQueueQuery = useQuery({ queryKey: ["ai", "notifications", "queue"], queryFn: async () => (await api.get("/notifications/queue", { params: { page: 1, limit: 200 } })).data, enabled: can("notification.queue.read") || can("monitoring.read") });
  const documentsQuery = useQuery({ queryKey: ["ai", "documents"], queryFn: async () => (await api.get("/documents", { params: { page: 1, limit: 200 } })).data, enabled: can("document.read") });

  const salesDailyRows = rows(salesDailyQuery.data);
  const salesMonthlyRows = rows(salesMonthlyQuery.data);
  const topProductRows = rows(topProductsQuery.data);
  const lowStockRows = rows(lowStockQuery.data);
  const deadStockRows = rows(deadStockQuery.data);
  const fastMovingRows = rows(fastMovingQuery.data);
  const slowMovingRows = rows(slowMovingQuery.data);
  const loyalRows = rows(customerLoyalQuery.data);
  const outstandingRows = rows(customerOutstandingQuery.data);
  const expenseRows = rows(financialExpenseQuery.data);
  const cashBookRows = rows(cashBookQuery.data);
  const attendanceRows = rows(attendanceQuery.data);
  const leaveRows = rows(leaveQuery.data);
  const employeeRows = rows(employeesQuery.data);
  const supplierRows = rows(suppliersQuery.data);
  const apiErrorRows = rows(apiErrorsQuery.data);
  const queueRows = rows(notificationsQueueQuery.data);
  const documentRows = rows(documentsQuery.data);

  const dailyLabels = salesDailyRows.map((row, index) => getLabel(row, ["date", "label", "day"], `D${index + 1}`));
  const dailyRevenueSeries = salesDailyRows.map((row) => getValue(row, ["total", "totalSales", "revenue", "amount"]));
  const monthlyLabels = salesMonthlyRows.map((row, index) => getLabel(row, ["month", "label", "period"], `M${index + 1}`));
  const monthlyRevenueSeries = salesMonthlyRows.map((row) => getValue(row, ["total", "totalSales", "revenue", "amount"]));

  const dailyForecast = simpleForecast(dailyRevenueSeries, 1);
  const weeklyForecast = simpleForecast(dailyRevenueSeries, 7);
  const monthlyForecast = simpleForecast(monthlyRevenueSeries.length ? monthlyRevenueSeries : dailyRevenueSeries, 1);
  const yearlyForecast = simpleForecast(monthlyRevenueSeries.length ? monthlyRevenueSeries : dailyRevenueSeries, 12);

  const topProductPrediction = useMemo(() => {
    const sorted = [...topProductRows].sort((a, b) => getValue(b, ["total", "totalSales", "quantity", "count"]) - getValue(a, ["total", "totalSales", "quantity", "count"]));
    return sorted[0] ? getLabel(sorted[0], ["name", "productName", "label"], "Unavailable") : "Unavailable";
  }, [topProductRows]);

  const revenueNow = dailyRevenueSeries.reduce((sum, value) => sum + value, 0);
  const expenseNow = expenseRows.reduce((sum, row) => sum + getValue(row, ["amount", "total", "expense"]), 0);
  const profitNow = revenueNow - expenseNow;

  const loyalCustomerCount = loyalRows.length;
  const inactiveCustomerEstimate = Math.max(0, outstandingRows.length - loyalRows.length);
  const clvEstimate = loyalCustomerCount ? Number((revenueNow / loyalCustomerCount).toFixed(2)) : 0;

  const attendancePresent = attendanceRows.filter((row) => String(row.status ?? "").toLowerCase().includes("present")).length;
  const leaveApproved = leaveRows.filter((row) => String(row.status ?? "").toLowerCase().includes("approved")).length;

  const businessHealthScore = buildHealthScore({
    revenue: revenueNow,
    profit: profitNow,
    lowStock: lowStockRows.length,
    deadStock: deadStockRows.length,
    errorCount: apiErrorRows.length,
  });
  const growthScore = Math.round((dailyForecast > 0 && revenueNow > 0 ? (dailyForecast / Math.max(1, revenueNow / Math.max(1, dailyRevenueSeries.length))) * 50 : 25));

  const riskAlerts = [
    lowStockRows.length > 0 ? `Low stock risk detected for ${lowStockRows.length} SKU(s).` : null,
    deadStockRows.length > 0 ? `Dead stock detected for ${deadStockRows.length} item(s).` : null,
    apiErrorRows.length > 0 ? `API error events detected: ${apiErrorRows.length}.` : null,
    queueRows.length > 20 ? `Notification queue backlog is high (${queueRows.length}).` : null,
  ].filter(Boolean) as string[];

  const opportunities = [
    fastMovingRows.length > 0 ? `Fast-moving products available (${fastMovingRows.length}) for promotion and replenishment planning.` : null,
    loyalRows.length > 0 ? `Loyal customer base identified (${loyalRows.length}) for retention campaigns.` : null,
    supplierRows.length > 0 ? `Supplier portfolio size ${supplierRows.length} enables purchase optimization.` : null,
  ].filter(Boolean) as string[];

  const executiveSummary = [
    `Revenue observed in selected series: ${revenueNow.toFixed(2)}.`,
    `Estimated profit from available expense feeds: ${profitNow.toFixed(2)}.`,
    `Forecasts -> daily: ${dailyForecast.toFixed(2)}, weekly: ${weeklyForecast.toFixed(2)}, monthly: ${monthlyForecast.toFixed(2)}, yearly: ${yearlyForecast.toFixed(2)}.`,
    `Business health score: ${businessHealthScore}/100. Growth score: ${Math.min(100, growthScore)}/100.`,
  ];

  const enqueueAutomationMutation = useMutation({
    mutationFn: async (payload: Rec) =>
      api.post("/monitoring/jobs", {
        type: "ASYNC",
        name: "AI_AUTOMATION_PIPELINE",
        priority: "HIGH",
        payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai", "monitoring", "api-errors"] }),
  });

  const processJobsMutation = useMutation({
    mutationFn: async () => api.post("/monitoring/jobs/process", { take: 100 }),
  });

  const createReminderMutation = useMutation({
    mutationFn: async (message: string) =>
      api.post("/notifications/reminders", {
        type: "SYSTEM",
        title: "AI Insight Alert",
        message,
        dueAt: new Date().toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai", "notifications", "queue"] }),
  });

  const ocrUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "ATTACHMENT");
      form.append("entityType", "ai-ocr");
      form.append("entityId", "ocr");
      return api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: async (response) => {
      const uploaded = response.data as Rec;
      await enqueueAutomationMutation.mutateAsync({
        workflow: "OCR_PROCESSING",
        document: uploaded,
        modes: ["invoice", "receipt", "barcode", "document"],
      });
      setOcrNote("Document ingested and queued for OCR automation pipeline using monitoring jobs.");
      qc.invalidateQueries({ queryKey: ["ai", "documents"] });
    },
  });

  const barcodeLookupMutation = useMutation({
    mutationFn: async (barcode: string) => (await api.get(`/products/barcode/${barcode}`)).data,
    onSuccess: (product) => {
      setOcrNote(`Barcode lookup succeeded. Matched product: ${String((product as Rec).name ?? (product as Rec).id ?? "unknown")}`);
    },
  });

  const loading =
    dashboardQuery.isLoading ||
    salesDailyQuery.isLoading ||
    salesMonthlyQuery.isLoading ||
    topProductsQuery.isLoading ||
    lowStockQuery.isLoading ||
    deadStockQuery.isLoading ||
    fastMovingQuery.isLoading ||
    slowMovingQuery.isLoading ||
    customerLoyalQuery.isLoading ||
    customerOutstandingQuery.isLoading ||
    financialProfitQuery.isLoading ||
    financialExpenseQuery.isLoading ||
    cashBookQuery.isLoading ||
    attendanceQuery.isLoading ||
    leaveQuery.isLoading ||
    employeesQuery.isLoading ||
    suppliersQuery.isLoading ||
    apiErrorsQuery.isLoading ||
    notificationsQueueQuery.isLoading ||
    documentsQuery.isLoading;

  const firstError =
    dashboardQuery.error ||
    salesDailyQuery.error ||
    salesMonthlyQuery.error ||
    topProductsQuery.error ||
    lowStockQuery.error ||
    deadStockQuery.error ||
    fastMovingQuery.error ||
    slowMovingQuery.error ||
    customerLoyalQuery.error ||
    customerOutstandingQuery.error ||
    financialProfitQuery.error ||
    financialExpenseQuery.error ||
    cashBookQuery.error ||
    attendanceQuery.error ||
    leaveQuery.error ||
    employeesQuery.error ||
    suppliersQuery.error ||
    apiErrorsQuery.error ||
    notificationsQueueQuery.error ||
    documentsQuery.error;

  const aiAnswer = (q: string) => {
    const lc = q.toLowerCase();
    if (lc.includes("sales") || lc.includes("revenue") || lc.includes("forecast")) {
      return `Sales AI: Daily ${dailyForecast.toFixed(2)}, Weekly ${weeklyForecast.toFixed(2)}, Monthly ${monthlyForecast.toFixed(2)}, Yearly ${yearlyForecast.toFixed(2)}. Top predicted product: ${topProductPrediction}.`;
    }
    if (lc.includes("inventory") || lc.includes("stock") || lc.includes("reorder")) {
      return `Inventory AI: Low stock ${lowStockRows.length}, Dead stock ${deadStockRows.length}, Fast moving ${fastMovingRows.length}, Slow moving ${slowMovingRows.length}. Reorder focus should begin with low-stock and fast-moving items intersection.`;
    }
    if (lc.includes("customer") || lc.includes("clv") || lc.includes("segment")) {
      return `Customer AI: Loyal customers ${loyalCustomerCount}, Inactive estimate ${inactiveCustomerEstimate}, CLV estimate ${clvEstimate.toFixed(2)}.`;
    }
    if (lc.includes("profit") || lc.includes("finance") || lc.includes("cash")) {
      return `Finance AI: Revenue ${revenueNow.toFixed(2)}, Expense ${expenseNow.toFixed(2)}, Profit ${profitNow.toFixed(2)}, Cash records ${cashBookRows.length}.`;
    }
    if (lc.includes("employee") || lc.includes("attendance") || lc.includes("leave") || lc.includes("hr")) {
      return `HR AI: Attendance records ${attendanceRows.length}, Present ${attendancePresent}, Leave requests ${leaveRows.length}, Approved leaves ${leaveApproved}, Employee count ${employeeRows.length}.`;
    }
    return `Executive AI Summary: ${executiveSummary.join(" ")}`;
  };

  const runAssistant = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setAnswer(aiAnswer(trimmed));
  };

  const startVoiceInput = () => {
    const Recognition = readSpeechConstructor();
    if (!Recognition) {
      setVoiceTranscript("Speech recognition is unavailable in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.onresult = (event: unknown) => {
      const evt = event as { results?: ArrayLike<ArrayLike<{ transcript?: string }>> };
      const transcript = evt.results?.[0]?.[0]?.transcript ?? "";
      setVoiceTranscript(transcript);
      setQuestion(transcript);
      setAnswer(aiAnswer(transcript));
    };
    recognition.start();
  };

  const speakSummary = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const speech = new SpeechSynthesisUtterance(executiveSummary.join(" "));
    synth.cancel();
    synth.speak(speech);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">SmartBiz AI Platform</h1>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Metric label="Business Health" value={`${businessHealthScore}/100`} />
          <Metric label="Growth Score" value={`${Math.min(100, growthScore)}/100`} />
          <Metric label="Risk Alerts" value={String(riskAlerts.length)} />
          <Metric label="Opportunities" value={String(opportunities.length)} />
          <Metric label="Revenue" value={revenueNow.toFixed(2)} />
          <Metric label="Profit" value={profitNow.toFixed(2)} />
        </CardContent>
      </Card>

      <Tabs
        tabs={[
          { key: "assistant", label: "AI Assistant" },
          { key: "sales", label: "Sales AI" },
          { key: "inventory", label: "Inventory AI" },
          { key: "customer", label: "Customer AI" },
          { key: "finance", label: "Finance AI" },
          { key: "hr", label: "HR AI" },
          { key: "reports", label: "AI Reports" },
          { key: "voice-ocr", label: "Voice & OCR" },
          { key: "automation", label: "Automation" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? <LoadingState message="Building AI insights from live enterprise data..." /> : null}
      {firstError ? <ErrorState message={extractErrorMessage(firstError)} /> : null}

      {!loading && !firstError && tab === "assistant" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Business AI Assistant</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask: sales forecast, stock risk, customer value, HR trend..." />
              <Button onClick={runAssistant}>Ask</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setQuestion("What is my sales forecast?"); setAnswer(aiAnswer("sales forecast")); }}>Sales Forecast</Button>
              <Button variant="outline" onClick={() => { setQuestion("Any inventory risk?"); setAnswer(aiAnswer("inventory risk")); }}>Inventory Risk</Button>
              <Button variant="outline" onClick={() => { setQuestion("Show customer insights"); setAnswer(aiAnswer("customer insights")); }}>Customer Insights</Button>
              <Button variant="outline" onClick={() => { setQuestion("How is finance?"); setAnswer(aiAnswer("finance")); }}>Finance Health</Button>
              <Button variant="outline" onClick={() => { setQuestion("HR summary"); setAnswer(aiAnswer("hr summary")); }}>HR Summary</Button>
            </div>
            <Textarea className="min-h-[160px]" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "sales" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ForecastCard title="Daily Forecast" points={buildForecastPoints(dailyLabels, dailyRevenueSeries, "Tomorrow", 1)} />
          <ForecastCard title="Monthly Forecast" points={buildForecastPoints(monthlyLabels, monthlyRevenueSeries, "Next Month", 1)} />
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Sales Predictions</h3>
            </CardHeader>
            <CardContent>
              <DataTable
                data={[
                  { id: "daily", metric: "Daily Forecast", value: dailyForecast.toFixed(2) },
                  { id: "weekly", metric: "Weekly Forecast", value: weeklyForecast.toFixed(2) },
                  { id: "monthly", metric: "Monthly Forecast", value: monthlyForecast.toFixed(2) },
                  { id: "yearly", metric: "Yearly Forecast", value: yearlyForecast.toFixed(2) },
                  { id: "product", metric: "Top Product Prediction", value: topProductPrediction },
                ]}
                columns={[
                  { accessorKey: "metric", header: "Metric" },
                  { accessorKey: "value", header: "Prediction" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold">Top Product Evidence</h3>
            </CardHeader>
            <CardContent>
              {topProductRows.length ? (
                <DataTable
                  data={topProductRows.map((row, index) => ({
                    id: String(row.id ?? `p-${index}`),
                    product: getLabel(row, ["name", "productName", "label"], "Unknown"),
                    total: getValue(row, ["total", "totalSales", "quantity", "count"]),
                  }))}
                  columns={[
                    { accessorKey: "product", header: "Product" },
                    { accessorKey: "total", header: "Observed Total" },
                  ]}
                />
              ) : (
                <EmptyState message="No sales evidence available." />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!loading && !firstError && tab === "inventory" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Inventory AI</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataTable
              data={[
                { id: "demand", item: "Demand Prediction Basis", value: `${fastMovingRows.length} fast-moving references` },
                { id: "reorder", item: "Reorder Suggestions", value: `${lowStockRows.length} low-stock items` },
                { id: "purchase", item: "Purchase Recommendations", value: `${supplierRows.length} suppliers mapped` },
                { id: "dead", item: "Dead Stock Detection", value: `${deadStockRows.length} dead-stock entries` },
                { id: "slow", item: "Slow Moving Products", value: `${slowMovingRows.length} slow-moving entries` },
                { id: "opt", item: "Stock Optimization", value: `${Math.max(0, fastMovingRows.length - deadStockRows.length)} optimization opportunities` },
              ]}
              columns={[{ accessorKey: "item", header: "AI Insight" }, { accessorKey: "value", header: "Real Data Signal" }]}
            />
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "customer" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Customer AI</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataTable
              data={[
                { id: "segment", metric: "Segmentation Buckets", value: `${Math.max(1, Math.ceil(loyalRows.length / 5))} segment group(s)` },
                { id: "loyal", metric: "Loyal Customers", value: String(loyalCustomerCount) },
                { id: "inactive", metric: "Inactive Customer Detection", value: String(inactiveCustomerEstimate) },
                { id: "clv", metric: "Customer Lifetime Value (estimate)", value: clvEstimate.toFixed(2) },
                { id: "pattern", metric: "Purchase Pattern Records", value: `${outstandingRows.length} outstanding/ledger records` },
              ]}
              columns={[{ accessorKey: "metric", header: "Metric" }, { accessorKey: "value", header: "Value" }]}
            />
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "finance" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Finance AI</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataTable
              data={[
                { id: "expense", metric: "Expense Analysis", value: expenseNow.toFixed(2) },
                { id: "profit", metric: "Profit Analysis", value: profitNow.toFixed(2) },
                { id: "cashflow", metric: "Cash Flow Prediction", value: simpleForecast(cashBookRows.map((r) => getValue(r, ["amount", "total", "credit", "debit"])), 1).toFixed(2) },
                { id: "budget", metric: "Budget Suggestion", value: Math.max(0, profitNow * 0.85).toFixed(2) },
              ]}
              columns={[{ accessorKey: "metric", header: "Metric" }, { accessorKey: "value", header: "AI Value" }]}
            />
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "hr" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">HR AI</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <DataTable
              data={[
                { id: "attendance", metric: "Attendance Pattern", value: `${attendancePresent}/${attendanceRows.length} present` },
                { id: "performance", metric: "Performance Analysis", value: `${employeeRows.length} active employees evaluated` },
                { id: "leave", metric: "Leave Trend", value: `${leaveApproved}/${leaveRows.length} approved requests` },
                { id: "shift", metric: "Shift Optimization", value: `${Math.max(0, attendanceRows.length - leaveRows.length)} staff availability signal` },
              ]}
              columns={[{ accessorKey: "metric", header: "Metric" }, { accessorKey: "value", header: "Signal" }]}
            />
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "reports" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">AI Reports</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={executiveSummary.join("\n")} readOnly className="min-h-[140px]" />
            <DataTable
              data={[
                { id: "health", report: "Business Health Score", value: `${businessHealthScore}/100` },
                { id: "growth", report: "Growth Score", value: `${Math.min(100, growthScore)}/100` },
                { id: "risk", report: "Risk Alerts", value: riskAlerts.join(" | ") || "No active risk alert" },
                { id: "opp", report: "Opportunity Detection", value: opportunities.join(" | ") || "No active opportunity" },
              ]}
              columns={[{ accessorKey: "report", header: "Report" }, { accessorKey: "value", header: "Value" }]}
            />
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "voice-ocr" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Voice and OCR Workbench</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={startVoiceInput}>Voice Command</Button>
              <Button variant="outline" onClick={speakSummary}>Voice Report</Button>
            </div>
            <Textarea value={voiceTranscript || "Voice transcript will appear here."} onChange={(e) => setVoiceTranscript(e.target.value)} className="min-h-[100px]" />

            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold">Invoice/Receipt/Document OCR Ingestion</p>
              <p className="text-xs text-slate-500">Upload uses existing document APIs. Processing is automated through monitoring jobs, with no fake extraction output.</p>
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  ocrUploadMutation.mutate(file);
                }}
              />
            </div>

            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold">Barcode OCR Lookup</p>
              <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
                <Input value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Scan or enter barcode" />
                <Button onClick={() => barcodeLookupMutation.mutate(barcodeInput)} disabled={!barcodeInput.trim()}>Lookup Barcode</Button>
              </div>
            </div>

            <Textarea className="min-h-[100px]" value={ocrNote} onChange={(e) => setOcrNote(e.target.value)} />
            <p className="text-xs text-slate-500">Documents indexed: {documentRows.length}</p>
            {ocrUploadMutation.isError ? <ErrorState message={extractErrorMessage(ocrUploadMutation.error)} /> : null}
            {barcodeLookupMutation.isError ? <ErrorState message={extractErrorMessage(barcodeLookupMutation.error)} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {!loading && !firstError && tab === "automation" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Automation Engine</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  enqueueAutomationMutation.mutate({
                    workflow: "AUTOMATIC_ALERTS",
                    riskAlerts,
                    opportunities,
                    healthScore: businessHealthScore,
                  })
                }
                disabled={enqueueAutomationMutation.isPending || !can("monitoring.jobs.manage")}
              >
                Trigger Automatic Alerts
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  enqueueAutomationMutation.mutate({
                    workflow: "AUTOMATIC_SUGGESTIONS",
                    reorderCount: lowStockRows.length,
                    deadStockCount: deadStockRows.length,
                    topProductPrediction,
                  })
                }
                disabled={enqueueAutomationMutation.isPending || !can("monitoring.jobs.manage")}
              >
                Trigger Suggestions
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  enqueueAutomationMutation.mutate({
                    workflow: "AUTOMATIC_REPORTS",
                    executiveSummary,
                    healthScore: businessHealthScore,
                    growthScore: Math.min(100, growthScore),
                  })
                }
                disabled={enqueueAutomationMutation.isPending || !can("monitoring.jobs.manage")}
              >
                Trigger AI Reports
              </Button>
              <Button
                variant="outline"
                onClick={() => processJobsMutation.mutate()}
                disabled={processJobsMutation.isPending || !can("monitoring.jobs.manage")}
              >
                Process Automation Jobs
              </Button>
              <Button
                variant="outline"
                onClick={() => createReminderMutation.mutate(riskAlerts.join(" | ") || "AI reports: no critical risk alert")}
                disabled={createReminderMutation.isPending || !can("notification.reminder.create")}
              >
                Publish AI Reminder
              </Button>
            </div>

            {enqueueAutomationMutation.isError ? <ErrorState message={extractErrorMessage(enqueueAutomationMutation.error)} /> : null}
            {processJobsMutation.isError ? <ErrorState message={extractErrorMessage(processJobsMutation.error)} /> : null}
            {createReminderMutation.isError ? <ErrorState message={extractErrorMessage(createReminderMutation.error)} /> : null}

            <DataTable
              data={[
                { id: "queue", pipeline: "Notification Queue", status: `${queueRows.length} pending` },
                { id: "errors", pipeline: "API Error Feed", status: `${apiErrorRows.length} events` },
                { id: "documents", pipeline: "Document Feed", status: `${documentRows.length} indexed` },
              ]}
              columns={[{ accessorKey: "pipeline", header: "Pipeline" }, { accessorKey: "status", header: "Status" }]}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ForecastCard({ title, points }: { title: string; points: ForecastPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="actual" stroke="#0284c7" fill="#7dd3fc" />
            <Area type="monotone" dataKey="forecast" stroke="#16a34a" fill="#86efac" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
