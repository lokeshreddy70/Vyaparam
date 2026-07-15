import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useAuthStore } from "../store/authStore";
import type { PluginRouteRuntime } from "./types";
import { usePluginPlatform } from "./runtime";

export function PluginRouteGuard({ route, children }: PropsWithChildren<{ route: PluginRouteRuntime }>) {
  const { can } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const { isFeatureEnabled } = usePluginPlatform();

  if (!can(route.permission)) {
    return <Navigate to="/403" replace />;
  }

  if (!isFeatureEnabled(route.featureFlag)) {
    return <Navigate to="/403" replace />;
  }

  if (route.requiresTenant && !user?.businessId) {
    return <Navigate to="/403" replace />;
  }

  if (route.requiresBranch && !user?.branchId) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
