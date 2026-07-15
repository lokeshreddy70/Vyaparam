import type { UserRole } from "../types/app";

export type PluginSection = "core" | "foundation" | "system" | "industry";

export type PluginCategory = "core" | "industry";

export type PluginFlagScope = "global" | "business" | "branch" | "role" | "user";

export type PluginHealth = "healthy" | "degraded" | "disabled";

export type PluginModuleKey =
  | "RESTAURANT"
  | "RETAIL"
  | "PHARMACY"
  | "MEDICAL"
  | "BAKERY"
  | "HARDWARE"
  | "ELECTRONICS"
  | "SALON"
  | "GYM"
  | "SERVICE_BUSINESS"
  | "MANUFACTURING"
  | "WAREHOUSE"
  | "EDUCATION"
  | "HOTEL"
  | "FUTURE";

export type PluginNavItem = {
  key: string;
  label: string;
  path: string;
  section: PluginSection;
  permission?: string;
  featureFlag?: string;
};

export type PluginRoute = {
  key: string;
  path: string;
  permission?: string;
  featureFlag?: string;
  requiresTenant?: boolean;
  requiresBranch?: boolean;
};

export type PluginDashboardWidget = {
  key: string;
  title: string;
  endpoint: string;
  permission?: string;
};

export type PluginReportSpec = {
  key: string;
  label: string;
  endpoint: string;
  permission?: string;
};

export type PluginMigrationSpec = {
  key: string;
  version: string;
  description: string;
};

export type PluginHealthCheck = {
  key: string;
  endpoint: string;
  permission?: string;
};

export type PluginSettingField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "json";
};

export type PluginManifest = {
  id: string;
  moduleKey?: PluginModuleKey;
  name: string;
  category: PluginCategory;
  description: string;
  version: string;
  dependencies: string[];
  permissions: string[];
  nav: PluginNavItem[];
  routes: PluginRoute[];
  metadata?: {
    industry?: "restaurant" | "retail" | "pharmacy" | "generic";
    tags?: string[];
    owner?: string;
  };
  widgets?: PluginDashboardWidget[];
  reports?: PluginReportSpec[];
  configurationSchema?: PluginSettingField[];
  migrations?: PluginMigrationSpec[];
  healthChecks?: PluginHealthCheck[];
  defaultConfig?: Record<string, unknown>;
  defaultSettings?: Record<string, unknown>;
};

export type PluginStoredState = {
  installed: boolean;
  enabled: boolean;
  version: string;
  previousVersion?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  lastValidatedAt?: string;
  validationError?: string | null;
};

export type FeatureFlagScopeMap = {
  global?: Record<string, boolean>;
  business?: Record<string, Record<string, boolean>>;
  branch?: Record<string, Record<string, boolean>>;
  role?: Partial<Record<UserRole, Record<string, boolean>>>;
  user?: Record<string, Record<string, boolean>>;
};

export type PluginEngineStorage = {
  plugins?: Record<string, PluginStoredState>;
  pluginConfigs?: Record<string, Record<string, unknown>>;
  pluginPermissions?: Record<string, string[]>;
  pluginSettings?: Record<string, Record<string, unknown>>;
  featureFlagScopes?: FeatureFlagScopeMap;
};

export type PluginRuntimeState = {
  manifest: PluginManifest;
  installed: boolean;
  enabled: boolean;
  health: PluginHealth;
  version: string;
  previousVersion?: string;
  dependenciesSatisfied: boolean;
  validationError?: string | null;
  config: Record<string, unknown>;
  settings: Record<string, unknown>;
  permissions: string[];
};

export type PluginRouteRuntime = PluginRoute & {
  pluginId: string;
};

export type PluginNavRuntime = PluginNavItem & {
  pluginId: string;
};
