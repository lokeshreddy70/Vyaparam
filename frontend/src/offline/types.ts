export type SyncPriority = 1 | 2 | 3;

export type QueueKind = "transaction" | "sync";

export type QueueStatus = "pending" | "processing" | "failed" | "conflict";

export type NetworkQuality = "excellent" | "good" | "poor" | "offline";

export type ApiMutationRequest = {
  id: string;
  idempotencyKey: string;
  method: "post" | "put" | "patch" | "delete";
  url: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  priority: SyncPriority;
  kind: QueueKind;
  status: QueueStatus;
  error?: string;
};

export type OfflineCacheRecord = {
  key: string;
  payload: string;
  updatedAt: string;
  ttlMs?: number;
};

export type RecoveryRecord<T = unknown> = {
  key: string;
  payload: string;
  updatedAt: string;
  context?: T;
};

export type OfflineSessionRecord = {
  key: string;
  payload: string;
  updatedAt: string;
};

export type OfflineEngineState = {
  initialized: boolean;
  online: boolean;
  networkQuality: NetworkQuality;
  paused: boolean;
  processing: boolean;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
};
