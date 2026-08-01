import type { PluginManifest, PluginModuleKey } from "./types";

const corePlugin: PluginManifest = {
  id: "core-platform",
  name: "Core Platform",
  category: "core",
  description: "Shared platform capabilities and foundational business modules.",
  version: "1.0.0",
  dependencies: [],
  permissions: ["business.read"],
  nav: [
    { key: "core-platform-admin", label: "Platform Admin", path: "/platform-admin", permission: "business.manage", section: "core" },
    { key: "core-plugin-platform", label: "Plugin Platform", path: "/plugin-platform", permission: "business.manage", section: "core" },
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
    { key: "core-ai-platform", label: "AI Platform", path: "/ai-platform", permission: "reports.read", section: "core" },
    { key: "core-hrms", label: "HRMS", path: "/hrms", permission: "employee.read", section: "core" },
    { key: "core-attendance", label: "Attendance", path: "/attendance", permission: "employee.read", section: "core" },
    { key: "core-payroll", label: "Payroll", path: "/payroll", permission: "employee.read", section: "core" },
    { key: "core-communication", label: "Communication", path: "/communication", permission: "notification.read", section: "core" },
    { key: "core-integration-hub", label: "Integration Hub", path: "/integration-hub", permission: "business.manage", section: "core" },
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
  ],
  routes: [
    { key: "route-dashboard", path: "/", permission: "reports.read", requiresTenant: true },
    { key: "route-platform-admin", path: "/platform-admin", permission: "business.manage", requiresTenant: true },
    { key: "route-plugin-platform", path: "/plugin-platform", permission: "business.manage", requiresTenant: true },
    { key: "route-products", path: "/products", permission: "product.read", requiresTenant: true },
    { key: "route-categories", path: "/categories", permission: "category.read", requiresTenant: true },
    { key: "route-inventory", path: "/inventory", permission: "inventory.read", requiresTenant: true },
    { key: "route-warehouses", path: "/warehouses", permission: "inventory.read", requiresTenant: true },
    { key: "route-customers", path: "/customers", permission: "customer.read", requiresTenant: true },
    { key: "route-suppliers", path: "/suppliers", permission: "supplier.read", requiresTenant: true },
    { key: "route-billing", path: "/billing", permission: "billing.read", requiresTenant: true },
    { key: "route-pos", path: "/pos", permission: "pos.manage", requiresTenant: true },
    { key: "route-hardware", path: "/hardware-integration", permission: "pos.manage", requiresTenant: true },
    { key: "route-reports", path: "/reports", permission: "reports.read", requiresTenant: true },
    { key: "route-ai-platform", path: "/ai-platform", permission: "reports.read", requiresTenant: true },
    { key: "route-hrms", path: "/hrms", permission: "employee.read", requiresTenant: true },
    { key: "route-attendance", path: "/attendance", permission: "employee.read", requiresTenant: true },
    { key: "route-payroll", path: "/payroll", permission: "employee.read", requiresTenant: true },
    { key: "route-communication", path: "/communication", permission: "notification.read", requiresTenant: true },
    { key: "route-integration-hub", path: "/integration-hub", permission: "business.manage", requiresTenant: true },
    { key: "route-documents", path: "/documents", permission: "document.read", requiresTenant: true },
    { key: "route-support", path: "/support", permission: "monitoring.read", requiresTenant: true },
    { key: "route-monitoring", path: "/monitoring", permission: "monitoring.read", requiresTenant: true },
    { key: "route-audit", path: "/audit-logs", permission: "monitoring.audit.read", requiresTenant: true },
    { key: "route-settings", path: "/settings", permission: "business.read", requiresTenant: true },
    { key: "route-foundation-overview", path: "/foundation" },
    { key: "route-foundation-components", path: "/foundation/components" },
    { key: "route-foundation-forms", path: "/foundation/forms" },
    { key: "route-foundation-tables", path: "/foundation/tables" },
    { key: "route-foundation-charts", path: "/foundation/charts" },
    { key: "route-foundation-layout", path: "/foundation/layout" },
  ],
};

type IndustryPluginInput = {
  id: string;
  key: PluginModuleKey;
  name: string;
  permission: string;
  featureFlag: string;
  industry: "restaurant" | "retail" | "pharmacy" | "generic";
  dependencies?: string[];
};

function buildIndustryPlugin(input: IndustryPluginInput): PluginManifest {
  const slug = input.id.replace(/^industry-/, "");

  return {
    id: input.id,
    moduleKey: input.key,
    name: input.name,
    category: "industry",
    description: `${input.name} module that extends the shared SmartBiz platform.`,
    version: "1.0.0",
    dependencies: ["core-platform", ...(input.dependencies ?? [])],
    permissions: [input.permission],
    nav: [
      {
        key: `${input.id}-home`,
        label: input.name,
        path: `/industry/${slug}`,
        section: "industry",
        permission: input.permission,
        featureFlag: input.featureFlag,
      },
    ],
    routes: [
      {
        key: `${input.id}-route`,
        path: `/industry/${slug}`,
        permission: input.permission,
        featureFlag: input.featureFlag,
        requiresTenant: true,
      },
    ],
    metadata: {
      industry: input.industry,
      tags: ["industry-module", input.industry],
      owner: "smartbiz-platform",
    },
    widgets: [
      { key: `${input.id}-widget-dashboard`, title: `${input.name} Dashboard`, endpoint: "/reports-analytics/dashboard", permission: "reports.read" },
      { key: `${input.id}-widget-low-stock`, title: `${input.name} Low Stock`, endpoint: "/inventory/low-stock", permission: "inventory.read" },
      { key: `${input.id}-widget-alerts`, title: `${input.name} Alerts`, endpoint: "/notifications/queue", permission: "notification.queue.read" },
    ],
    reports: [
      { key: `${input.id}-report-sales-daily`, label: "Daily Sales", endpoint: "/reports-analytics/sales/daily", permission: "reports.read" },
      { key: `${input.id}-report-top-products`, label: "Top Products", endpoint: "/reports-analytics/sales/top-products", permission: "reports.read" },
      { key: `${input.id}-report-inventory-low-stock`, label: "Low Stock", endpoint: "/reports-analytics/inventory/low-stock", permission: "reports.read" },
    ],
    configurationSchema: [
      { key: "moduleEnabled", label: "Module Enabled", type: "boolean" },
      { key: "featureFlags", label: "Feature Flags", type: "json" },
      { key: "alertThreshold", label: "Alert Threshold", type: "number" },
      { key: "dashboardLayout", label: "Dashboard Layout", type: "json" },
    ],
    migrations: [
      { key: `${input.id}-baseline`, version: "1.0.0", description: `Initialize ${input.name} module configuration container.` },
    ],
    healthChecks: [
      { key: `${input.id}-health`, endpoint: "/health" },
      { key: `${input.id}-inventory-health`, endpoint: "/inventory/low-stock", permission: "inventory.read" },
      { key: `${input.id}-reporting-health`, endpoint: "/reports-analytics/dashboard", permission: "reports.read" },
    ],
    defaultConfig: {
      workflows: ["sales", "inventory", "billing"],
      reporting: "standard",
    },
    defaultSettings: {
      rollout: "phased",
      telemetry: true,
    },
  };
}

const industryPlugins: PluginManifest[] = [
  buildIndustryPlugin({ id: "industry-restaurant", key: "RESTAURANT", name: "Restaurant", permission: "pos.manage", featureFlag: "industry.restaurant", industry: "restaurant" }),
  buildIndustryPlugin({ id: "industry-retail", key: "RETAIL", name: "Retail", permission: "inventory.read", featureFlag: "industry.retail", industry: "retail" }),
  buildIndustryPlugin({ id: "industry-pharmacy", key: "PHARMACY", name: "Pharmacy", permission: "inventory.read", featureFlag: "industry.pharmacy", industry: "pharmacy" }),
  buildIndustryPlugin({ id: "industry-medical", key: "MEDICAL", name: "Medical", permission: "employee.read", featureFlag: "industry.medical", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-bakery", key: "BAKERY", name: "Bakery", permission: "pos.manage", featureFlag: "industry.bakery", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-hardware", key: "HARDWARE", name: "Hardware", permission: "inventory.read", featureFlag: "industry.hardware", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-electronics", key: "ELECTRONICS", name: "Electronics", permission: "inventory.read", featureFlag: "industry.electronics", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-salon", key: "SALON", name: "Salon", permission: "employee.read", featureFlag: "industry.salon", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-gym", key: "GYM", name: "Gym", permission: "employee.read", featureFlag: "industry.gym", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-service-business", key: "SERVICE_BUSINESS", name: "Service Business", permission: "reports.read", featureFlag: "industry.serviceBusiness", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-manufacturing", key: "MANUFACTURING", name: "Manufacturing", permission: "inventory.read", featureFlag: "industry.manufacturing", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-warehouse", key: "WAREHOUSE", name: "Warehouse", permission: "inventory.read", featureFlag: "industry.warehouse", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-education", key: "EDUCATION", name: "Education", permission: "employee.read", featureFlag: "industry.education", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-hotel", key: "HOTEL", name: "Hotel", permission: "billing.read", featureFlag: "industry.hotel", industry: "generic" }),
  buildIndustryPlugin({ id: "industry-future", key: "FUTURE", name: "Future Modules", permission: "business.read", featureFlag: "industry.future", industry: "generic" }),
];

export const pluginRegistry: PluginManifest[] = [corePlugin, ...industryPlugins];

export const pluginById: Record<string, PluginManifest> = pluginRegistry.reduce<Record<string, PluginManifest>>((acc, plugin) => {
  acc[plugin.id] = plugin;
  return acc;
}, {});
