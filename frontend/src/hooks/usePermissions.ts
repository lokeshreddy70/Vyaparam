import { useMemo } from "react";
import { useAuthStore } from "../store/authStore";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  function can(permission?: string) {
    if (!permission) return true;
    if (!user) return false;
    if (user.role === "SUPER_ADMIN" || user.role === "OWNER") return true;
    return permissionSet.has(permission);
  }

  return { can };
}
