import { EntityLedgerWorkspace } from "../components/app/EntityLedgerWorkspace";

export default function SuppliersPage() {
  return (
    <EntityLedgerWorkspace
      config={{
        title: "Suppliers",
        endpoint: "/suppliers",
        queryKey: "suppliers",
        permissionRead: "supplier.read",
        permissionManage: "supplier.manage",
        searchParam: "q",
        supportsRestore: true,
        importPath: "/suppliers/import",
        exportPath: "/suppliers/export",
        ledgerPath: "ledger",
        historyLabel: "Purchase History",
        filters: [
          { key: "email", label: "Email", type: "text" },
          { key: "phone", label: "Phone", type: "text" },
          { key: "creditLimitMin", label: "Min Credit", type: "number" },
          { key: "creditLimitMax", label: "Max Credit", type: "number" },
        ],
        fields: [
          { key: "name", label: "Name", required: true },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
          { key: "creditLimit", label: "Credit Limit", type: "number" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      }}
    />
  );
}
