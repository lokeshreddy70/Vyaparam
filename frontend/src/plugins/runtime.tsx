import { createContext, useCallback, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types/app";
import { pluginRegistry } from "./registry";
import { routeCatalog } from "./routeCatalog";
import type {
  FeatureFlagScopeMap,
  PluginEngineStorage,
  PluginFlagScope,
  PluginNavRuntime,
  PluginRouteRuntime,
  PluginRuntimeState,
  PluginStoredState,
} from "./types";

type Rec = Record<string, unknown>;

type PluginPlatformContextValue = {
  loading: boolean;
  runtimeStates: PluginRuntimeState[];
  navItems: PluginNavRuntime[];
  routeItems: PluginRouteRuntime[];
  getRouteComponent: (path: string) => React.ComponentType | null;
  isFeatureEnabled: (key?: string) => boolean;
  installPlugin: (pluginId: string) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  upgradePlugin: (pluginId: string, targetVersion: string) => Promise<void>;
  rollbackPlugin: (pluginId: string) => Promise<void>;
  validatePlugin: (pluginId: string) => Promise<void>;
  configurePlugin: (pluginId: string, config: Record<string, unknown>) => Promise<void>;
  setPluginSettings: (pluginId: string, settings: Record<string, unknown>) => Promise<void>;
  setPluginPermissions: (pluginId: string, permissions: string[]) => Promise<void>;
  setFeatureFlag: (scope: PluginFlagScope, key: string, isEnabled: boolean, scopeId?: string) => Promise<void>;
  refresh: () => void;
};

const PluginPlatformContext = createContext<PluginPlatformContextValue | undefined>(undefined);

function asRecord(value: unknown): Rec {
  return value && typeof value === "object" ? (value as Rec) : {};
}

function asBoolMap(value: unknown): Record<string, boolean> {
  const source = asRecord(value);
  return Object.entries(source).reduce<Record<string, boolean>>((acc, [key, raw]) => {
    if (typeof raw === "boolean") acc[key] = raw;
    return acc;
  }, {});
}

function normalizeStorage(rawStorage: unknown): PluginEngineStorage {
  const storage = asRecord(rawStorage);
  const scoped = asRecord(storage.featureFlagScopes);

  return {
    plugins: asRecord(storage.plugins) as Record<string, PluginStoredState>,
    pluginConfigs: asRecord(storage.pluginConfigs) as Record<string, Record<string, unknown>>,
    pluginPermissions: Object.entries(asRecord(storage.pluginPermissions)).reduce<Record<string, string[]>>((acc, [pluginId, rawPerms]) => {
      acc[pluginId] = Array.isArray(rawPerms) ? rawPerms.filter((item): item is string => typeof item === "string") : [];
      return acc;
    }, {}),
    pluginSettings: asRecord(storage.pluginSettings) as Record<string, Record<string, unknown>>,
    featureFlagScopes: {
      global: asBoolMap(scoped.global),
      business: Object.entries(asRecord(scoped.business)).reduce<Record<string, Record<string, boolean>>>((acc, [scopeId, payload]) => {
        acc[scopeId] = asBoolMap(payload);
        return acc;
      }, {}),
      branch: Object.entries(asRecord(scoped.branch)).reduce<Record<string, Record<string, boolean>>>((acc, [scopeId, payload]) => {
        acc[scopeId] = asBoolMap(payload);
        return acc;
      }, {}),
      role: Object.entries(asRecord(scoped.role)).reduce<Partial<Record<UserRole, Record<string, boolean>>>>((acc, [scopeId, payload]) => {
        acc[scopeId as UserRole] = asBoolMap(payload);
        return acc;
      }, {}),
      user: Object.entries(asRecord(scoped.user)).reduce<Record<string, Record<string, boolean>>>((acc, [scopeId, payload]) => {
        acc[scopeId] = asBoolMap(payload);
        return acc;
      }, {}),
    },
  };
}

function isIndustryPlugin(pluginId: string) {
  return pluginId.startsWith("industry-");
}

function evaluateFlag(
  key: string,
  globalFlags: Record<string, boolean>,
  scopedFlags: FeatureFlagScopeMap,
  user: { id?: string; role?: UserRole; businessId?: string; branchId?: string | null } | null,
): boolean {
  if (!key) return true;

  const checkValue = (
    source: Record<string, Record<string, boolean>> | Partial<Record<UserRole, Record<string, boolean>>> | undefined,
    scopeId: string | undefined | null,
  ) => {
    if (!source || !scopeId) return undefined;
    const scoped = source[scopeId as keyof typeof source];
    if (!scoped) return undefined;
    if (typeof scoped[key] === "boolean") return scoped[key];
    return undefined;
  };

  const userResult = checkValue(scopedFlags.user, user?.id);
  if (typeof userResult === "boolean") return userResult;

  const roleResult = checkValue(scopedFlags.role, user?.role);
  if (typeof roleResult === "boolean") return roleResult;

  const branchResult = checkValue(scopedFlags.branch, user?.branchId ?? undefined);
  if (typeof branchResult === "boolean") return branchResult;

  const businessResult = checkValue(scopedFlags.business, user?.businessId);
  if (typeof businessResult === "boolean") return businessResult;

  const legacyBusiness = user?.businessId ? globalFlags[`${key}:business:${user.businessId}`] : undefined;
  if (typeof legacyBusiness === "boolean") return legacyBusiness;

  const legacyBranch = user?.branchId ? globalFlags[`${key}:branch:${user.branchId}`] : undefined;
  if (typeof legacyBranch === "boolean") return legacyBranch;

  if (typeof globalFlags[key] === "boolean") return globalFlags[key];

  return true;
}

function applyScopeFlag(
  scopedFlags: FeatureFlagScopeMap,
  scope: PluginFlagScope,
  key: string,
  isEnabled: boolean,
  scopeId: string | undefined,
): FeatureFlagScopeMap {
  const next: FeatureFlagScopeMap = {
    global: { ...(scopedFlags.global ?? {}) },
    business: { ...(scopedFlags.business ?? {}) },
    branch: { ...(scopedFlags.branch ?? {}) },
    role: { ...(scopedFlags.role ?? {}) },
    user: { ...(scopedFlags.user ?? {}) },
  };

  if (scope === "global") {
    next.global = { ...(next.global ?? {}), [key]: isEnabled };
    return next;
  }

  if (!scopeId) return next;

  if (scope === "business") {
    next.business = {
      ...(next.business ?? {}),
      [scopeId]: { ...(next.business?.[scopeId] ?? {}), [key]: isEnabled },
    };
    return next;
  }

  if (scope === "branch") {
    next.branch = {
      ...(next.branch ?? {}),
      [scopeId]: { ...(next.branch?.[scopeId] ?? {}), [key]: isEnabled },
    };
    return next;
  }

  if (scope === "role") {
    const roleKey = scopeId as UserRole;
    next.role = {
      ...(next.role ?? {}),
      [roleKey]: { ...(next.role?.[roleKey] ?? {}), [key]: isEnabled },
    };
    return next;
  }

  next.user = {
    ...(next.user ?? {}),
    [scopeId]: { ...(next.user?.[scopeId] ?? {}), [key]: isEnabled },
  };
  return next;
}

export function PluginPlatformProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);

  const settingsQuery = useQuery({
    queryKey: ["plugin-platform-settings"],
    queryFn: async () => (await api.get("/settings/business-configuration")).data,
    enabled: !!user,
  });

  const settings = asRecord(settingsQuery.data);
  const globalFlags = asBoolMap(settings.featureFlags);
  const moduleToggles = asBoolMap(settings.moduleToggles);
  const storage = normalizeStorage(settings.pluginEngine);

  const runtimeStates = useMemo(() => {
    const map = new Map<string, PluginRuntimeState>();

    for (const manifest of pluginRegistry) {
      const stored = storage.plugins?.[manifest.id];
      const installedDefault = manifest.category === "core";
      const installed = stored?.installed ?? installedDefault;

      const enabledFromToggle = manifest.moduleKey ? moduleToggles[manifest.moduleKey] : undefined;
      const enabledRequested =
        manifest.category === "core"
          ? true
          : typeof enabledFromToggle === "boolean"
            ? enabledFromToggle
            : (stored?.enabled ?? false);

      const dependenciesSatisfied = manifest.dependencies.every((dependencyId) => {
        const dependencyState = map.get(dependencyId);
        return dependencyState ? dependencyState.enabled : false;
      });

      const featureGate = evaluateFlag(`plugin.${manifest.id}.enabled`, globalFlags, storage.featureFlagScopes ?? {}, user);
      const enabled = installed && enabledRequested && dependenciesSatisfied && featureGate;

      map.set(manifest.id, {
        manifest,
        installed,
        enabled,
        health: !installed ? "disabled" : dependenciesSatisfied ? "healthy" : "degraded",
        version: stored?.version ?? manifest.version,
        previousVersion: stored?.previousVersion,
        dependenciesSatisfied,
        validationError: stored?.validationError ?? null,
        config: storage.pluginConfigs?.[manifest.id] ?? manifest.defaultConfig ?? {},
        settings: storage.pluginSettings?.[manifest.id] ?? manifest.defaultSettings ?? {},
        permissions: storage.pluginPermissions?.[manifest.id] ?? manifest.permissions,
      });
    }

    return Array.from(map.values());
  }, [globalFlags, moduleToggles, storage.featureFlagScopes, storage.pluginConfigs, storage.pluginPermissions, storage.pluginSettings, storage.plugins, user]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const isFeatureEnabled = useCallback(
    (key?: string) => {
      if (!key) return true;
      return evaluateFlag(key, globalFlags, storage.featureFlagScopes ?? {}, user);
    },
    [globalFlags, storage.featureFlagScopes, user],
  );

  const canViewPermission = useCallback(
    (permission?: string) => {
      if (!permission) return true;
      if (!user) return false;
      if (user.role === "SUPER_ADMIN" || user.role === "OWNER") return true;
      return permissionSet.has(permission);
    },
    [permissionSet, user],
  );

  const navItems = useMemo(() => {
    return runtimeStates
      .filter((state) => state.enabled)
      .flatMap((state) =>
        state.manifest.nav
          .filter((navItem) => canViewPermission(navItem.permission))
          .filter((navItem) => isFeatureEnabled(navItem.featureFlag))
          .map((navItem) => ({ ...navItem, pluginId: state.manifest.id })),
      );
  }, [canViewPermission, isFeatureEnabled, runtimeStates]);

  const routeItems = useMemo(() => {
    return runtimeStates
      .filter((state) => state.enabled)
      .flatMap((state) =>
        state.manifest.routes
          .filter((route) => canViewPermission(route.permission))
          .filter((route) => isFeatureEnabled(route.featureFlag))
          .map((route) => ({ ...route, pluginId: state.manifest.id })),
      );
  }, [canViewPermission, isFeatureEnabled, runtimeStates]);

  const getRouteComponent = useCallback((path: string) => {
    const component = routeCatalog[path as keyof typeof routeCatalog];
    return component ?? null;
  }, []);

  const updateStorageMutation = useMutation({
    mutationFn: async (nextStorage: PluginEngineStorage) => {
      await api.patch("/settings/business-configuration", { pluginEngine: nextStorage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugin-platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-settings-config"] });
    },
  });

  const withStorageUpdate = useCallback(
    async (updater: (current: PluginEngineStorage) => PluginEngineStorage) => {
      const current = normalizeStorage(asRecord(queryClient.getQueryData(["plugin-platform-settings"]))?.pluginEngine);
      const next = updater(current);
      await updateStorageMutation.mutateAsync(next);
    },
    [queryClient, updateStorageMutation],
  );

  const setModuleToggle = useCallback(async (pluginId: string, isEnabled: boolean) => {
    const state = runtimeStates.find((item) => item.manifest.id === pluginId);
    if (!state?.manifest.moduleKey) return;
    await api.patch("/settings/business-configuration/module-toggle", {
      module: state.manifest.moduleKey,
      isEnabled,
    });
  }, [runtimeStates]);

  const installPlugin = useCallback(async (pluginId: string) => {
    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: true,
        enabled: existing?.enabled ?? false,
        version: existing?.version ?? "1.0.0",
        previousVersion: existing?.previousVersion,
        activatedAt: existing?.activatedAt,
        deactivatedAt: existing?.deactivatedAt,
        lastValidatedAt: existing?.lastValidatedAt,
        validationError: null,
      };

      return { ...current, plugins };
    });
  }, [withStorageUpdate]);

  const uninstallPlugin = useCallback(async (pluginId: string) => {
    if (isIndustryPlugin(pluginId)) {
      await setModuleToggle(pluginId, false);
    }

    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: false,
        enabled: false,
        version: existing?.version ?? "1.0.0",
        previousVersion: existing?.previousVersion,
        deactivatedAt: new Date().toISOString(),
        validationError: null,
      };

      return { ...current, plugins };
    });
  }, [setModuleToggle, withStorageUpdate]);

  const enablePlugin = useCallback(async (pluginId: string) => {
    if (isIndustryPlugin(pluginId)) {
      await setModuleToggle(pluginId, true);
    }

    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: true,
        enabled: true,
        version: existing?.version ?? "1.0.0",
        previousVersion: existing?.previousVersion,
        activatedAt: new Date().toISOString(),
        validationError: null,
      };

      return { ...current, plugins };
    });
  }, [setModuleToggle, withStorageUpdate]);

  const disablePlugin = useCallback(async (pluginId: string) => {
    if (isIndustryPlugin(pluginId)) {
      await setModuleToggle(pluginId, false);
    }

    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: existing?.installed ?? true,
        enabled: false,
        version: existing?.version ?? "1.0.0",
        previousVersion: existing?.previousVersion,
        deactivatedAt: new Date().toISOString(),
        validationError: null,
      };

      return { ...current, plugins };
    });
  }, [setModuleToggle, withStorageUpdate]);

  const upgradePlugin = useCallback(async (pluginId: string, targetVersion: string) => {
    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: existing?.installed ?? true,
        enabled: existing?.enabled ?? false,
        version: targetVersion,
        previousVersion: existing?.version,
        activatedAt: existing?.activatedAt,
        deactivatedAt: existing?.deactivatedAt,
        lastValidatedAt: existing?.lastValidatedAt,
        validationError: null,
      };

      return { ...current, plugins };
    });
  }, [withStorageUpdate]);

  const rollbackPlugin = useCallback(async (pluginId: string) => {
    const state = runtimeStates.find((item) => item.manifest.id === pluginId);
    const previousVersion = state?.previousVersion;
    if (!previousVersion) return;

    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: existing?.installed ?? true,
        enabled: existing?.enabled ?? false,
        version: previousVersion,
        previousVersion: existing?.version,
        activatedAt: existing?.activatedAt,
        deactivatedAt: existing?.deactivatedAt,
        lastValidatedAt: new Date().toISOString(),
        validationError: null,
      };

      return { ...current, plugins };
    });
  }, [runtimeStates, withStorageUpdate]);

  const validatePlugin = useCallback(async (pluginId: string) => {
    const state = runtimeStates.find((item) => item.manifest.id === pluginId);
    if (!state) return;

    const validationError = !state.installed
      ? "Plugin is not installed."
      : !state.dependenciesSatisfied
        ? "Dependencies are not satisfied."
        : null;

    await withStorageUpdate((current) => {
      const plugins = { ...(current.plugins ?? {}) };
      const existing = plugins[pluginId];
      plugins[pluginId] = {
        installed: existing?.installed ?? state.installed,
        enabled: existing?.enabled ?? state.enabled,
        version: existing?.version ?? state.version,
        previousVersion: existing?.previousVersion,
        activatedAt: existing?.activatedAt,
        deactivatedAt: existing?.deactivatedAt,
        lastValidatedAt: new Date().toISOString(),
        validationError,
      };

      return { ...current, plugins };
    });
  }, [runtimeStates, withStorageUpdate]);

  const configurePlugin = useCallback(async (pluginId: string, config: Record<string, unknown>) => {
    await withStorageUpdate((current) => {
      const pluginConfigs = { ...(current.pluginConfigs ?? {}) };
      pluginConfigs[pluginId] = config;
      return { ...current, pluginConfigs };
    });
  }, [withStorageUpdate]);

  const setPluginSettings = useCallback(async (pluginId: string, settingsPayload: Record<string, unknown>) => {
    await withStorageUpdate((current) => {
      const pluginSettings = { ...(current.pluginSettings ?? {}) };
      pluginSettings[pluginId] = settingsPayload;
      return { ...current, pluginSettings };
    });
  }, [withStorageUpdate]);

  const setPluginPermissions = useCallback(async (pluginId: string, pluginPermissions: string[]) => {
    await withStorageUpdate((current) => {
      const nextPermissions = { ...(current.pluginPermissions ?? {}) };
      nextPermissions[pluginId] = pluginPermissions;
      return { ...current, pluginPermissions: nextPermissions };
    });
  }, [withStorageUpdate]);

  const setFeatureFlag = useCallback(async (scope: PluginFlagScope, key: string, isEnabled: boolean, scopeId?: string) => {
    if (scope === "global") {
      await api.patch("/settings/business-configuration/feature-flag", { key, isEnabled });
    }

    await withStorageUpdate((current) => {
      const scopedFlags = applyScopeFlag(current.featureFlagScopes ?? {}, scope, key, isEnabled, scopeId);
      return { ...current, featureFlagScopes: scopedFlags };
    });
  }, [withStorageUpdate]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["plugin-platform-settings"] });
  }, [queryClient]);

  const value: PluginPlatformContextValue = {
    loading: settingsQuery.isLoading,
    runtimeStates,
    navItems,
    routeItems,
    getRouteComponent,
    isFeatureEnabled,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    upgradePlugin,
    rollbackPlugin,
    validatePlugin,
    configurePlugin,
    setPluginSettings,
    setPluginPermissions,
    setFeatureFlag,
    refresh,
  };

  return <PluginPlatformContext.Provider value={value}>{children}</PluginPlatformContext.Provider>;
}

export function usePluginPlatform() {
  const ctx = useContext(PluginPlatformContext);
  if (!ctx) {
    throw new Error("usePluginPlatform must be used within PluginPlatformProvider");
  }

  return ctx;
}
