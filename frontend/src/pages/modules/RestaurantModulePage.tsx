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

const tableStatuses = ["AVAILABLE", "OCCUPIED", "CLEANING"] as const;
const orderTypes = ["DINE_IN", "TAKEAWAY", "DELIVERY"] as const;
const kotStatuses = ["QUEUED", "READY", "CANCELLED"] as const;
const orderStatuses = ["PENDING", "SENT_TO_KITCHEN", "READY", "BILLED", "CANCELLED"] as const;

export default function RestaurantModulePage() {
  const qc = useQueryClient();
  const { can } = usePermissions();

  const tableQuery = useQuery({
    queryKey: ["industry", "restaurant", "tables"],
    queryFn: async () => (await api.get("/tables")).data as Array<Record<string, unknown>>,
    enabled: can("pos.manage") || can("billing.read"),
  });

  const orderQuery = useQuery({
    queryKey: ["industry", "restaurant", "orders"],
    queryFn: async () => (await api.get("/orders")).data as Array<Record<string, unknown>>,
    enabled: can("billing.read") || can("pos.manage"),
  });

  const reportQuery = useQuery({
    queryKey: ["industry", "restaurant", "reports", "sales-daily"],
    queryFn: async () => (await api.get("/reports-analytics/sales/daily")).data,
    enabled: can("reports.read"),
  });

  const remindersQuery = useQuery({
    queryKey: ["industry", "restaurant", "reminders"],
    queryFn: async () => (await api.get("/notifications/reminders", { params: { page: 1, limit: 50 } })).data,
    enabled: can("notification.reminder.read") || can("notification.queue.read"),
  });

  const productQuery = useQuery({
    queryKey: ["industry", "restaurant", "products", "catalog"],
    queryFn: async () =>
      (await api.get("/products", { params: { page: 1, limit: 200, q: "" } })).data as
      | { items?: Array<Record<string, unknown>> }
      | Array<Record<string, unknown>>,
    enabled: can("product.read"),
  });

  const createTableMutation = useMutation({
    mutationFn: async (payload: { label: string; capacity: number }) => api.post("/tables", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "restaurant", "tables"] }),
  });

  const updateTableStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string }) => api.patch(`/tables/${payload.id}/status`, { status: payload.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "restaurant", "tables"] }),
  });

  const createOrderMutation = useMutation({
    mutationFn: async (payload: {
      tableId?: string;
      customerId?: string;
      type: string;
      notes?: string;
      items: Array<{ productId: string; quantity: number; modifiers?: Record<string, unknown> }>;
    }) => api.post("/orders", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "restaurant", "orders"] }),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string }) => api.patch(`/orders/${payload.id}/status`, { status: payload.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "restaurant", "orders"] }),
  });

  const updateKotMutation = useMutation({
    mutationFn: async (payload: { orderItemId: string; status: string }) => api.patch(`/orders/items/${payload.orderItemId}/kot-status`, { status: payload.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "restaurant", "orders"] }),
  });

  const createReminderMutation = useMutation({
    mutationFn: async (payload: { title: string; message: string; remindAt: string; payload?: Record<string, unknown> }) =>
      api.post("/notifications/reminders", {
        eventType: "REMINDER",
        title: payload.title,
        message: payload.message,
        remindAt: payload.remindAt,
        payload: payload.payload,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industry", "restaurant", "reminders"] }),
  });

  const createCodeMutation = useMutation({
    mutationFn: async (payload: { data: string }) => api.post("/documents/generate/qr", payload),
  });

  const restaurantProducts = useMemo(() => {
    const payload = productQuery.data;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
    return [];
  }, [productQuery.data]);

  const orderRows = useMemo(() => {
    if (!Array.isArray(orderQuery.data)) return [];
    return orderQuery.data;
  }, [orderQuery.data]);

  const reminderRows = useMemo(() => {
    const payload = remindersQuery.data as { items?: Array<Record<string, unknown>> } | undefined;
    return payload?.items ?? [];
  }, [remindersQuery.data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Restaurant Module</h1>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Tables" value={Array.isArray(tableQuery.data) ? tableQuery.data.length : 0} />
          <Metric label="Orders" value={orderRows.length} />
          <Metric label="Kitchen Queue" value={orderRows.filter((order) => String(order.status ?? "") === "SENT_TO_KITCHEN").length} />
          <Metric label="Reservations Ready" value={reminderRows.length} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Tables and Status</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <TableCreateForm
              disabled={!can("pos.manage")}
              loading={createTableMutation.isPending}
              onCreate={(payload) => createTableMutation.mutate(payload)}
            />
            {createTableMutation.isError ? <ErrorState message={extractErrorMessage(createTableMutation.error)} /> : null}
            {tableQuery.isLoading ? <LoadingState message="Loading tables..." /> : null}
            {tableQuery.isError ? <ErrorState message={extractErrorMessage(tableQuery.error)} /> : null}
            {!tableQuery.isLoading && !tableQuery.isError && Array.isArray(tableQuery.data) && tableQuery.data.length === 0 ? <EmptyState message="No tables configured." /> : null}
            {Array.isArray(tableQuery.data) && tableQuery.data.length > 0 ? (
              <DataTable
                data={tableQuery.data}
                columns={[
                  { accessorKey: "label", header: "Table" },
                  { accessorKey: "capacity", header: "Capacity" },
                  { accessorKey: "status", header: "Status" },
                  {
                    id: "changeStatus",
                    header: "Update",
                    cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
                      <div className="flex flex-wrap gap-2">
                        {tableStatuses.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            disabled={!can("pos.manage") || updateTableStatusMutation.isPending}
                            onClick={() =>
                              updateTableStatusMutation.mutate({
                                id: String(row.original.id),
                                status,
                              })
                            }
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Order Queue and KOT</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <OrderCreateForm
              products={restaurantProducts}
              tables={Array.isArray(tableQuery.data) ? tableQuery.data : []}
              disabled={!can("pos.manage")}
              loading={createOrderMutation.isPending}
              onCreate={(payload) => createOrderMutation.mutate(payload)}
            />
            {createOrderMutation.isError ? <ErrorState message={extractErrorMessage(createOrderMutation.error)} /> : null}
            {orderQuery.isLoading ? <LoadingState message="Loading orders..." /> : null}
            {orderQuery.isError ? <ErrorState message={extractErrorMessage(orderQuery.error)} /> : null}
            {orderRows.length === 0 && !orderQuery.isLoading && !orderQuery.isError ? <EmptyState message="No active orders." /> : null}
            {orderRows.length > 0 ? (
              <DataTable
                data={orderRows}
                columns={[
                  { accessorKey: "id", header: "Order" },
                  { accessorKey: "type", header: "Type" },
                  { accessorKey: "tableId", header: "Table" },
                  { accessorKey: "status", header: "Status" },
                  {
                    id: "statusControls",
                    header: "Order Status",
                    cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
                      <div className="flex flex-wrap gap-2">
                        {orderStatuses.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant="outline"
                            disabled={!can("pos.manage") || updateOrderStatusMutation.isPending}
                            onClick={() => updateOrderStatusMutation.mutate({ id: String(row.original.id), status })}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    ),
                  },
                  {
                    id: "kotControls",
                    header: "KOT",
                    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
                      const items = Array.isArray(row.original.items) ? (row.original.items as Array<Record<string, unknown>>) : [];
                      const firstItem = items[0];
                      if (!firstItem?.id) return <span>-</span>;
                      return (
                        <div className="flex flex-wrap gap-2">
                          {kotStatuses.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="secondary"
                              disabled={!can("pos.manage") || updateKotMutation.isPending}
                              onClick={() =>
                                updateKotMutation.mutate({
                                  orderItemId: String(firstItem.id),
                                  status,
                                })
                              }
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      );
                    },
                  },
                ]}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Reservations and Waiter Assignment</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReminderForm disabled={!can("notification.reminder.create")} loading={createReminderMutation.isPending} onCreate={(payload) => createReminderMutation.mutate(payload)} />
            {createReminderMutation.isError ? <ErrorState message={extractErrorMessage(createReminderMutation.error)} /> : null}
            {remindersQuery.isLoading ? <LoadingState message="Loading reminders..." /> : null}
            {remindersQuery.isError ? <ErrorState message={extractErrorMessage(remindersQuery.error)} /> : null}
            {reminderRows.length === 0 && !remindersQuery.isLoading && !remindersQuery.isError ? <EmptyState message="No reservation reminders." /> : null}
            {reminderRows.length > 0 ? (
              <DataTable
                data={reminderRows}
                columns={[
                  { accessorKey: "title", header: "Reservation" },
                  { accessorKey: "message", header: "Details" },
                  { accessorKey: "remindAt", header: "Time" },
                  {
                    id: "assignment",
                    header: "Waiter",
                    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
                      const payload = row.original.payload as Record<string, unknown> | undefined;
                      return <span>{String(payload?.waiterId ?? "Unassigned")}</span>;
                    },
                  },
                ]}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Delivery and Takeaway Ready</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Order types are enforced through existing order APIs with DINE_IN, TAKEAWAY, DELIVERY.</p>
            <p>Generate QR for table menu or pickup identifiers using the existing documents API.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={!can("document.generate") || createCodeMutation.isPending}
                onClick={() => createCodeMutation.mutate({ data: `restaurant:${Date.now()}` })}
              >
                Generate Service QR
              </Button>
              {createCodeMutation.isError ? <ErrorState message={extractErrorMessage(createCodeMutation.error)} /> : null}
              {createCodeMutation.isSuccess ? <span className="text-emerald-600 dark:text-emerald-400">QR generated</span> : null}
            </div>
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold">Daily Sales Feed</h3>
              {reportQuery.isLoading ? <LoadingState message="Loading restaurant reports..." /> : null}
              {reportQuery.isError ? <ErrorState message={extractErrorMessage(reportQuery.error)} /> : null}
              {reportQuery.data ? (
                <pre className="max-h-52 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(reportQuery.data, null, 2)}</pre>
              ) : null}
            </div>
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

function TableCreateForm({
  disabled,
  loading,
  onCreate,
}: {
  disabled: boolean;
  loading: boolean;
  onCreate: (payload: { label: string; capacity: number }) => void;
}) {
  const [label, setLabel] = useState("");
  const [capacity, setCapacity] = useState("4");

  return (
    <div className="grid gap-2 md:grid-cols-3">
      <Input placeholder="Table Label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input placeholder="Capacity" type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
      <Button
        disabled={disabled || loading || !label.trim()}
        onClick={() => {
          onCreate({ label: label.trim(), capacity: Math.max(1, Number(capacity) || 1) });
          setLabel("");
          setCapacity("4");
        }}
      >
        Add Table
      </Button>
    </div>
  );
}

function OrderCreateForm({
  products,
  tables,
  disabled,
  loading,
  onCreate,
}: {
  products: Array<Record<string, unknown>>;
  tables: Array<Record<string, unknown>>;
  disabled: boolean;
  loading: boolean;
  onCreate: (payload: {
    tableId?: string;
    type: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
  }) => void;
}) {
  const [orderType, setOrderType] = useState<(typeof orderTypes)[number]>("DINE_IN");
  const [tableId, setTableId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-semibold">Create Order</p>
      <div className="grid gap-2 md:grid-cols-2">
        <Select value={orderType} onChange={(event) => setOrderType(event.target.value as (typeof orderTypes)[number])}>
          {orderTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
        <Select value={tableId} onChange={(event) => setTableId(event.target.value)}>
          <option value="">No Table</option>
          {tables.map((table) => (
            <option key={String(table.id)} value={String(table.id)}>{String(table.label ?? table.id)}</option>
          ))}
        </Select>
        <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Select Product</option>
          {products.map((product) => (
            <option key={String(product.id)} value={String(product.id)}>{String(product.name ?? product.id)}</option>
          ))}
        </Select>
        <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </div>
      <Textarea placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Button
        disabled={disabled || loading || !productId}
        onClick={() => {
          onCreate({
            tableId: tableId || undefined,
            type: orderType,
            notes: notes || undefined,
            items: [{ productId, quantity: Math.max(1, Number(quantity) || 1) }],
          });
          setQuantity("1");
          setNotes("");
        }}
      >
        Create Order
      </Button>
    </div>
  );
}

function ReminderForm({
  disabled,
  loading,
  onCreate,
}: {
  disabled: boolean;
  loading: boolean;
  onCreate: (payload: { title: string; message: string; remindAt: string; payload?: Record<string, unknown> }) => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [waiterId, setWaiterId] = useState("");

  return (
    <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-sm font-semibold">Create Reservation Reminder</p>
      <div className="grid gap-2 md:grid-cols-2">
        <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input placeholder="Waiter ID" value={waiterId} onChange={(event) => setWaiterId(event.target.value)} />
      </div>
      <Textarea placeholder="Message" value={message} onChange={(event) => setMessage(event.target.value)} />
      <Input type="datetime-local" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} />
      <Button
        disabled={disabled || loading || !title || !message || !remindAt}
        onClick={() => {
          onCreate({
            title,
            message,
            remindAt: new Date(remindAt).toISOString(),
            payload: waiterId ? { waiterId } : undefined,
          });
          setTitle("");
          setMessage("");
          setRemindAt("");
          setWaiterId("");
        }}
      >
        Save Reservation
      </Button>
    </div>
  );
}
