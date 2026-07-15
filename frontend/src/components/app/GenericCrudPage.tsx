import { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, extractErrorMessage } from "../../api/client";
import { usePermissions } from "../../hooks/usePermissions";
import { getListMeta, toArrayPayload } from "../../lib/utils";
import type { CrudModuleConfig } from "../../types/app";
import { DataTable } from "./DataTable";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Spinner } from "../ui/spinner";

function valueToDisplay(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function GenericCrudPage({ config }: { config: CrudModuleConfig }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const listQuery = useQuery({
    queryKey: [config.endpoint, page, limit, search],
    queryFn: async () => {
      const response = await api.get(config.endpoint, {
        params: {
          page,
          limit,
          ...(search && config.searchParam ? { [config.searchParam]: search } : {}),
        },
      });
      return response.data as unknown;
    },
  });

  const rows = useMemo(() => toArrayPayload<Record<string, unknown>>(listQuery.data), [listQuery.data]);
  const meta = useMemo(() => getListMeta(listQuery.data), [listQuery.data]);

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const base = config.fields.map((field) => ({
      accessorKey: field.key,
      header: field.label,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) =>
        valueToDisplay(row.original[field.key]),
    }));

    return [
      ...base,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
          const id = row.original.id as string | undefined;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditRow(row.original);
                  setForm(row.original);
                  setOpen(true);
                  setError(null);
                }}
                disabled={!can(config.permissionManage)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={!id || !can(config.permissionManage)}
                onClick={() => id && removeMutation.mutate(id)}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ];
  }, [config.fields, can, config.permissionManage]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editRow?.id) {
        const response = await api.put(`${config.endpoint}/${editRow.id}`, payload);
        return response.data;
      }
      const response = await api.post(config.endpoint, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      setOpen(false);
      setEditRow(null);
      setForm({});
      setError(null);
    },
    onError: (e) => setError(extractErrorMessage(e)),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`${config.endpoint}/${id}`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [config.endpoint] }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`${config.endpoint}/${id}/restore`);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [config.endpoint] }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!config.exportPath) return;
      const response = await api.get(config.exportPath);
      return response.data;
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!config.importPath) return;
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(config.importPath, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [config.endpoint] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{config.title}</h1>
          <div className="ml-auto flex w-full flex-wrap gap-2 md:w-auto">
            <Input
              className="md:w-64"
              placeholder={`Search ${config.title.toLowerCase()}`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Button
              onClick={() => {
                setOpen(true);
                setEditRow(null);
                setForm({});
                setError(null);
              }}
              disabled={!can(config.permissionManage)}
            >
              New
            </Button>
            {config.exportPath ? (
              <Button variant="secondary" onClick={() => exportMutation.mutate()}>
                Export
              </Button>
            ) : null}
            {config.importPath ? (
              <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-4 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                Import
                <input
                  type="file"
                  accept=".csv,.xlsx,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importMutation.mutate(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : listQuery.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {extractErrorMessage(listQuery.error)}
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={rows} />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span>Total: {meta.total}</span>
                <span>Page: {meta.page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={rows.length < limit}
                >
                  Next
                </Button>
                <select
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-900"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {config.supportsRestore ? (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const firstDeleted = rows.find((r) => r.deletedAt && r.id) as { id?: string } | undefined;
                      if (firstDeleted?.id) restoreMutation.mutate(firstDeleted.id);
                    }}
                    disabled={!can(config.permissionManage)}
                  >
                    Restore First Deleted In Current Page
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={editRow ? `Edit ${config.title}` : `New ${config.title}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            upsertMutation.mutate(form);
          }}
        >
          {config.fields.map((field) => {
            const val = form[field.key] ?? "";
            return (
              <label key={field.key} className="block space-y-1">
                <span className="text-sm font-medium">{field.label}</span>
                {field.type === "textarea" ? (
                  <Textarea
                    required={field.required}
                    value={String(val)}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type ?? "text"}
                    required={field.required}
                    value={String(val)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                      }))
                    }
                  />
                )}
              </label>
            );
          })}

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
