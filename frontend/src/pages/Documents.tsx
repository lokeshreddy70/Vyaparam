import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, extractErrorMessage } from "../api/client";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { DataTable } from "../components/app/DataTable";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";

function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown[] }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("documents");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("GENERAL");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const docsQuery = useQuery({ queryKey: ["documents-c"], queryFn: async () => (await api.get("/documents", { params: { page: 1, limit: 200 } })).data });
  const selectedDocQuery = useQuery({ queryKey: ["documents-selected-c", selectedId], enabled: !!selectedId, queryFn: async () => (await api.get(`/documents/${selectedId}`)).data });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (entityType) form.append("entityType", entityType);
      if (entityId) form.append("entityId", entityId);
      await api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents-c"] });
      setFile(null);
    },
  });

  const remove = useMutation({ mutationFn: async (id: string) => api.delete(`/documents/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["documents-c"] }) });

  const documents = rows(docsQuery.data);

  return (
    <div className="space-y-4">
      <Tabs tabs={[{ key: "documents", label: "Document Manager" }, { key: "invoice", label: "Invoice Viewer" }, { key: "pdf", label: "PDF Viewer" }]} active={tab} onChange={setTab} />

      <Card>
        <CardHeader><h1 className="text-lg font-semibold">Document Operations</h1></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-5">
          <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" />
          <Input value={entityType} onChange={(event) => setEntityType(event.target.value)} placeholder="Entity Type" />
          <Input value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="Entity ID" />
          <Button disabled={!file || upload.isPending} onClick={() => upload.mutate()}>Upload</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-base font-semibold">Document List</h2></CardHeader>
        <CardContent className="space-y-3">
          {docsQuery.isLoading ? <LoadingState message="Loading documents..." /> : null}
          {docsQuery.isError ? <ErrorState message={extractErrorMessage(docsQuery.error)} /> : null}
          {upload.isError ? <ErrorState message={extractErrorMessage(upload.error)} /> : null}
          {!docsQuery.isLoading && !docsQuery.isError && !documents.length ? <EmptyState message="No documents available." /> : null}
          {!docsQuery.isLoading && !docsQuery.isError && documents.length ? (
            <DataTable
              data={documents}
              columns={[
                { accessorKey: "id", header: "ID" },
                { accessorKey: "filename", header: "File" },
                { accessorKey: "category", header: "Category" },
                { accessorKey: "entityType", header: "Entity Type" },
                { accessorKey: "entityId", header: "Entity ID" },
                { accessorKey: "createdAt", header: "Created" },
                {
                  id: "actions",
                  header: "Actions",
                  cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(String(row.original.id ?? ""))}>View</Button>
                      <Button size="sm" variant="danger" onClick={() => remove.mutate(String(row.original.id ?? ""))}>Delete</Button>
                    </div>
                  ),
                },
              ]}
            />
          ) : null}
        </CardContent>
      </Card>

      {(tab === "invoice" || tab === "pdf") ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">{tab === "invoice" ? "Invoice Viewer" : "PDF Viewer"}</h2></CardHeader>
          <CardContent className="space-y-2">
            <Select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Select document</option>
              {documents.map((doc) => <option key={String(doc.id)} value={String(doc.id)}>{String(doc.filename ?? doc.id)}</option>)}
            </Select>
            {selectedDocQuery.isLoading ? <LoadingState message="Loading document..." /> : null}
            {selectedDocQuery.isError ? <ErrorState message={extractErrorMessage(selectedDocQuery.error)} /> : null}
            {selectedDocQuery.data ? <pre className="max-h-[520px] overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">{JSON.stringify(selectedDocQuery.data, null, 2)}</pre> : null}
            {!selectedId ? <EmptyState message="Choose a document to preview." /> : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={!!selectedId && tab === "documents"} title="Document Detail" onClose={() => setSelectedId("")}>
        {selectedDocQuery.data ? <pre className="max-h-[460px] overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">{JSON.stringify(selectedDocQuery.data, null, 2)}</pre> : <LoadingState message="Loading document detail..." />}
      </Dialog>
    </div>
  );
}
