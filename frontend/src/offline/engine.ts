import { AxiosError } from "axios";
import { decryptJson, encryptJson, hashCredentials } from "./crypto";
import {
  deleteQueueItem,
  deleteRecovery,
  findQueueByIdempotencyKey,
  getCache,
  getMeta,
  getQueueItem,
  getRecovery,
  getSession,
  listQueue,
  openOfflineDb,
  putCache,
  putMeta,
  putQueue,
  putRecovery,
  putSession,
} from "./db";
import type { ApiMutationRequest, OfflineEngineState, RecoveryRecord, SyncPriority } from "./types";

const DEFAULT_MAX_ATTEMPTS = 5;
const OFFLINE_SESSION_KEY = "session:offline-login";
const OFFLINE_ENGINE_VERSION = "v1";
const META_PAUSED = "sync.paused";

type Listener = (state: OfflineEngineState) => void;

type ProcessExecutor = (job: ApiMutationRequest) => Promise<void>;

function nowIso() {
  return new Date().toISOString();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function idempotencyHash(method: string, url: string, params?: unknown, data?: unknown) {
  return `${method.toUpperCase()}|${url}|${stableStringify(params ?? null)}|${stableStringify(data ?? null)}`;
}

function requestPriority(url: string): SyncPriority {
  if (url.includes("/payments")) return 1;
  if (url.includes("/billing-pos/documents")) return 1;
  if (url.includes("/orders") || url.includes("/invoices")) return 2;
  return 3;
}

function isSyncEligible(url: string) {
  return (
    url.startsWith("/billing-pos") ||
    url.startsWith("/orders") ||
    url.startsWith("/invoices") ||
    url.startsWith("/settings/business-configuration")
  );
}

function canQueueMethod(method: string) {
  const m = method.toLowerCase();
  return m === "post" || m === "put" || m === "patch" || m === "delete";
}

function synthesizeOfflineResponse(url: string, data: unknown) {
  if (url === "/billing-pos/documents" && data && typeof data === "object") {
    return {
      id: `offline-doc-${crypto.randomUUID()}`,
      status: "DRAFT",
      offlineQueued: true,
      createdAt: nowIso(),
      ...(data as Record<string, unknown>),
    };
  }

  if (url.includes("/payments")) {
    return {
      id: `offline-payment-${crypto.randomUUID()}`,
      status: "QUEUED",
      offlineQueued: true,
      createdAt: nowIso(),
    };
  }

  return {
    id: `offline-${crypto.randomUUID()}`,
    offlineQueued: true,
    createdAt: nowIso(),
  };
}

class OfflineEngine {
  private readonly baseSecret = `smartbiz-${OFFLINE_ENGINE_VERSION}`;

  private listeners = new Set<Listener>();

  private state: OfflineEngineState = {
    initialized: false,
    online: navigator.onLine,
    networkQuality: navigator.onLine ? "good" : "offline",
    paused: false,
    processing: false,
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncAt: null,
    lastError: null,
  };

  private secret = this.baseSecret;

  private initialized = false;

  async initialize(secretHint?: string) {
    await openOfflineDb();
    const paused = await getMeta<boolean>(META_PAUSED);
    if (typeof paused === "boolean") {
      this.state.paused = paused;
    }

    this.secret = `${this.baseSecret}:${secretHint ?? "default"}`;

    await this.refreshCounts();
    this.state.initialized = true;
    this.initialized = true;
    this.emit();
  }

  getState() {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private async refreshCounts() {
    const queue = await listQueue();
    this.state.pendingCount = queue.filter((q) => q.status === "pending" || q.status === "processing").length;
    this.state.failedCount = queue.filter((q) => q.status === "failed").length;
    this.state.conflictCount = queue.filter((q) => q.status === "conflict").length;
  }

  setNetworkOnline(online: boolean) {
    this.state.online = online;
    this.state.networkQuality = online ? this.state.networkQuality : "offline";
    this.emit();
  }

  setNetworkQuality(quality: OfflineEngineState["networkQuality"]) {
    this.state.networkQuality = quality;
    this.emit();
  }

  async pauseSync() {
    this.state.paused = true;
    await putMeta(META_PAUSED, true);
    this.emit();
  }

  async resumeSync() {
    this.state.paused = false;
    await putMeta(META_PAUSED, false);
    this.emit();
  }

  private cacheKey(url: string, params?: Record<string, unknown>) {
    return `cache:${url}:${stableStringify(params ?? {})}`;
  }

  async cacheApiResponse(url: string, params: Record<string, unknown> | undefined, data: unknown, ttlMs?: number) {
    const key = this.cacheKey(url, params);
    const payload = await encryptJson(data, this.secret);
    await putCache({ key, payload, updatedAt: nowIso(), ttlMs });
  }

  async readCachedApiResponse<T>(url: string, params?: Record<string, unknown>) {
    const key = this.cacheKey(url, params);
    const record = await getCache(key);
    if (!record) return null;

    if (record.ttlMs) {
      const age = Date.now() - new Date(record.updatedAt).getTime();
      if (age > record.ttlMs) return null;
    }

    return decryptJson<T>(record.payload, this.secret);
  }

  async saveRecovery<T>(key: string, payload: T, context?: unknown) {
    const encrypted = await encryptJson(payload, this.secret);
    const record: RecoveryRecord = {
      key,
      payload: encrypted,
      updatedAt: nowIso(),
      context: context as Record<string, unknown> | undefined,
    };
    await putRecovery(record);
  }

  async readRecovery<T>(key: string) {
    const record = await getRecovery(key);
    if (!record) return null;
    return decryptJson<T>(record.payload, this.secret);
  }

  async clearRecovery(key: string) {
    await deleteRecovery(key);
  }

  async saveOfflineLoginProfile(input: {
    email: string;
    password: string;
    user: unknown;
    accessToken: string;
    refreshToken: string;
    permissions: string[];
  }) {
    const credentialHash = await hashCredentials(input.email, input.password);
    const payload = await encryptJson({
      credentialHash,
      user: input.user,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      permissions: input.permissions,
      savedAt: nowIso(),
    }, this.secret);

    await putSession({ key: OFFLINE_SESSION_KEY, payload, updatedAt: nowIso() });
  }

  async tryOfflineLogin(email: string, password: string) {
    const record = await getSession(OFFLINE_SESSION_KEY);
    if (!record) return null;

    const data = await decryptJson<{
      credentialHash: string;
      user: unknown;
      accessToken: string;
      refreshToken: string;
      permissions: string[];
    }>(record.payload, this.secret);

    if (!data) return null;

    const check = await hashCredentials(email, password);
    if (check !== data.credentialHash) return null;

    return data;
  }

  async queueMutation(input: {
    method: string;
    url: string;
    params?: Record<string, unknown>;
    data?: unknown;
    headers?: Record<string, string>;
    maxAttempts?: number;
  }) {
    if (!canQueueMethod(input.method) || !isSyncEligible(input.url)) return null;

    const idempotencyKey = idempotencyHash(input.method, input.url, input.params, input.data);
    const existing = await findQueueByIdempotencyKey(idempotencyKey);
    const active = existing.find((item) => item.status !== "conflict");
    if (active) return active;

    const now = nowIso();
    const row: ApiMutationRequest = {
      id: crypto.randomUUID(),
      idempotencyKey,
      method: input.method.toLowerCase() as ApiMutationRequest["method"],
      url: input.url,
      params: input.params,
      data: input.data,
      headers: input.headers,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      priority: requestPriority(input.url),
      kind: "transaction",
      status: "pending",
    };

    await putQueue(row);
    await this.refreshCounts();
    this.emit();
    return row;
  }

  shouldAttemptQueueOnError(error: unknown) {
    const e = error as AxiosError;
    if (!e) return false;
    if (!navigator.onLine) return true;
    if (!e.response) return true;
    const code = e.response.status;
    return code >= 500 || code === 408 || code === 429;
  }

  async processQueue(executor: ProcessExecutor) {
    if (!this.initialized) await this.initialize();
    if (this.state.paused || this.state.processing || !this.state.online) return;

    this.state.processing = true;
    this.state.lastError = null;
    this.emit();

    try {
      const queue = await listQueue();
      const ordered = queue
        .filter((q) => q.status === "pending" || q.status === "failed")
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      for (const job of ordered) {
        const current = await getQueueItem(job.id);
        if (!current) continue;

        current.status = "processing";
        current.updatedAt = nowIso();
        await putQueue(current);
        this.emit();

        try {
          await executor(current);
          await deleteQueueItem(current.id);
          this.state.lastSyncAt = nowIso();
        } catch (error) {
          const e = error as AxiosError;
          const next = { ...current };
          next.attempts += 1;
          next.updatedAt = nowIso();
          next.error = e.message;

          if (e.response?.status === 409 || e.response?.status === 412) {
            next.status = "conflict";
          } else if (next.attempts >= next.maxAttempts) {
            next.status = "failed";
          } else {
            next.status = "pending";
          }

          await putQueue(next);
          this.state.lastError = next.error ?? "Sync job failed";
        }
      }
    } finally {
      await this.refreshCounts();
      this.state.processing = false;
      this.emit();
    }
  }

  async retryFailed() {
    const queue = await listQueue();
    const failed = queue.filter((q) => q.status === "failed" || q.status === "conflict");
    for (const job of failed) {
      await putQueue({
        ...job,
        status: "pending",
        attempts: 0,
        error: undefined,
        updatedAt: nowIso(),
      });
    }
    await this.refreshCounts();
    this.emit();
  }

  synthesizeMutationResponse(url: string, data: unknown) {
    return synthesizeOfflineResponse(url, data);
  }
}

export const offlineEngine = new OfflineEngine();
