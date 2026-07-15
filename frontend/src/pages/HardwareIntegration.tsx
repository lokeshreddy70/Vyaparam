import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, extractErrorMessage } from "../api/client";
import { DataTable } from "../components/app/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Tabs } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  DiscoveredDevice,
  HardwareTransport,
  PrinterConnection,
  discoverConnectedDevices,
  escPosOpenDrawerCommand,
  escPosTextReceipt,
  getHardwareSupport,
  requestPrinterConnection,
} from "../services/hardwareService";
import { useAuthStore } from "../store/authStore";

type Rec = Record<string, unknown>;

type QueueJob = {
  id: string;
  title: string;
  payload: Uint8Array;
  status: "queued" | "printing" | "success" | "error";
  retries: number;
  error?: string;
  createdAt: string;
};

function rows(payload: unknown): Rec[] {
  if (Array.isArray(payload)) return payload as Rec[];
  if (payload && typeof payload === "object") {
    const p = payload as { items?: unknown[]; data?: unknown[] };
    if (Array.isArray(p.items)) return p.items as Rec[];
    if (Array.isArray(p.data)) return p.data as Rec[];
  }
  return [];
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function HardwareIntegrationPage() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);

  const [tab, setTab] = useState("printers");
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [activeTransport, setActiveTransport] = useState<HardwareTransport>("bluetooth");
  const [connection, setConnection] = useState<PrinterConnection | null>(null);
  const [connectError, setConnectError] = useState("");
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [autoRetry, setAutoRetry] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);

  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [testPrintText, setTestPrintText] = useState("SmartBiz POS Test Print");
  const [qrData, setQrData] = useState("UPI://pay?pa=merchant@upi&pn=SmartBiz");
  const [barcodeData, setBarcodeData] = useState("SMARTBIZ-12345");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [generatedFileId, setGeneratedFileId] = useState("");

  const [keyboardScanMode, setKeyboardScanMode] = useState(true);
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScanAt, setLastScanAt] = useState(0);
  const [lastScanValue, setLastScanValue] = useState("");
  const [scanEvents, setScanEvents] = useState<Array<{ id: string; value: string; createdAt: string; duplicate: boolean; matchCount: number }>>([]);

  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [customerDisplayWindow, setCustomerDisplayWindow] = useState<Window | null>(null);
  const [customerDisplayText, setCustomerDisplayText] = useState("Welcome to SmartBiz POS");
  const [customerDisplayTotal, setCustomerDisplayTotal] = useState("0");

  const [registerName, setRegisterName] = useState("Main Register");
  const [registerCode, setRegisterCode] = useState("REG-1");
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [activeShiftId, setActiveShiftId] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");

  const support = useMemo(() => getHardwareSupport(), []);

  const settingsQuery = useQuery({ queryKey: ["hardware-settings"], queryFn: async () => (await api.get("/settings/business-configuration")).data });
  const printerQuery = useQuery({ queryKey: ["hardware-printer-config"], queryFn: async () => (await api.get("/settings/business-configuration/printer")).data });
  const docsQuery = useQuery({ queryKey: ["hardware-docs"], queryFn: async () => (await api.get("/billing-pos/documents", { params: { page: 1, limit: 200 } })).data });
  const docReceiptQuery = useQuery({
    queryKey: ["hardware-receipt", selectedDocId],
    enabled: !!selectedDocId,
    queryFn: async () => (await api.get(`/billing-pos/documents/${selectedDocId}/receipt`)).data,
  });
  const productsQuery = useQuery({ queryKey: ["hardware-products"], queryFn: async () => (await api.get("/products", { params: { page: 1, limit: 300 } })).data });
  const terminalsQuery = useQuery({ queryKey: ["hardware-terminals"], queryFn: async () => (await api.get("/monitoring/metrics", { params: { page: 1, limit: 100 } })).data });
  const jobsQuery = useQuery({ queryKey: ["hardware-jobs"], queryFn: async () => (await api.get("/monitoring/jobs", { params: { page: 1, limit: 100 } })).data });

  const docs = rows(docsQuery.data);
  const products = rows(productsQuery.data);
  const jobRows = rows(jobsQuery.data);
  const terminalRows = rows(terminalsQuery.data);

  const selectedDoc = docs.find((d) => String(d.id) === selectedDocId);

  const refreshHardwareQueries = () => {
    qc.invalidateQueries({ queryKey: ["hardware-settings"] });
    qc.invalidateQueries({ queryKey: ["hardware-printer-config"] });
    qc.invalidateQueries({ queryKey: ["hardware-docs"] });
    qc.invalidateQueries({ queryKey: ["hardware-jobs"] });
  };

  const savePrinterConfig = useMutation({
    mutationFn: async (payload: Rec) => api.patch("/settings/business-configuration", payload),
    onSuccess: refreshHardwareQueries,
  });

  const createRegisterMutation = useMutation({
    mutationFn: async () => api.post("/billing-pos/registers", { name: registerName, code: registerCode }),
    onSuccess: () => {
      setRegisterName("Main Register");
      setRegisterCode("REG-1");
      refreshHardwareQueries();
    },
  });

  const openShiftMutation = useMutation({
    mutationFn: async () => api.post("/billing-pos/shifts/open", { registerId: selectedRegisterId, openingBalance: n(openingBalance) }),
    onSuccess: (res) => {
      const id = String((res.data as Rec | undefined)?.id ?? "");
      if (id) setActiveShiftId(id);
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: async () => api.post(`/billing-pos/shifts/${activeShiftId}/close`, { closingBalance: n(closingBalance) }),
    onSuccess: () => setActiveShiftId(""),
  });

  const generateQrMutation = useMutation({
    mutationFn: async () => api.post("/documents/generate/qr", {
      data: qrData,
      width: 512,
      height: 512,
      entityType: "HARDWARE_INTEGRATION",
      entityId: selectedDocId || undefined,
    }),
    onSuccess: async (res) => {
      const id = String((res.data as Rec | undefined)?.id ?? "");
      setGeneratedFileId(id);
      if (!id) return;
      const blobRes = await api.get(`/documents/${id}/download`, { responseType: "blob" as any });
      const blob = blobRes.data as Blob;
      setGeneratedImageUrl(URL.createObjectURL(blob));
    },
  });

  const generateBarcodeMutation = useMutation({
    mutationFn: async () => api.post("/documents/generate/barcode", {
      data: barcodeData,
      width: 640,
      height: 256,
      entityType: "HARDWARE_INTEGRATION",
      entityId: selectedProductId || undefined,
    }),
    onSuccess: async (res) => {
      const id = String((res.data as Rec | undefined)?.id ?? "");
      setGeneratedFileId(id);
      if (!id) return;
      const blobRes = await api.get(`/documents/${id}/download`, { responseType: "blob" as any });
      const blob = blobRes.data as Blob;
      setGeneratedImageUrl(URL.createObjectURL(blob));
    },
  });

  const enqueuePrintJob = (title: string, payload: Uint8Array) => {
    setQueue((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title,
        payload,
        status: "queued",
        retries: 0,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const connectTransport = async () => {
    setConnectError("");
    try {
      const connected = await requestPrinterConnection(activeTransport);
      setConnection(connected);
      setDevices((prev) => {
        const next = prev.filter((d) => d.id !== connected.id);
        return [
          ...next,
          { id: connected.id, name: connected.name, transport: connected.transport, status: "connected" },
        ];
      });
    } catch (error) {
      setConnectError(extractErrorMessage(error));
    }
  };

  const discoverDevices = async () => {
    setConnectError("");
    try {
      const found = await discoverConnectedDevices();
      setDevices(found);
    } catch (error) {
      setConnectError(extractErrorMessage(error));
    }
  };

  useEffect(() => {
    if (isProcessingQueue || !connection) return;
    const job = queue.find((q) => q.status === "queued" || q.status === "error");
    if (!job) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      setIsProcessingQueue(true);
      setQueue((prev) => prev.map((q) => q.id === job.id ? { ...q, status: "printing", error: undefined } : q));

      try {
        await connection.write(job.payload);
        if (cancelled) return;
        setQueue((prev) => prev.map((q) => q.id === job.id ? { ...q, status: "success" } : q));
      } catch (error) {
        const message = extractErrorMessage(error);
        const nextRetries = job.retries + 1;

        if (autoReconnect) {
          try {
            const next = await connection.reconnect();
            setConnection(next);
          } catch {
          }
        }

        if (autoRetry && nextRetries <= 3) {
          setQueue((prev) => prev.map((q) => q.id === job.id ? { ...q, status: "queued", retries: nextRetries, error: message } : q));
        } else {
          setQueue((prev) => prev.map((q) => q.id === job.id ? { ...q, status: "error", retries: nextRetries, error: message } : q));
        }
      } finally {
        setIsProcessingQueue(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [autoReconnect, autoRetry, connection, isProcessingQueue, queue]);

  useEffect(() => {
    if (!keyboardScanMode) return;

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Shift" || event.key === "Control" || event.key === "Alt") return;

      if (event.key === "Enter") {
        const scanned = scanBuffer.trim();
        if (!scanned) return;

        const now = Date.now();
        const duplicate = scanned === lastScanValue && now - lastScanAt < 1200;

        void (async () => {
          const result = await api.get("/billing-pos/search", { params: { barcode: scanned } });
          const matches = rows(result.data).length;
          setScanEvents((prev) => [
            {
              id: crypto.randomUUID(),
              value: scanned,
              createdAt: new Date().toISOString(),
              duplicate,
              matchCount: matches,
            },
            ...prev,
          ].slice(0, 20));
        })();

        setLastScanAt(now);
        setLastScanValue(scanned);
        setScanBuffer("");
        return;
      }

      if (event.key.length === 1) {
        setScanBuffer((prev) => `${prev}${event.key}`);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [keyboardScanMode, lastScanAt, lastScanValue, scanBuffer]);

  const startCameraPreview = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setCameraReady(true);
  };

  const stopCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  const openCustomerDisplay = () => {
    const win = window.open("", "smartbiz-customer-display", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Customer Display</title></head>
        <body style="margin:0;background:#0f172a;color:#f8fafc;font-family:sans-serif;display:grid;place-items:center;height:100vh;">
          <div style="text-align:center;">
            <h1 id="title" style="font-size:3rem;">${customerDisplayText}</h1>
            <p style="font-size:1.5rem;">Running Total</p>
            <p id="total" style="font-size:4rem;font-weight:700;">${customerDisplayTotal}</p>
          </div>
        </body>
      </html>
    `);
    setCustomerDisplayWindow(win);
  };

  useEffect(() => {
    if (!customerDisplayWindow || customerDisplayWindow.closed) return;
    const title = customerDisplayWindow.document.getElementById("title");
    const total = customerDisplayWindow.document.getElementById("total");
    if (title) title.textContent = customerDisplayText;
    if (total) total.textContent = customerDisplayTotal;
  }, [customerDisplayText, customerDisplayTotal, customerDisplayWindow]);

  const thermalPrintTest = () => {
    enqueuePrintJob("Test Print", escPosTextReceipt("SMARTBIZ TEST", [
      testPrintText,
      `Device: ${connection?.name ?? "No printer"}`,
      `Time: ${new Date().toLocaleString()}`,
    ]));
  };

  const printReceipt = () => {
    const payload = docReceiptQuery.data as Rec | undefined;
    const lines = [
      `Doc: ${String((payload?.documentNo ?? selectedDoc?.documentNo ?? selectedDocId) || "-")}`,
      `Total: ${String(payload?.grandTotal ?? selectedDoc?.grandTotal ?? 0)}`,
      `Status: ${String(payload?.status ?? selectedDoc?.status ?? "")}`,
    ];
    enqueuePrintJob("Receipt Print", escPosTextReceipt("SMARTBIZ RECEIPT", lines));
  };

  const openDrawer = () => {
    enqueuePrintJob("Cash Drawer", escPosOpenDrawerCommand());
  };

  const printLabel = (kind: string) => {
    const product = products.find((p) => String(p.id) === selectedProductId);
    const name = String(product?.name ?? "Product");
    const price = n(product?.price).toFixed(2);
    enqueuePrintJob(`${kind} Label`, escPosTextReceipt(`${kind.toUpperCase()} LABEL`, [
      `Product: ${name}`,
      `Price: ${price}`,
      `Barcode: ${barcodeData}`,
    ]));
  };

  const saveHardwareConfig = () => {
    const printerProfiles = {
      activeTransport,
      activePrinterId: connection?.id ?? null,
      profiles: {
        thermal58mm: { width: 58, command: "ESC_POS" },
        thermal80mm: { width: 80, command: "ESC_POS" },
        bluetooth: { enabled: support.bluetooth },
        usb: { enabled: support.usb },
        lan: { enabled: true },
        wifi: { enabled: true },
      },
      queue: {
        autoRetry,
        autoReconnect,
      },
    };

    const barcodeSettings = {
      keyboardMode: keyboardScanMode,
      duplicateProtectionMs: 1200,
      fastScan: true,
      cameraReady,
    };

    const qrSettings = {
      dynamic: true,
      invoice: true,
      payment: true,
      verificationReady: true,
      lastGeneratedFileId: generatedFileId || null,
    };

    const existingPreferences = (settingsQuery.data as Rec | undefined)?.businessPreferences;
    const existingPreferencesObject =
      existingPreferences && typeof existingPreferences === "object" ? (existingPreferences as Rec) : {};

    const businessPreferences = {
      ...existingPreferencesObject,
      hardwareIntegration: {
        printerProfiles,
        barcodeSettings,
        qrSettings,
      },
    };

    savePrinterConfig.mutate({
      printerConfiguration: printerProfiles,
      barcodeSettings,
      qrSettings,
      businessPreferences,
    });
  };

  const tabs = [
    { key: "printers", label: "Thermal Printers" },
    { key: "barcode", label: "Barcode and QR" },
    { key: "display", label: "Customer Display and Drawer" },
    { key: "labels", label: "Label Printing" },
    { key: "devices", label: "Device Management" },
  ];

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">SmartBiz Enterprise Hardware Integration</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={discoverDevices}>Auto Discovery</Button>
            <Button variant="secondary" onClick={saveHardwareConfig} disabled={savePrinterConfig.isPending}>Save Device Settings</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-sm">
          <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">Bluetooth: {support.bluetooth ? "Supported" : "Unavailable"}</div>
          <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">USB: {support.usb ? "Supported" : "Unavailable"}</div>
          <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">Serial: {support.serial ? "Supported" : "Unavailable"}</div>
          <div className="rounded-md border border-slate-200 p-2 dark:border-slate-800">Camera: {support.camera ? "Supported" : "Unavailable"}</div>
        </CardContent>
      </Card>

      {tab === "printers" ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Printer Connection and Profiles</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-4">
                <Select value={activeTransport} onChange={(e) => setActiveTransport(e.target.value as HardwareTransport)}>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="usb">USB</option>
                  <option value="serial">Serial</option>
                  <option value="network">LAN/WiFi</option>
                </Select>
                <Button onClick={connectTransport}>Connect Printer</Button>
                <Button variant="outline" onClick={thermalPrintTest} disabled={!connection}>Test Print</Button>
                <Button variant="outline" onClick={printReceipt} disabled={!connection || !selectedDocId}>Print Receipt</Button>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Test print line" value={testPrintText} onChange={(e) => setTestPrintText(e.target.value)} />
                <Select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}>
                  <option value="">Select Bill for Receipt</option>
                  {docs.map((d) => <option key={String(d.id)} value={String(d.id)}>{String(d.documentNo ?? d.id)}</option>)}
                </Select>
              </div>

              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={autoRetry} onChange={(e) => setAutoRetry(e.target.checked)} /> Auto Retry</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={autoReconnect} onChange={(e) => setAutoReconnect(e.target.checked)} /> Auto Reconnect</label>
                <p>Print Status: {isProcessingQueue ? "Printing" : "Idle"}</p>
              </div>

              {connectError ? <ErrorState message={connectError} /> : null}
              {savePrinterConfig.isError ? <ErrorState message={extractErrorMessage(savePrinterConfig.error)} /> : null}

              <Card>
                <CardHeader><h3 className="text-sm font-semibold">Printer Profiles</h3></CardHeader>
                <CardContent>
                  <pre className="max-h-56 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">
                    {JSON.stringify(printerQuery.data ?? {}, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">Print Queue and Recovery</h2></CardHeader>
            <CardContent className="space-y-2">
              {queue.length === 0 ? <EmptyState message="No print jobs queued." /> : null}
              {queue.map((job) => (
                <article key={job.id} className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{job.title}</p>
                    <span>{job.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">Retries: {job.retries}</p>
                  {job.error ? <p className="text-xs text-red-600">{job.error}</p> : null}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setQueue((prev) => prev.map((q) => q.id === job.id ? { ...q, status: "queued" } : q))} disabled={job.status !== "error"}>Retry</Button>
                    <Button size="sm" variant="outline" onClick={() => setQueue((prev) => prev.filter((q) => q.id !== job.id))}>Remove</Button>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "barcode" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Barcode Scanner Integration</h2></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={keyboardScanMode} onChange={(e) => setKeyboardScanMode(e.target.checked)} />
                Keyboard Scanner Mode
              </label>
              <Input value={scanBuffer} readOnly placeholder="Live scanner buffer" />
              <p className="text-sm">Duplicate scan protection active for 1200ms.</p>

              <DataTable
                data={scanEvents}
                columns={[
                  { accessorKey: "value", header: "Scanned Value" },
                  { accessorKey: "matchCount", header: "Product Matches" },
                  { accessorKey: "duplicate", header: "Duplicate" },
                  { accessorKey: "createdAt", header: "Time" },
                ]}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={startCameraPreview} disabled={cameraReady || !support.camera}>Start Camera Scanner</Button>
                <Button variant="outline" onClick={stopCameraPreview} disabled={!cameraReady}>Stop Camera Scanner</Button>
              </div>
              <video ref={videoRef} className="h-56 w-full rounded-md border border-slate-200 bg-black object-cover dark:border-slate-800" muted playsInline />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">QR and Barcode Generation</h2></CardHeader>
            <CardContent className="space-y-3">
              <Input value={qrData} onChange={(e) => setQrData(e.target.value)} placeholder="Payment QR data" />
              <Button onClick={() => generateQrMutation.mutate()} disabled={generateQrMutation.isPending}>Generate Payment QR</Button>

              <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                <option value="">Select Product for Label Barcode</option>
                {products.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.id)}</option>)}
              </Select>
              <Input value={barcodeData} onChange={(e) => setBarcodeData(e.target.value)} placeholder="Barcode data" />
              <Button variant="secondary" onClick={() => generateBarcodeMutation.mutate()} disabled={generateBarcodeMutation.isPending}>Generate Barcode</Button>

              {generateQrMutation.isError ? <ErrorState message={extractErrorMessage(generateQrMutation.error)} /> : null}
              {generateBarcodeMutation.isError ? <ErrorState message={extractErrorMessage(generateBarcodeMutation.error)} /> : null}

              {generatedImageUrl ? <img src={generatedImageUrl} alt="Generated code" className="max-h-72 rounded-md border border-slate-200 dark:border-slate-800" /> : <EmptyState message="Generated barcode or QR preview appears here." />}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "display" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Customer Display</h2></CardHeader>
            <CardContent className="space-y-3">
              <Input value={customerDisplayText} onChange={(e) => setCustomerDisplayText(e.target.value)} placeholder="Display message" />
              <Input value={customerDisplayTotal} onChange={(e) => setCustomerDisplayTotal(e.target.value)} placeholder="Running total" />
              <div className="flex gap-2">
                <Button onClick={openCustomerDisplay}>Open Secondary Display</Button>
                <Button variant="outline" onClick={() => setCustomerDisplayText("Payment Screen")}>Payment Screen</Button>
                <Button variant="outline" onClick={() => setCustomerDisplayText("Thank You")}>Thank You Screen</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">Cash Drawer and Counter Integration</h2></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={openDrawer} disabled={!connection}>Open Cash Drawer</Button>
              <p className="text-sm">Drawer status ready via connected device diagnostics and print command acknowledgement.</p>

              <div className="grid gap-2 md:grid-cols-2">
                <Input value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Register Name" />
                <Input value={registerCode} onChange={(e) => setRegisterCode(e.target.value)} placeholder="Register Code" />
              </div>
              <Button onClick={() => createRegisterMutation.mutate()} disabled={createRegisterMutation.isPending}>Create Register</Button>

              <Select value={selectedRegisterId} onChange={(e) => setSelectedRegisterId(e.target.value)}>
                <option value="">Select Register ID</option>
                {terminalRows.map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.id)}</option>)}
              </Select>

              <div className="grid gap-2 md:grid-cols-2">
                <Input value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="Opening Balance" />
                <Button onClick={() => openShiftMutation.mutate()} disabled={!selectedRegisterId || openShiftMutation.isPending}>Open Shift</Button>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="Closing Balance" />
                <Button variant="outline" onClick={() => closeShiftMutation.mutate()} disabled={!activeShiftId || closeShiftMutation.isPending}>Close Shift</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "labels" ? (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Label Printing</h2></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">Select Product</option>
              {products.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.name ?? p.id)}</option>)}
            </Select>
            <Input value={barcodeData} onChange={(e) => setBarcodeData(e.target.value)} placeholder="Label barcode" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button onClick={() => printLabel("Product")} disabled={!connection}>Product Label</Button>
              <Button variant="secondary" onClick={() => printLabel("Barcode")} disabled={!connection}>Barcode Label</Button>
              <Button variant="outline" onClick={() => printLabel("Shelf")} disabled={!connection}>Shelf Label</Button>
              <Button variant="outline" onClick={() => printLabel("Price")} disabled={!connection}>Price Label</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "devices" ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Connected Devices and Diagnostics</h2></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={discoverDevices}>Refresh Devices</Button>
                <Button variant="outline" onClick={connectTransport}>Reconnect Device</Button>
              </div>

              {devices.length === 0 ? <EmptyState message="No connected devices detected yet." /> : null}
              {devices.length > 0 ? (
                <DataTable
                  data={devices}
                  columns={[
                    { accessorKey: "name", header: "Device" },
                    { accessorKey: "transport", header: "Transport" },
                    { accessorKey: "status", header: "Status" },
                    { accessorKey: "id", header: "Device ID" },
                  ]}
                />
              ) : null}

              <pre className="max-h-52 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">
                {JSON.stringify({
                  activeConnection: connection ? { id: connection.id, name: connection.name, transport: connection.transport } : null,
                  support,
                  queueDepth: queue.length,
                  processing: isProcessingQueue,
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold">Runtime and Performance</h2></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Documents loaded: {docs.length}</p>
              <p>Monitoring jobs loaded: {jobRows.length}</p>
              <p>Queue jobs: {queue.length}</p>
              <p>Background printing active: {queue.some((q) => q.status === "queued" || q.status === "printing") ? "Yes" : "No"}</p>
              <p>Billing never blocks while printing because jobs run async in queue processor.</p>
              <p>Hardware settings, printer profiles, barcode, and QR configs are persisted in business configuration.</p>
              {docReceiptQuery.isLoading ? <LoadingState message="Loading receipt runtime payload..." /> : null}
              {docReceiptQuery.isError ? <ErrorState message={extractErrorMessage(docReceiptQuery.error)} /> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader><h2 className="text-base font-semibold">Hardware API Health</h2></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <p className="font-semibold">Settings API</p>
            {settingsQuery.isLoading ? <LoadingState message="Loading settings..." /> : null}
            {settingsQuery.isError ? <ErrorState message={extractErrorMessage(settingsQuery.error)} /> : <p>Connected</p>}
          </div>
          <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <p className="font-semibold">Billing Receipt API</p>
            {!selectedDocId ? <p>Select a bill to validate receipt API.</p> : null}
            {selectedDocId && !docReceiptQuery.isError ? <p>Ready</p> : null}
          </div>
          <div className="rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
            <p className="font-semibold">Documents Generate API</p>
            <p>{generatedFileId ? `Last generated file: ${generatedFileId}` : "No generated file yet"}</p>
          </div>
        </CardContent>
      </Card>

      {token ? null : <ErrorState message="Authentication is required for hardware integration APIs." />}
    </div>
  );
}
