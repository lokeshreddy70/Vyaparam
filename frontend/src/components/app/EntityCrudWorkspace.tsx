import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { extractErrorMessage } from "../../api/client";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { usePermissions } from "../../hooks/usePermissions";
import { getListMeta, toArrayPayload } from "../../lib/utils";
import type { CrudField } from "../../types/app";
import { DataTable } from "./DataTable";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";

type FilterConfig = {
  key: string;
  label: string;
  type?: "text" | "number" | "boolean";
};

type WorkspaceConfig = {
  title: string;
  endpoint: string;
  queryKey: string;
  fields: CrudField[];
  permissionRead: string;
  permissionManage: string;
  searchParam?: string;
  supportsRestore?: boolean;
  importPath?: string;
  exportPath?: string;
  filters?: FilterConfig[];
  profile?: {
    detailPath?: string;
    ledgerPath?: string;
  };
};

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function EntityCrudWorkspace({ config }: { config: WorkspaceConfig }) {
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const crud = useEntityCrud<Record<string, unknown>>({
    endpoint: config.endpoint,
    queryKey: config.queryKey,
    listParams: {
      page,
      limit,
      search,
      searchParam: config.searchParam,
      filters,
    },
    importPath: config.importPath,
    exportPath: config.exportPath,
  });

  const rows = useMemo(() => toArrayPayload<Record<string, unknown>>(crud.listQuery.data), [crud.listQuery.data]);
  const meta = useMemo(() => getListMeta(crud.listQuery.data), [crud.listQuery.data]);

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const base = config.fields.map((field) => ({
      accessorKey: field.key,
      header: field.label,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => displayValue(row.original[field.key]),
    }));

    return [
      ...base,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
          const id = row.original.id as string | undefined;
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditRow(row.original);
                  setForm(row.original);
                  setFormError(null);
                  setFormOpen(true);
                }}
                disabled={!can(config.permissionManage)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => id && crud.deleteMutation.mutate(id)}
                disabled={!id || !can(config.permissionManage) || crud.deleteMutation.isPending}
              >
                Delete
              </Button>
              {config.supportsRestore ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => id && crud.restoreMutation.mutate(id)}
                  disabled={!id || !can(config.permissionManage) || crud.restoreMutation.isPending}
                >
                  Restore
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ];
  }, [config.fields, config.permissionManage, config.supportsRestore, can, crud.deleteMutation, crud.restoreMutation]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{config.title}</h1>
          <div className="ml-auto flex w-full flex-wrap gap-2 md:w-auto">
            <Input
              className="md:w-64"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder={`Search ${config.title.toLowerCase()}`}
            />
            {config.filters?.length ? (
              <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
                {showFilters ? "Hide Filters" : "Advanced Filters"}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setEditRow(null);
                setForm({});
                setFormError(null);
                setFormOpen(true);
              }}
              disabled={!can(config.permissionManage)}
            >
              Create
            </Button>
            {config.exportPath ? (
              <Button variant="secondary" onClick={() => crud.exportMutation.mutate()} disabled={crud.exportMutation.isPending}>
                Export
              </Button>
            ) : null}
            {config.importPath ? (
              <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-slate-100 px-3 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                Import
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) crud.importMutation.mutate(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
        </CardHeader>

        {showFilters && config.filters?.length ? (
          <CardContent className="grid gap-3 border-b border-slate-200 dark:border-slate-800 md:grid-cols-3">
            {config.filters.map((filter) => (
              <label key={filter.key} className="block space-y-1 text-sm">
                <span className="font-medium">{filter.label}</span>
                {filter.type === "boolean" ? (
                  <Switch
                    checked={Boolean(filters[filter.key])}
                    onChange={(value) => setFilters((prev) => ({ ...prev, [filter.key]: value }))}
                  />
                ) : (
                  <Input
                    type={filter.type === "number" ? "number" : "text"}
                    value={String(filters[filter.key] ?? "")}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFilters((prev) => ({
                        ...prev,
                        [filter.key]: filter.type === "number" ? Number(raw || 0) : raw,
                      }));
                      setPage(1);
                    }}
                  />
                )}
              </label>
            ))}
          </CardContent>
        ) : null}

        <CardContent>
          {crud.listQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : crud.listQuery.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {extractErrorMessage(crud.listQuery.error)}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              No records found.
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
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={rows.length < limit}>
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
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editRow ? `Edit ${config.title}` : `Create ${config.title}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            if (editRow?.id) {
              crud.updateMutation
                .mutateAsync({ id: String(editRow.id), payload: form })
                .then(() => {
                  setFormOpen(false);
                  setForm({});
                  setEditRow(null);
                })
                .catch((error: unknown) => setFormError(extractErrorMessage(error)));
            } else {
              crud.createMutation
                .mutateAsync(form)
                .then(() => {
                  setFormOpen(false);
                  setForm({});
                })
                .catch((error: unknown) => setFormError(extractErrorMessage(error)));
            }
          }}
        >
          {config.fields.map((field) => (
            <label key={field.key} className="block space-y-1 text-sm">
              <span className="font-medium">{field.label}</span>
              {field.type === "textarea" ? (
                <Textarea
                  required={field.required}
                  value={String(form[field.key] ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              ) : (
                <Input
                  required={field.required}
                  type={field.type === "number" ? "number" : field.type ?? "text"}
                  value={String(form[field.key] ?? "")}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: field.type === "number" ? Number(e.target.value || 0) : e.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={crud.createMutation.isPending || crud.updateMutation.isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
