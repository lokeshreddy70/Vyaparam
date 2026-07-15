import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "../../components/app/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../../components/app/OperationState";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { api, extractErrorMessage } from "../../api/client";
import { usePermissions } from "../../hooks/usePermissions";

const prescriptionTypes = ["FILE_UPLOAD", "DOCTOR_NOTE", "VERBAL"] as const;

export default function PharmacyModulePage() {
  const qc = useQueryClient();
  const { can } = usePermissions();

  const categoriesQuery = useQuery({
    queryKey: ["industry", "pharmacy", "categories"],
    queryFn: async () => (await api.get("/categories")).data as Array<Record<string, unknown>>,
    enabled: can("catalog.read"),
  });

  const productsQuery = useQuery({
    queryKey: ["industry", "pharmacy", "products"],
    queryFn: async () =>
      (await api.get("/products", { params: { page: 1, limit: 300 } })).data as
      | { items?: Array<Record<string, unknown>> }
      | Array<Record<string, unknown>>,
    enabled: can("product.read"),
  });

  const inventoryQuery = useQuery({
    queryKey: ["industry", "pharmacy", "inventory"],
    queryFn: async () => (await api.get("/inventory")).data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>,
    enabled: can("inventory.read"),
  });

  const searchMutation = useMutation({
    mutationFn: async (payload: { q?: string; barcode?: string; sku?: string }) =>
      (await api.get("/products/search", { params: payload })).data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string }) => api.post("/categories", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "pharmacy", "categories"] }),
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (payload: {
      batchNo: string;
      expiryDate: string;
      prescriptionRequired: boolean;
      medicineCategory: string;
      stockAlertDays: number;
    }) =>
      api.patch("/settings/business-configuration", {
        businessPreferences: {
          pharmacy: {
            medicineCategory: payload.medicineCategory,
            prescriptionRequired: payload.prescriptionRequired,
            batchTracking: true,
            expiryTracking: true,
            expiryAlertDays: payload.stockAlertDays,
          },
        },
        barcodeSettings: {
          pharmacy: {
            medicineSearchEnabled: true,
            batchNo: payload.batchNo,
            expiryDate: payload.expiryDate,
          },
        },
      }),
  });

  const createReminderMutation = useMutation({
    mutationFn: async (payload: { title: string; message: string; remindAt: string; medicineCode: string; expiryDate: string }) =>
      api.post("/notifications/reminders", {
        eventType: "REMINDER",
        title: payload.title,
        message: payload.message,
        remindAt: payload.remindAt,
        payload: {
          medicineCode: payload.medicineCode,
          expiryDate: payload.expiryDate,
          module: "PHARMACY",
        },
      }),
  });

  const uploadPrescriptionMutation = useMutation({
    mutationFn: async (payload: { patientName: string; prescriptionType: string; notes: string }) => {
      const formData = new FormData();
      const blob = new Blob([payload.notes || payload.patientName], { type: "text/plain" });
      formData.append("file", blob, `prescription-${Date.now()}.txt`);
      formData.append("category", "CUSTOMER_DOCUMENT");
      formData.append("entityType", "prescription");
      formData.append("entityId", payload.patientName);
      return api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  });

  const [medicineCategory, setMedicineCategory] = useState("MEDICINE");
  const [newCategory, setNewCategory] = useState("");
  const [batchNo, setBatchNo] = useState("BATCH-001");
  const [expiryDate, setExpiryDate] = useState("");
  const [prescriptionRequired, setPrescriptionRequired] = useState("true");
  const [stockAlertDays, setStockAlertDays] = useState("30");

  const [searchQ, setSearchQ] = useState("");
  const [searchBarcode, setSearchBarcode] = useState("");
  const [searchSku, setSearchSku] = useState("");

  const [reminderTitle, setReminderTitle] = useState("Medicine Expiry Alert");
  const [reminderMessage, setReminderMessage] = useState("Medicine batch nearing expiry");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderMedicineCode, setReminderMedicineCode] = useState("");

  const [patientName, setPatientName] = useState("");
  const [prescriptionType, setPrescriptionType] = useState<(typeof prescriptionTypes)[number]>("FILE_UPLOAD");
  const [prescriptionNotes, setPrescriptionNotes] = useState("");

  const products = useMemo(() => {
    const payload = productsQuery.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
    return [];
  }, [productsQuery.data]);

  const inventoryRows = useMemo(() => {
    const payload = inventoryQuery.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
    return [];
  }, [inventoryQuery.data]);

  const searchRows = useMemo(() => {
    const payload = searchMutation.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
    return [];
  }, [searchMutation.data]);

  const expiryRows = useMemo(() => {
    const today = new Date();
    return inventoryRows
      .map((item) => {
        const metadata = item.metadata as Record<string, unknown> | undefined;
        const expiry = metadata?.expiryDate;
        const batch = metadata?.batchNo;
        const expiryAt = typeof expiry === "string" ? new Date(expiry) : null;
        const daysToExpiry = expiryAt ? Math.ceil((expiryAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
        return {
          id: String(item.id ?? ""),
          productName: String((item.product as Record<string, unknown> | undefined)?.name ?? item.productName ?? ""),
          batchNo: typeof batch === "string" ? batch : "",
          expiryDate: typeof expiry === "string" ? expiry : "",
          daysToExpiry,
        };
      })
      .filter((item) => item.expiryDate)
      .sort((a, b) => Number(a.daysToExpiry ?? 99999) - Number(b.daysToExpiry ?? 99999));
  }, [inventoryRows]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Pharmacy Module</h1>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Medicine Categories" value={Array.isArray(categoriesQuery.data) ? categoriesQuery.data.length : 0} />
          <Metric label="Medicines" value={products.length} />
          <Metric label="Expiry Alerts" value={expiryRows.filter((row) => Number(row.daysToExpiry ?? 99999) <= 30).length} />
          <Metric label="Prescription Uploads" value={uploadPrescriptionMutation.isSuccess ? 1 : 0} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Medicine Categories and Batch Settings</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="New Category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
              <Button
                disabled={!can("catalog.manage") || createCategoryMutation.isPending || !newCategory.trim()}
                onClick={() => {
                  createCategoryMutation.mutate({ name: newCategory.trim() });
                  setNewCategory("");
                }}
              >
                Add Category
              </Button>
            </div>
            {createCategoryMutation.isError ? <ErrorState message={extractErrorMessage(createCategoryMutation.error)} /> : null}

            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Medicine Category" value={medicineCategory} onChange={(event) => setMedicineCategory(event.target.value)} />
              <Input placeholder="Batch Number" value={batchNo} onChange={(event) => setBatchNo(event.target.value)} />
              <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
              <Input type="number" min={1} value={stockAlertDays} onChange={(event) => setStockAlertDays(event.target.value)} placeholder="Expiry alert days" />
              <Select value={prescriptionRequired} onChange={(event) => setPrescriptionRequired(event.target.value)}>
                <option value="true">Prescription Required</option>
                <option value="false">Prescription Optional</option>
              </Select>
              <Button
                disabled={!can("business.manage") || updateConfigMutation.isPending}
                onClick={() =>
                  updateConfigMutation.mutate({
                    batchNo,
                    expiryDate,
                    prescriptionRequired: prescriptionRequired === "true",
                    medicineCategory,
                    stockAlertDays: Math.max(1, Number(stockAlertDays) || 30),
                  })
                }
              >
                Save Pharmacy Config
              </Button>
            </div>
            {updateConfigMutation.isError ? <ErrorState message={extractErrorMessage(updateConfigMutation.error)} /> : null}

            {categoriesQuery.isLoading ? <LoadingState message="Loading categories..." /> : null}
            {categoriesQuery.isError ? <ErrorState message={extractErrorMessage(categoriesQuery.error)} /> : null}
            {Array.isArray(categoriesQuery.data) && categoriesQuery.data.length > 0 ? (
              <DataTable data={categoriesQuery.data} columns={[{ accessorKey: "id", header: "Category" }, { accessorKey: "name", header: "Name" }, { accessorKey: "createdAt", header: "Created" }]} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Medicine Search and Prescription Ready</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Search medicine" value={searchQ} onChange={(event) => setSearchQ(event.target.value)} />
              <Input placeholder="Barcode" value={searchBarcode} onChange={(event) => setSearchBarcode(event.target.value)} />
              <Input placeholder="SKU" value={searchSku} onChange={(event) => setSearchSku(event.target.value)} />
            </div>
            <Button variant="outline" disabled={!can("product.read") || searchMutation.isPending} onClick={() => searchMutation.mutate({ q: searchQ || undefined, barcode: searchBarcode || undefined, sku: searchSku || undefined })}>
              Search Medicine
            </Button>
            {searchMutation.isError ? <ErrorState message={extractErrorMessage(searchMutation.error)} /> : null}
            {searchRows.length > 0 ? <DataTable data={searchRows} columns={[{ accessorKey: "id", header: "Medicine" }, { accessorKey: "name", header: "Name" }, { accessorKey: "sku", header: "SKU" }, { accessorKey: "barcode", header: "Barcode" }, { accessorKey: "sellingPrice", header: "Price" }]} /> : null}

            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold">Prescription Record</p>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Patient Name" value={patientName} onChange={(event) => setPatientName(event.target.value)} />
                <Select value={prescriptionType} onChange={(event) => setPrescriptionType(event.target.value as (typeof prescriptionTypes)[number])}>
                  {prescriptionTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>
              <Textarea placeholder="Prescription notes" value={prescriptionNotes} onChange={(event) => setPrescriptionNotes(event.target.value)} />
              <Button
                disabled={!can("document.upload") || uploadPrescriptionMutation.isPending || !patientName.trim()}
                onClick={() =>
                  uploadPrescriptionMutation.mutate({
                    patientName: patientName.trim(),
                    prescriptionType,
                    notes: prescriptionNotes || prescriptionType,
                  })
                }
              >
                Save Prescription File
              </Button>
              {uploadPrescriptionMutation.isError ? <ErrorState message={extractErrorMessage(uploadPrescriptionMutation.error)} /> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Inventory Batches and Expiry Tracking</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventoryQuery.isLoading ? <LoadingState message="Loading inventory..." /> : null}
            {inventoryQuery.isError ? <ErrorState message={extractErrorMessage(inventoryQuery.error)} /> : null}
            {!inventoryQuery.isLoading && !inventoryQuery.isError && expiryRows.length === 0 ? <EmptyState message="No expiry metadata found in inventory rows." /> : null}
            {expiryRows.length > 0 ? (
              <DataTable
                data={expiryRows}
                columns={[
                  { accessorKey: "productName", header: "Medicine" },
                  { accessorKey: "batchNo", header: "Batch" },
                  { accessorKey: "expiryDate", header: "Expiry" },
                  { accessorKey: "daysToExpiry", header: "Days" },
                ]}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Expiry Alerts</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Alert title" value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} />
              <Input placeholder="Medicine code" value={reminderMedicineCode} onChange={(event) => setReminderMedicineCode(event.target.value)} />
              <Input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
              <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
            </div>
            <Textarea placeholder="Alert message" value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} />
            <Button
              disabled={!can("notification.reminder.create") || createReminderMutation.isPending || !reminderTitle || !reminderMessage || !reminderAt}
              onClick={() =>
                createReminderMutation.mutate({
                  title: reminderTitle,
                  message: reminderMessage,
                  remindAt: new Date(reminderAt).toISOString(),
                  medicineCode: reminderMedicineCode || "UNKNOWN",
                  expiryDate: expiryDate || new Date().toISOString().slice(0, 10),
                })
              }
            >
              Create Expiry Alert
            </Button>
            {createReminderMutation.isError ? <ErrorState message={extractErrorMessage(createReminderMutation.error)} /> : null}
            {createReminderMutation.isSuccess ? <p className="text-sm text-emerald-600 dark:text-emerald-400">Expiry alert scheduled.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
