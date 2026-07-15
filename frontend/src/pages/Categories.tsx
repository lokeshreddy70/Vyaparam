import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { EntityCrudWorkspace } from "../components/app/EntityCrudWorkspace";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";

export default function CategoriesPage() {
  const [tab, setTab] = useState("categories");
  const qc = useQueryClient();

  const taxQuery = useQuery({
    queryKey: ["category-tax-settings"],
    queryFn: async () => (await api.get<Record<string, unknown>>("/settings/business-configuration/tax")).data,
  });

  const [taxRaw, setTaxRaw] = useState("{}");

  const saveTaxMutation = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(taxRaw) as Record<string, unknown>;
      await api.patch("/settings/business-configuration", { tax: parsed });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category-tax-settings"] }),
  });

  const content = useMemo(() => {
    if (tab === "categories") {
      return (
        <EntityCrudWorkspace
          config={{
            title: "Categories",
            endpoint: "/categories",
            queryKey: "categories",
            permissionRead: "category.read",
            permissionManage: "category.manage",
            searchParam: "q",
            supportsRestore: true,
            fields: [
              { key: "name", label: "Name", required: true },
              { key: "code", label: "Code" },
              { key: "description", label: "Description", type: "textarea" },
            ],
            filters: [{ key: "code", label: "Code", type: "text" }],
          }}
        />
      );
    }

    if (tab === "sub-categories") {
      return (
        <EntityCrudWorkspace
          config={{
            title: "Sub Categories",
            endpoint: "/categories",
            queryKey: "sub-categories",
            permissionRead: "category.read",
            permissionManage: "category.manage",
            searchParam: "q",
            supportsRestore: true,
            fields: [
              { key: "name", label: "Name", required: true },
              { key: "parentId", label: "Parent Category ID", required: true },
              { key: "code", label: "Code" },
              { key: "description", label: "Description", type: "textarea" },
            ],
            filters: [
              { key: "parentId", label: "Parent Category ID", type: "text" },
              { key: "code", label: "Code", type: "text" },
            ],
          }}
        />
      );
    }

    if (tab === "units") {
      return (
        <EntityCrudWorkspace
          config={{
            title: "Units",
            endpoint: "/units",
            queryKey: "units",
            permissionRead: "unit.read",
            permissionManage: "unit.manage",
            searchParam: "q",
            supportsRestore: true,
            fields: [
              { key: "name", label: "Name", required: true },
              { key: "symbol", label: "Symbol" },
              { key: "description", label: "Description", type: "textarea" },
            ],
            filters: [{ key: "symbol", label: "Symbol", type: "text" }],
          }}
        />
      );
    }

    if (tab === "brands") {
      return (
        <EntityCrudWorkspace
          config={{
            title: "Brands",
            endpoint: "/brands",
            queryKey: "brands",
            permissionRead: "brand.read",
            permissionManage: "brand.manage",
            searchParam: "q",
            supportsRestore: true,
            fields: [
              { key: "name", label: "Name", required: true },
              { key: "code", label: "Code" },
              { key: "description", label: "Description", type: "textarea" },
            ],
            filters: [{ key: "code", label: "Code", type: "text" }],
          }}
        />
      );
    }

    return (
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Tax Groups</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tax group settings are managed through business configuration tax section.
          </p>
          <Textarea
            className="min-h-[220px] font-mono text-xs"
            value={taxRaw}
            onChange={(event) => setTaxRaw(event.target.value)}
            placeholder="Tax groups JSON"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setTaxRaw(JSON.stringify(taxQuery.data ?? {}, null, 2))} disabled={!taxQuery.data}>
              Load Tax Settings
            </Button>
            <Button variant="secondary" onClick={() => saveTaxMutation.mutate()} disabled={saveTaxMutation.isPending}>
              Save Tax Settings
            </Button>
          </div>
          {saveTaxMutation.isError ? <p className="text-sm text-red-600">{extractErrorMessage(saveTaxMutation.error)}</p> : null}
          <pre className="max-h-[260px] overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">
            {JSON.stringify(taxQuery.data ?? {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }, [tab, taxRaw, taxQuery.data, saveTaxMutation, saveTaxMutation.error, saveTaxMutation.isError, saveTaxMutation.isPending]);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "categories", label: "Categories" },
          { key: "sub-categories", label: "Sub Categories" },
          { key: "units", label: "Units" },
          { key: "brands", label: "Brands" },
          { key: "tax-groups", label: "Tax Groups" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {content}
    </div>
  );
}
