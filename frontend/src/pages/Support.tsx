import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";

type Row = Record<string, unknown>;

function rows(payload: unknown): Row[] {
  if (Array.isArray(payload)) return payload as Row[];
  if (payload && typeof payload === "object") {
    const value = payload as { items?: unknown[]; data?: unknown[] };
    if (Array.isArray(value.items)) return value.items as Row[];
    if (Array.isArray(value.data)) return value.data as Row[];
  }
  return [];
}

export default function SupportPage() {
  const qc = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ["workspace-support-queue"],
    queryFn: async () => (await api.get("/notifications/queue", { params: { page: 1, limit: 200 } })).data,
    refetchInterval: 20_000,
  });

  const apiErrorsQuery = useQuery({
    queryKey: ["workspace-support-api-errors"],
    queryFn: async () => (await api.get("/monitoring/logs/api-errors", { params: { page: 1, limit: 200 } })).data,
    refetchInterval: 20_000,
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => api.post("/notifications/queue/process"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-support-queue"] });
      qc.invalidateQueries({ queryKey: ["workspace-support-api-errors"] });
    },
  });

  const processJobsMutation = useMutation({
    mutationFn: async () => api.post("/monitoring/jobs/process"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-support-queue"] });
      qc.invalidateQueries({ queryKey: ["workspace-support-api-errors"] });
    },
  });

  const queueRows = rows(queueQuery.data);
  const errorRows = rows(apiErrorsQuery.data);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Support Workspace</h1>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => processQueueMutation.mutate()} disabled={processQueueMutation.isPending}>Process Notification Queue</Button>
          <Button variant="outline" onClick={() => processJobsMutation.mutate()} disabled={processJobsMutation.isPending}>Run Monitoring Jobs</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Notification Queue</h2>
        </CardHeader>
        <CardContent>
          {queueQuery.isLoading ? <LoadingState message="Loading support queue..." /> : null}
          {queueQuery.isError ? <ErrorState message={extractErrorMessage(queueQuery.error)} /> : null}
          {processQueueMutation.isError ? <ErrorState message={extractErrorMessage(processQueueMutation.error)} /> : null}
          <DataTable
            data={queueRows}
            columns={[
              { accessorKey: "id", header: "Queue Item" },
              { accessorKey: "status", header: "Status" },
              { accessorKey: "channel", header: "Channel" },
              { accessorKey: "priority", header: "Priority" },
              { accessorKey: "createdAt", header: "Created" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">API Error Stream</h2>
        </CardHeader>
        <CardContent>
          {apiErrorsQuery.isLoading ? <LoadingState message="Loading API errors..." /> : null}
          {apiErrorsQuery.isError ? <ErrorState message={extractErrorMessage(apiErrorsQuery.error)} /> : null}
          {processJobsMutation.isError ? <ErrorState message={extractErrorMessage(processJobsMutation.error)} /> : null}
          <DataTable
            data={errorRows}
            columns={[
              { accessorKey: "id", header: "Event" },
              { accessorKey: "path", header: "Path" },
              { accessorKey: "method", header: "Method" },
              { accessorKey: "statusCode", header: "Status" },
              { accessorKey: "createdAt", header: "Created" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
