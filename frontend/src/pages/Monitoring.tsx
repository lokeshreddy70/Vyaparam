import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";

function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown[] }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

export default function MonitoringPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("health");
  const [search, setSearch] = useState("");

  const healthQuery = useQuery({ queryKey: ["monitoring-health-c"], queryFn: async () => (await api.get("/monitoring/health")).data, refetchInterval: 20000 });
  const metricsQuery = useQuery({ queryKey: ["monitoring-metrics-c"], queryFn: async () => (await api.get("/monitoring/metrics")).data, refetchInterval: 20000 });
  const dashboardQuery = useQuery({ queryKey: ["monitoring-dashboard-c"], queryFn: async () => (await api.get("/monitoring/dashboard")).data, refetchInterval: 20000 });
  const jobsQuery = useQuery({ queryKey: ["monitoring-jobs-c"], queryFn: async () => (await api.get("/monitoring/jobs", { params: { page: 1, limit: 200 } })).data, refetchInterval: 15000 });
  const runsQuery = useQuery({ queryKey: ["monitoring-runs-c"], queryFn: async () => (await api.get("/monitoring/jobs/runs", { params: { page: 1, limit: 200 } })).data, refetchInterval: 15000 });
  const auditQuery = useQuery({ queryKey: ["monitoring-audit-c", search], queryFn: async () => (await api.get("/monitoring/logs/audit", { params: { page: 1, limit: 200, ...(search ? { q: search } : {}) } })).data });
  const activityQuery = useQuery({ queryKey: ["monitoring-activity-c", search], queryFn: async () => (await api.get("/monitoring/logs/activity", { params: { page: 1, limit: 200, ...(search ? { q: search } : {}) } })).data });

  const processNow = useMutation({ mutationFn: async () => api.post("/monitoring/jobs/process"), onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["monitoring-dashboard-c"] });
    qc.invalidateQueries({ queryKey: ["monitoring-jobs-c"] });
    qc.invalidateQueries({ queryKey: ["monitoring-runs-c"] });
  }});

  const jobs = rows(jobsQuery.data);
  const runs = rows(runsQuery.data);
  const audit = rows(auditQuery.data);
  const activity = rows(activityQuery.data);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "health", label: "System Health" },
          { key: "queue", label: "Queue Status" },
          { key: "jobs", label: "Background Jobs" },
          { key: "logs", label: "Logs and Audit" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {(tab === "health" || tab === "queue") ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Health</h2></CardHeader>
            <CardContent>
              {healthQuery.isLoading ? <LoadingState message="Loading health..." /> : null}
              {healthQuery.isError ? <ErrorState message={extractErrorMessage(healthQuery.error)} /> : null}
              {healthQuery.data ? <pre className="max-h-72 overflow-auto text-xs">{JSON.stringify(healthQuery.data, null, 2)}</pre> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Metrics</h2></CardHeader>
            <CardContent>
              {metricsQuery.data ? <pre className="max-h-72 overflow-auto text-xs">{JSON.stringify(metricsQuery.data, null, 2)}</pre> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Dashboard</h2></CardHeader>
            <CardContent className="space-y-2">
              {dashboardQuery.data ? <pre className="max-h-72 overflow-auto text-xs">{JSON.stringify(dashboardQuery.data, null, 2)}</pre> : null}
              <Button onClick={() => processNow.mutate()} disabled={processNow.isPending}>Process Queue Now</Button>
              {processNow.isError ? <ErrorState message={extractErrorMessage(processNow.error)} /> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "jobs" ? (
        <>
          <Card>
            <CardHeader><h1 className="text-lg font-semibold">Queued Jobs</h1></CardHeader>
            <CardContent>
              {jobsQuery.isLoading ? <LoadingState message="Loading jobs..." /> : null}
              {jobsQuery.isError ? <ErrorState message={extractErrorMessage(jobsQuery.error)} /> : null}
              {!jobsQuery.isLoading && !jobsQuery.isError && !jobs.length ? <EmptyState message="No queued jobs." /> : null}
              {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length ? (
                <DataTable data={jobs} columns={[{ accessorKey: "id", header: "Job ID" }, { accessorKey: "name", header: "Name" }, { accessorKey: "status", header: "Status" }, { accessorKey: "attempts", header: "Attempts" }, { accessorKey: "createdAt", header: "Created" }]} />
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Background Job Runs</h2></CardHeader>
            <CardContent>
              <DataTable data={runs} columns={[{ accessorKey: "id", header: "Run ID" }, { accessorKey: "name", header: "Name" }, { accessorKey: "status", header: "Status" }, { accessorKey: "duration", header: "Duration" }, { accessorKey: "createdAt", header: "Created" }]} />
            </CardContent>
          </Card>
        </>
      ) : null}

      {tab === "logs" ? (
        <>
          <Card>
            <CardHeader className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Log Filter</h2>
              <div className="ml-auto w-full md:w-72"><Input placeholder="Search audit/activity logs" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Audit Logs</h2></CardHeader>
            <CardContent>
              <DataTable data={audit} columns={[{ accessorKey: "id", header: "Log ID" }, { accessorKey: "action", header: "Action" }, { accessorKey: "module", header: "Module" }, { accessorKey: "userId", header: "User" }, { accessorKey: "createdAt", header: "Timestamp" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Activity Logs</h2></CardHeader>
            <CardContent>
              <DataTable data={activity} columns={[{ accessorKey: "id", header: "Log ID" }, { accessorKey: "action", header: "Action" }, { accessorKey: "module", header: "Module" }, { accessorKey: "userId", header: "User" }, { accessorKey: "createdAt", header: "Timestamp" }]} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
