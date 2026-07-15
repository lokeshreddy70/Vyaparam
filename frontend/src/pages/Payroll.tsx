import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";

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

export default function PayrollPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState("2026-07");
  const [notes, setNotes] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");

  const runsQuery = useQuery({
    queryKey: ["workspace-payroll-runs"],
    queryFn: async () => (await api.get("/hrms/payroll/runs", { params: { page: 1, limit: 200 } })).data,
    staleTime: 20_000,
  });

  const createRunMutation = useMutation({
    mutationFn: async () => api.post("/hrms/payroll/runs", { month, notes: notes || undefined }),
    onSuccess: () => {
      setNotes("");
      qc.invalidateQueries({ queryKey: ["workspace-payroll-runs"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => api.patch(`/hrms/payroll/runs/${selectedRunId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-payroll-runs"] }),
  });

  const runs = rows(runsQuery.data);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Payroll Workspace</h1>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Payroll month (YYYY-MM)" value={month} onChange={(e) => setMonth(e.target.value)} />
          <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={() => createRunMutation.mutate()} disabled={!month || createRunMutation.isPending}>Create Payroll Run</Button>
          <Select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
            <option value="">Select Run</option>
            {runs.map((run) => <option key={String(run.id)} value={String(run.id)}>{String(run.id)}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Payroll Operations</h2>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!selectedRunId || updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate("PROCESSING")}>Mark Processing</Button>
          <Button variant="secondary" disabled={!selectedRunId || updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate("COMPLETED")}>Mark Completed</Button>
          <Button variant="outline" disabled={!selectedRunId || updateStatusMutation.isPending} onClick={() => updateStatusMutation.mutate("CANCELLED")}>Mark Cancelled</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Payroll Runs</h2>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? <LoadingState message="Loading payroll runs..." /> : null}
          {runsQuery.isError ? <ErrorState message={extractErrorMessage(runsQuery.error)} /> : null}
          {createRunMutation.isError ? <ErrorState message={extractErrorMessage(createRunMutation.error)} /> : null}
          {updateStatusMutation.isError ? <ErrorState message={extractErrorMessage(updateStatusMutation.error)} /> : null}
          <DataTable
            data={runs}
            columns={[
              { accessorKey: "id", header: "Run" },
              { accessorKey: "month", header: "Month" },
              { accessorKey: "status", header: "Status" },
              { accessorKey: "createdAt", header: "Created" },
              { accessorKey: "updatedAt", header: "Updated" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
