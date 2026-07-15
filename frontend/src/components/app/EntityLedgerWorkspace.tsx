import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { extractErrorMessage } from "../../api/client";
import { useEntityCrud } from "../../hooks/useEntityCrud";
import { usePermissions } from "../../hooks/usePermissions";
import { getListMeta, toArrayPayload } from "../../lib/utils";
import { readEntity, readEntitySubResource } from "../../services/entityService";
import type { CrudField } from "../../types/app";
import { DataTable } from "./DataTable";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Drawer } from "../ui/drawer";
import { Dialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";

export type EntityLedgerConfig = {
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
  ledgerPath: string;
  historyLabel: string;
  filters?: { key: string; label: string; type?: "text" | "number" | "boolean" }[];
};

type GenericRecord = Record<string, unknown>;

function toDisplay(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EntityLedgerWorkspace({ config }: { config: EntityLedgerConfig }) {
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<GenericRecord | null>(null);
  const [form, setForm] = useState<GenericRecord>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const crud = useEntityCrud<{ id?: string }>({
    endpoint: config.endpoint,
    queryKey: config.queryKey,
    listParams: { page, limit, search, searchParam: config.searchParam, filters },
    importPath: config.importPath,
    exportPath: config.exportPath,
  });

  const rows = useMemo(() => toArrayPayload<GenericRecord>(crud.listQuery.data), [crud.listQuery.data]);
  const meta = useMemo(() => getListMeta(crud.listQuery.data), [crud.listQuery.data]);

  const profileQuery = useQuery({
    queryKey: [config.queryKey, "profile", profileId],
    queryFn: async () => readEntity<GenericRecord>(config.endpoint, String(profileId)),
    enabled: !!profileId,
  });

  const ledgerQuery = useQuery({
    queryKey: [config.queryKey, "ledger", profileId],
    queryFn: async () => readEntitySubResource<unknown[]>(config.endpoint, String(profileId), config.ledgerPath),
    enabled: !!profileId,
  });

  const rowsMutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: GenericRecord }) => {
      if (id) {
        return crud.updateMutation.mutateAsync({ id, payload });
      }
      return crud.createMutation.mutateAsync(payload);
    },
  });

  const columns = useMemo<ColumnDef<GenericRecord>[]>(() => {
    const base = config.fields.map((field) => ({
      accessorKey: field.key,
      header: field.label,
      cell: ({ row }: { row: { original: GenericRecord } }) => toDisplay(row.original[field.key]),
    }));

    return [
      ...base,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: { original: GenericRecord } }) => {
          const id = row.original.id ? String(row.original.id) : "";
          return (
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="secondary" onClick={() => setProfileId(id)} disabled={!id || !can(config.permissionRead)}>
                Profile
              </Button>
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
  }, [can, config.fields, config.permissionManage, config.permissionRead, config.supportsRestore, crud.deleteMutation, crud.restoreMutation]);

  const ledgerRows = Array.isArray(ledgerQuery.data)
    ? ledgerQuery.data
    : ((ledgerQuery.data as { items?: unknown[] } | undefined)?.items ?? []);

  const outstanding = ledgerRows.reduce<number>((sum, row) => {
    const item = row as GenericRecord;
    return sum + numeric(item.debit ?? item.amount ?? 0) - numeric(item.credit ?? item.paidAmount ?? 0);
  }, 0);

  const paymentHistory = ledgerRows.filter((row) => {
    const item = row as GenericRecord;
    const type = String(item.type ?? item.entryType ?? "").toLowerCase();
    return type.includes("payment") || numeric(item.credit) > 0;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{config.title}</h1>
          <div className="ml-auto flex w-full flex-wrap gap-2 md:w-auto">
            <Input
              className="md:w-64"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={`Search ${config.title.toLowerCase()}`}
            />
            {config.filters?.length ? (
              <Button variant="outline" onClick={() => setShowFilters((value) => !value)}>
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
              <Button variant="secondary" onClick={() => crud.exportMutation.mutate()}>
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
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) crud.importMutation.mutate(file);
                    event.currentTarget.value = "";
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
                  <Input
                    placeholder="true or false"
                    value={String(filters[filter.key] ?? "")}
                    onChange={(event) => setFilters((prev) => ({ ...prev, [filter.key]: event.target.value }))}
                  />
                ) : (
                  <Input
                    type={filter.type === "number" ? "number" : "text"}
                    value={String(filters[filter.key] ?? "")}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        [filter.key]: filter.type === "number" ? Number(event.target.value || 0) : event.target.value,
                      }))
                    }
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
                <Button size="sm" variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage((prev) => prev + 1)} disabled={rows.length < limit}>
                  Next
                </Button>
                <select
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-900"
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
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
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            rowsMutation
              .mutateAsync({ id: editRow?.id ? String(editRow.id) : undefined, payload: form })
              .then(() => {
                setFormOpen(false);
                setEditRow(null);
                setForm({});
              })
              .catch((error: unknown) => setFormError(extractErrorMessage(error)));
          }}
        >
          {config.fields.map((field) => (
            <label key={field.key} className="block space-y-1 text-sm">
              <span className="font-medium">{field.label}</span>
              {field.type === "textarea" ? (
                <Textarea
                  required={field.required}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
              ) : (
                <Input
                  required={field.required}
                  type={field.type === "number" ? "number" : field.type ?? "text"}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: field.type === "number" ? Number(event.target.value || 0) : event.target.value,
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
            <Button type="submit" disabled={rowsMutation.isPending}>Save</Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>

      <Drawer open={!!profileId} title={`${config.title} Profile`} onClose={() => setProfileId(null)}>
        {!profileId ? null : profileQuery.isLoading || ledgerQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : profileQuery.isError || ledgerQuery.isError ? (
          <p className="text-sm text-red-600">
            {extractErrorMessage(profileQuery.error ?? ledgerQuery.error)}
          </p>
        ) : (
          <div className="space-y-4">
            <section className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <h3 className="mb-2 font-semibold">Profile</h3>
              <pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-900">
                {JSON.stringify(profileQuery.data ?? {}, null, 2)}
              </pre>
            </section>

            <section className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <h3 className="font-semibold">Outstanding Balance</h3>
              <p className="text-lg">{outstanding.toFixed(2)}</p>
            </section>

            <section className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <h3 className="mb-2 font-semibold">{config.historyLabel}</h3>
              <div className="max-h-56 space-y-1 overflow-auto">
                {paymentHistory.length ? (
                  paymentHistory.map((entry, index) => {
                    const item = entry as GenericRecord;
                    return (
                      <article key={`${item.id ?? index}`} className="rounded border border-slate-200 p-2 text-xs dark:border-slate-700">
                        <p className="font-medium">{String(item.type ?? item.entryType ?? "ENTRY")}</p>
                        <p>Amount: {numeric(item.amount ?? item.credit ?? 0).toFixed(2)}</p>
                        <p>Date: {String(item.createdAt ?? item.date ?? "-")}</p>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No payment entries in ledger.</p>
                )}
              </div>
            </section>

            <section className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
              <h3 className="mb-2 font-semibold">Ledger</h3>
              <div className="max-h-56 space-y-1 overflow-auto">
                {ledgerRows.length ? (
                  ledgerRows.map((entry, index) => {
                    const item = entry as GenericRecord;
                    return (
                      <article key={`${item.id ?? index}`} className="rounded border border-slate-200 p-2 text-xs dark:border-slate-700">
                        <p className="font-medium">{String(item.type ?? item.entryType ?? "ENTRY")}</p>
                        <p>Debit: {numeric(item.debit ?? 0).toFixed(2)}</p>
                        <p>Credit: {numeric(item.credit ?? 0).toFixed(2)}</p>
                        <p>Date: {String(item.createdAt ?? item.date ?? "-")}</p>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No ledger records found.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
