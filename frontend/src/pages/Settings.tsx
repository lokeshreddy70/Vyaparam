import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { EntityCrudWorkspace } from "../components/app/EntityCrudWorkspace";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { FileUpload } from "../components/ui/file-upload";
import { Input } from "../components/ui/input";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";

type SettingsRecord = Record<string, unknown>;

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("company");

  const settingsQuery = useQuery({
    queryKey: ["business-settings-master"],
    queryFn: async () => (await api.get<SettingsRecord>("/settings/business-configuration")).data,
  });

  const [companyName, setCompanyName] = useState("");
  const [gst, setGst] = useState("");
  const [address, setAddress] = useState("");
  const [taxRaw, setTaxRaw] = useState("{}");
  const [invoiceRaw, setInvoiceRaw] = useState("{}");
  const [printerRaw, setPrinterRaw] = useState("{}");

  const saveCompanyMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/settings/business-configuration", {
        companyInfo: {
          name: companyName,
          gst,
          address,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-settings-master"] }),
  });

  const saveTaxMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/settings/business-configuration", { tax: JSON.parse(taxRaw) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-settings-master"] }),
  });

  const saveInvoiceMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/settings/business-configuration", { invoice: JSON.parse(invoiceRaw) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-settings-master"] }),
  });

  const savePrinterMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/settings/business-configuration", { printer: JSON.parse(printerRaw) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-settings-master"] }),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/settings/business-configuration/upload/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-settings-master"] }),
  });

  const content = useMemo(() => {
    if (tab === "company") {
      return (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Company Information</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Company Name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            <Input placeholder="GST" value={gst} onChange={(event) => setGst(event.target.value)} />
            <Textarea placeholder="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => {
                const company = (settingsQuery.data?.companyInfo as SettingsRecord | undefined) ?? {};
                setCompanyName(String(company.name ?? ""));
                setGst(String(company.gst ?? ""));
                setAddress(String(company.address ?? ""));
              }}>
                Load Existing
              </Button>
              <Button onClick={() => saveCompanyMutation.mutate()} disabled={saveCompanyMutation.isPending}>
                Save Company Info
              </Button>
            </div>
            {saveCompanyMutation.isError ? <p className="text-sm text-red-600">{extractErrorMessage(saveCompanyMutation.error)}</p> : null}
          </CardContent>
        </Card>
      );
    }

    if (tab === "branding") {
      return (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Logo and Branding</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <FileUpload onSelect={(file) => uploadLogoMutation.mutate(file)} accept="image/*" />
            {uploadLogoMutation.isError ? <p className="text-sm text-red-600">{extractErrorMessage(uploadLogoMutation.error)}</p> : null}
            <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">
              {JSON.stringify(settingsQuery.data?.assets ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    if (tab === "tax") {
      return (
        <ConfigEditor
          title="Tax Settings"
          value={taxRaw}
          onChange={setTaxRaw}
          onLoad={() => setTaxRaw(JSON.stringify(settingsQuery.data?.tax ?? {}, null, 2))}
          onSave={() => saveTaxMutation.mutate()}
          savePending={saveTaxMutation.isPending}
          saveError={saveTaxMutation.isError ? extractErrorMessage(saveTaxMutation.error) : null}
        />
      );
    }

    if (tab === "invoice") {
      return (
        <ConfigEditor
          title="Invoice Settings"
          value={invoiceRaw}
          onChange={setInvoiceRaw}
          onLoad={() => setInvoiceRaw(JSON.stringify(settingsQuery.data?.invoice ?? {}, null, 2))}
          onSave={() => saveInvoiceMutation.mutate()}
          savePending={saveInvoiceMutation.isPending}
          saveError={saveInvoiceMutation.isError ? extractErrorMessage(saveInvoiceMutation.error) : null}
        />
      );
    }

    if (tab === "printer") {
      return (
        <ConfigEditor
          title="Printer Settings"
          value={printerRaw}
          onChange={setPrinterRaw}
          onLoad={() => setPrinterRaw(JSON.stringify(settingsQuery.data?.printer ?? {}, null, 2))}
          onSave={() => savePrinterMutation.mutate()}
          savePending={savePrinterMutation.isPending}
          saveError={savePrinterMutation.isError ? extractErrorMessage(savePrinterMutation.error) : null}
        />
      );
    }

    return (
      <EntityCrudWorkspace
        config={{
          title: "Branch Settings",
          endpoint: "/branches",
          queryKey: "branch-settings",
          permissionRead: "branch.read",
          permissionManage: "branch.manage",
          searchParam: "q",
          fields: [
            { key: "name", label: "Branch Name", required: true },
            { key: "code", label: "Code" },
            { key: "phone", label: "Phone" },
            { key: "address", label: "Address", type: "textarea" },
          ],
          filters: [{ key: "code", label: "Code", type: "text" }],
        }}
      />
    );
  }, [
    tab,
    companyName,
    gst,
    address,
    saveCompanyMutation,
    settingsQuery.data,
    uploadLogoMutation,
    taxRaw,
    saveTaxMutation,
    invoiceRaw,
    saveInvoiceMutation,
    printerRaw,
    savePrinterMutation,
  ]);

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "company", label: "Company Information" },
          { key: "branding", label: "Logo" },
          { key: "tax", label: "Tax Settings" },
          { key: "invoice", label: "Invoice Settings" },
          { key: "printer", label: "Printer Settings" },
          { key: "branches", label: "Branch Settings" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {content}
    </div>
  );
}

function ConfigEditor({
  title,
  value,
  onChange,
  onLoad,
  onSave,
  savePending,
  saveError,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onLoad: () => void;
  onSave: () => void;
  savePending: boolean;
  saveError: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea className="min-h-[240px] font-mono text-xs" value={value} onChange={(event) => onChange(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onLoad}>Load Existing</Button>
          <Button onClick={onSave} disabled={savePending}>Save</Button>
        </div>
        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
      </CardContent>
    </Card>
  );
}
