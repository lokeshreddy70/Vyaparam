import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../components/app/DataTable";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Pagination } from "../../components/ui/pagination";
import { useState } from "react";
import { api } from "../../api/client";

type PermissionRecord = {
  id?: string;
  name?: string;
  description?: string;
  module?: string;
};

export default function TablesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const query = useQuery({
    queryKey: ["foundation-table-permissions", page, limit],
    queryFn: async () => (await api.get<PermissionRecord[]>("/permissions", { params: { page, limit } })).data,
  });

  const rows = Array.isArray(query.data) ? query.data : ((query.data as { items?: PermissionRecord[] } | undefined)?.items ?? []);
  const total = Number((query.data as { total?: number } | undefined)?.total ?? rows.length ?? 0);

  const columns: ColumnDef<PermissionRecord>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "module", header: "Module" },
    { accessorKey: "description", header: "Description" },
  ];

  return (
    <Card>
      <CardHeader>
        <h1 className="text-lg font-semibold">Table Foundation</h1>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataTable columns={columns} data={rows} />
        <Pagination page={page} onPageChange={setPage} totalPages={Math.max(1, Math.ceil(total / limit))} />
      </CardContent>
    </Card>
  );
}
