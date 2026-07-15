import axios from "axios";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { offlineEngine } from "../offline/engine";
import type { OfflineEngineState, NetworkQuality } from "../offline/types";

type OfflineSyncContextValue = {
  state: OfflineEngineState;
  pauseSync: () => Promise<void>;
  resumeSync: () => Promise<void>;
  retryFailed: () => Promise<void>;
  forceSyncNow: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

function classifyNetworkQuality(latencyMs: number): NetworkQuality {
  if (!navigator.onLine) return "offline";
  if (latencyMs < 250) return "excellent";
  if (latencyMs < 800) return "good";
  return "poor";
}

async function probeNetworkQuality() {
  if (!navigator.onLine) return "offline" as NetworkQuality;
  const startedAt = performance.now();
  try {
    await axios.get("/api/v1/monitoring/health", { timeout: 2000 });
    return classifyNetworkQuality(performance.now() - startedAt);
  } catch {
    return "poor" as NetworkQuality;
  }
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  const [state, setState] = useState<OfflineEngineState>(offlineEngine.getState());

  const processQueue = async () => {
    await offlineEngine.processQueue(async (job) => {
      await axios.request({
        baseURL: "/api/v1",
        method: job.method,
        url: job.url,
        params: job.params,
        data: job.data,
        headers: {
          ...(job.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Offline-Replay": "true",
          "X-Idempotency-Key": job.idempotencyKey,
        },
      });
    });
  };

  useEffect(() => {
    const secretHint = `${user?.id ?? "anonymous"}:${user?.businessId ?? "default"}`;
    void offlineEngine.initialize(secretHint);

    const unsub = offlineEngine.subscribe((next) => setState({ ...next }));

    const onOnline = () => {
      offlineEngine.setNetworkOnline(true);
      void processQueue();
    };
    const onOffline = () => offlineEngine.setNetworkOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const qualityTimer = window.setInterval(() => {
      void (async () => {
        const quality = await probeNetworkQuality();
        offlineEngine.setNetworkQuality(quality);
      })();
    }, 12000);

    const syncTimer = window.setInterval(() => {
      void processQueue();
    }, 7000);

    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(qualityTimer);
      window.clearInterval(syncTimer);
    };
  }, [token, user?.businessId, user?.id]);

  const value = useMemo<OfflineSyncContextValue>(() => ({
    state,
    pauseSync: () => offlineEngine.pauseSync(),
    resumeSync: () => offlineEngine.resumeSync(),
    retryFailed: () => offlineEngine.retryFailed(),
    forceSyncNow: () => processQueue(),
  }), [state]);

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  return context;
}
