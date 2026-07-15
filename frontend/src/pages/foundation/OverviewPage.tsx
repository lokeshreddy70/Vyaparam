import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Timeline } from "../../components/ui/timeline";

type HealthStatus = Record<string, unknown>;

export default function OverviewPage() {
  const healthQuery = useQuery({
    queryKey: ["foundation-health"],
    queryFn: async () => (await api.get<HealthStatus>("/monitoring/health")).data,
  });

  const permissionsQuery = useQuery({
    queryKey: ["foundation-permissions"],
    queryFn: async () => (await api.get<unknown[]>("/permissions")).data,
  });

  const permissions = Array.isArray(permissionsQuery.data)
    ? permissionsQuery.data
    : ((permissionsQuery.data as { items?: unknown[] } | undefined)?.items ?? []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Enterprise Admin Foundation</h1>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Runtime Health Snapshot</h2>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-900">
              {JSON.stringify(healthQuery.data ?? {}, null, 2)}
            </pre>
          </div>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Permission Matrix Loaded</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Total permissions from backend: {permissions.length}</p>
            <div className="mt-2 grid max-h-48 gap-1 overflow-auto text-xs">
              {permissions.slice(0, 30).map((item, index) => {
                const name = (item as { name?: string }).name ?? `permission-${index + 1}`;
                return (
                  <span key={`${name}-${index}`} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-900">
                    {name}
                  </span>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Foundation Delivery Timeline</h2>
        </CardHeader>
        <CardContent>
          <Timeline
            items={[
              { id: "arch", title: "Feature Based Architecture", description: "Shared types, hooks, utilities, and shell patterns." },
              { id: "auth", title: "Authentication Layer", description: "Login, forgot/reset password, refresh token, and session recovery." },
              { id: "shell", title: "Application Shell", description: "Responsive sidebar, header, search, profile, and notifications." },
              { id: "system", title: "System Routes", description: "403, 404, 500, offline, and maintenance handling." },
              { id: "ui", title: "Design System", description: "Reusable forms, dialogs, tables, charts, uploads, and feedback primitives." },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
