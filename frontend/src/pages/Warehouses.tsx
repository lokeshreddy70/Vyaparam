import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";

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

export default function WarehousesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");

  const listQuery = useQuery({
    queryKey: ["workspace-warehouses"],
    queryFn: async () => (await api.get("/warehouses", { params: { page: 1, limit: 300 } })).data,
    staleTime: 20_000,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post("/warehouses", {
        name,
        code,
        address,
      }),
    onSuccess: () => {
      setName("");
      setCode("");
      setAddress("");
      qc.invalidateQueries({ queryKey: ["workspace-warehouses"] });
    },
  });

  const data = rows(listQuery.data);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Warehouse Workspace</h1>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Warehouse name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Button onClick={() => createMutation.mutate()} disabled={!name || !code || createMutation.isPending}>Create Warehouse</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Warehouses</h2>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? <LoadingState message="Loading warehouses..." /> : null}
          {listQuery.isError ? <ErrorState message={extractErrorMessage(listQuery.error)} /> : null}
          {createMutation.isError ? <ErrorState message={extractErrorMessage(createMutation.error)} /> : null}
          <DataTable
            data={data}
            columns={[
              { accessorKey: "name", header: "Name" },
              { accessorKey: "code", header: "Code" },
              { accessorKey: "address", header: "Address" },
              { accessorKey: "isActive", header: "Active" },
              { accessorKey: "createdAt", header: "Created" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
