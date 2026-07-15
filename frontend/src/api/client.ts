import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { offlineEngine } from "../offline/engine";
import { useAuthStore } from "../store/authStore";

function unwrapPayload<T>(value: unknown): T {
  if (value && typeof value === "object" && "data" in (value as Record<string, unknown>)) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export const api = axios.create({ baseURL: "/api/v1" });

void offlineEngine.initialize();

function parseRequestData(data: unknown) {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

function canQueueEndpoint(url: string) {
  return (
    url.startsWith("/billing-pos") ||
    url.startsWith("/orders") ||
    url.startsWith("/invoices") ||
    url.startsWith("/settings/business-configuration")
  );
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = String(config.method ?? "get").toLowerCase();
  const url = String(config.url ?? "");
  if (method !== "get" && canQueueEndpoint(url)) {
    const data = parseRequestData(config.data);
    const params = (config.params ?? {}) as Record<string, unknown>;
    const idempotencySeed = `${method}|${url}|${JSON.stringify(params)}|${JSON.stringify(data)}`;
    const normalized = idempotencySeed.replace(/[^a-zA-Z0-9:_|.-]/g, "").slice(0, 180);
    config.headers["X-Idempotency-Key"] = normalized || crypto.randomUUID();
  }

  return config;
});

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error("No refresh token");

  const response = await axios.post("/api/v1/auth/refresh", null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  const payload = unwrapPayload<{ accessToken: string; refreshToken: string }>(response.data);
  useAuthStore.getState().setTokens(payload.accessToken, payload.refreshToken);
  return payload.accessToken;
}

api.interceptors.response.use(
  (response) => {
    response.data = unwrapPayload(response.data);

    const method = String(response.config.method ?? "get").toLowerCase();
    const url = String(response.config.url ?? "");
    const params = (response.config.params ?? {}) as Record<string, unknown>;

    if (method === "get" && url && !url.startsWith("/auth")) {
      void offlineEngine.cacheApiResponse(url, params, response.data, 1000 * 60 * 60 * 12);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) refreshPromise = performRefresh();
        const token = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    const method = String(originalRequest?.method ?? "get").toLowerCase();
    const url = String(originalRequest?.url ?? "");
    const params = (originalRequest?.params ?? {}) as Record<string, unknown>;
    const data = parseRequestData(originalRequest?.data);

    if (method === "get" && url && offlineEngine.shouldAttemptQueueOnError(error)) {
      const cached = await offlineEngine.readCachedApiResponse<unknown>(url, params);
      if (cached !== null) {
        const fallback = {
          data: cached,
          status: 200,
          statusText: "OK",
          headers: originalRequest?.headers ?? {},
          config: originalRequest,
        } as AxiosResponse<unknown>;
        return Promise.resolve(fallback);
      }
    }

    if (
      method !== "get" &&
      url &&
      canQueueEndpoint(url) &&
      offlineEngine.shouldAttemptQueueOnError(error)
    ) {
      const queued = await offlineEngine.queueMutation({
        method,
        url,
        params,
        data,
        headers: originalRequest?.headers as Record<string, string> | undefined,
      });

      if (queued) {
        const synthetic = {
          data: offlineEngine.synthesizeMutationResponse(url, data),
          status: 202,
          statusText: "Accepted",
          headers: originalRequest?.headers ?? {},
          config: originalRequest,
        } as AxiosResponse<unknown>;
        return Promise.resolve(synthetic);
      }
    }

    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown): string {
  const e = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = e.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;
  return e.message ?? "Request failed";
}
