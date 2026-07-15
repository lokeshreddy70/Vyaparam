import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { Card, CardContent, CardHeader } from "../components/ui/card";

type LogRecord = {
  id: string;
  action?: string;
  userId?: string;
  module?: string;
  createdAt?: string;
};

export default function AuditLogsPage() {
  const auditQuery = useQuery({
    queryKey: ["monitoring-audit-logs"],
    queryFn: async () => (await api.get<LogRecord[]>("/monitoring/logs/audit", { params: { page: 1, limit: 100 } })).data,
  });

  const activityQuery = useQuery({
    queryKey: ["monitoring-activity-logs"],
    queryFn: async () => (await api.get<LogRecord[]>("/monitoring/logs/activity", { params: { page: 1, limit: 100 } })).data,
  });

  const audit = Array.isArray(auditQuery.data)
    ? auditQuery.data
    : ((auditQuery.data as { items?: LogRecord[] } | undefined)?.items ?? []);
  const activity = Array.isArray(activityQuery.data)
    ? activityQuery.data
    : ((activityQuery.data as { items?: LogRecord[] } | undefined)?.items ?? []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Audit Trail</h1>
        </CardHeader>
        <CardContent>
          <DataTable
            data={audit}
            columns={[
              { accessorKey: "id", header: "Log ID" },
              { accessorKey: "action", header: "Action" },
              { accessorKey: "module", header: "Module" },
              { accessorKey: "userId", header: "User" },
              { accessorKey: "createdAt", header: "Timestamp" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Activity Logs</h2>
        </CardHeader>
        <CardContent>
          <DataTable
            data={activity}
            columns={[
              { accessorKey: "id", header: "Log ID" },
              { accessorKey: "action", header: "Action" },
              { accessorKey: "module", header: "Module" },
              { accessorKey: "userId", header: "User" },
              { accessorKey: "createdAt", header: "Timestamp" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
