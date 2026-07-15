import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { AuthUser } from "../types/app";

export function useSessionBootstrap() {
  const initialized = useRef(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const logout = useAuthStore((s) => s.logout);

  const enabled = !!(accessToken || refreshToken);

  useEffect(() => {
    if (!accessToken && refreshToken) {
      axios
        .post("/api/v1/auth/refresh", null, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
        .then((response) => {
          const payload = response.data as { data?: { accessToken?: string; refreshToken?: string } };
          const nextAccess = payload.data?.accessToken;
          const nextRefresh = payload.data?.refreshToken;
          if (nextAccess && nextRefresh) {
            setTokens(nextAccess, nextRefresh);
          }
        })
        .catch(() => {
          if (navigator.onLine) logout();
        });
    }
  }, [accessToken, refreshToken, setTokens, logout]);

  const me = useQuery({
    queryKey: ["auth-me", accessToken],
    enabled,
    queryFn: async () => {
      const response = await api.get<AuthUser>("/users/me");
      return response.data;
    },
    retry: false,
  });

  const perms = useQuery({
    queryKey: ["auth-permissions", accessToken],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await api.get<unknown[]>("/permissions");
      const list = Array.isArray(response.data) ? response.data : [];
      return list
        .map((item) => (item && typeof item === "object" ? (item as { name?: string }).name : undefined))
        .filter((name): name is string => typeof name === "string");
    },
    retry: false,
  });

  useEffect(() => {
    if (!enabled || initialized.current) return;

    if (me.isSuccess && me.data) {
      setUser(me.data);
      initialized.current = true;
      return;
    }

    if (me.isError && !user && navigator.onLine) {
      logout();
      initialized.current = true;
    }
  }, [enabled, me.isSuccess, me.isError, me.data, setUser, logout, user]);

  useEffect(() => {
    if (perms.isSuccess) {
      setPermissions(perms.data);
    }
  }, [perms.isSuccess, perms.data, setPermissions]);

  return {
    loading: enabled && (me.isLoading || me.isFetching),
  };
}
