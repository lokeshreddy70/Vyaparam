import { EntityLedgerWorkspace } from "../components/app/EntityLedgerWorkspace";

export default function CustomersPage() {
  return (
    <EntityLedgerWorkspace
      config={{
        title: "Customers",
        endpoint: "/customers",
        queryKey: "customers",
        permissionRead: "customer.read",
        permissionManage: "customer.manage",
        searchParam: "q",
        supportsRestore: true,
        importPath: "/customers/import",
        exportPath: "/customers/export",
        ledgerPath: "ledger",
        historyLabel: "Payment History",
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
