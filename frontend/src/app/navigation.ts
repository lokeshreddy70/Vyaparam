export type AppNavItem = {
  key: string;
  label: string;
  path: string;
  permission?: string;
  section: "core" | "foundation" | "system";
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { key: "core-platform-admin", label: "Platform Admin", path: "/platform-admin", permission: "business.manage", section: "core" },
  { key: "core-dashboard", label: "Dashboard", path: "/", permission: "reports.read", section: "core" },
  { key: "core-products", label: "Products", path: "/products", permission: "product.read", section: "core" },
  { key: "core-categories", label: "Categories", path: "/categories", permission: "category.read", section: "core" },
  { key: "core-inventory", label: "Inventory", path: "/inventory", permission: "inventory.read", section: "core" },
  { key: "core-warehouses", label: "Warehouses", path: "/warehouses", permission: "inventory.read", section: "core" },
  { key: "core-customers", label: "Customers", path: "/customers", permission: "customer.read", section: "core" },
  { key: "core-suppliers", label: "Suppliers", path: "/suppliers", permission: "supplier.read", section: "core" },
  { key: "core-billing", label: "Billing", path: "/billing", permission: "billing.read", section: "core" },
  { key: "core-pos", label: "POS", path: "/pos", permission: "pos.manage", section: "core" },
  { key: "core-hardware", label: "Hardware", path: "/hardware-integration", permission: "pos.manage", section: "core" },
  { key: "core-reports", label: "Reports", path: "/reports", permission: "reports.read", section: "core" },
  { key: "core-hrms", label: "HRMS", path: "/hrms", permission: "employee.read", section: "core" },
  { key: "core-attendance", label: "Attendance", path: "/attendance", permission: "employee.read", section: "core" },
  { key: "core-payroll", label: "Payroll", path: "/payroll", permission: "employee.read", section: "core" },
  { key: "core-communication", label: "Communication", path: "/communication", permission: "notification.read", section: "core" },
  { key: "core-documents", label: "Files", path: "/documents", permission: "document.read", section: "core" },
  { key: "core-support", label: "Support", path: "/support", permission: "monitoring.read", section: "core" },
  { key: "core-monitoring", label: "Monitoring", path: "/monitoring", permission: "monitoring.read", section: "core" },
  { key: "core-audit", label: "Audit Logs", path: "/audit-logs", permission: "monitoring.audit.read", section: "core" },
  { key: "core-settings", label: "Business Settings", path: "/settings", permission: "business.read", section: "core" },
  { key: "foundation-overview", label: "Foundation Overview", path: "/foundation", section: "foundation" },
  { key: "foundation-components", label: "Component Library", path: "/foundation/components", section: "foundation" },
  { key: "foundation-forms", label: "Form Architecture", path: "/foundation/forms", section: "foundation" },
  { key: "foundation-tables", label: "Data Table Foundation", path: "/foundation/tables", section: "foundation" },
  { key: "foundation-charts", label: "Chart Foundation", path: "/foundation/charts", section: "foundation" },
  { key: "foundation-layout", label: "Layout Foundation", path: "/foundation/layout", section: "foundation" },
  { key: "system-403", label: "403 Access Denied", path: "/403", section: "system" },
  { key: "system-500", label: "500 System Error", path: "/500", section: "system" },
  { key: "system-maintenance", label: "Maintenance", path: "/maintenance", section: "system" },
  { key: "system-offline", label: "Offline", path: "/offline", section: "system" },
];
