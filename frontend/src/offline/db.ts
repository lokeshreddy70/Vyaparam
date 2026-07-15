import type { ApiMutationRequest, OfflineCacheRecord, OfflineSessionRecord, RecoveryRecord } from "./types";

const DB_NAME = "smartbiz_offline_engine";
const DB_VERSION = 1;

const STORE_CACHE = "cache";
const STORE_QUEUE = "queue";
const STORE_RECOVERY = "recovery";
const STORE_SESSIONS = "sessions";
const STORE_META = "meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function withRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function withTransactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function openOfflineDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          const cache = db.createObjectStore(STORE_CACHE, { keyPath: "key" });
          cache.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          const queue = db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
          queue.createIndex("status", "status", { unique: false });
          queue.createIndex("createdAt", "createdAt", { unique: false });
          queue.createIndex("idempotencyKey", "idempotencyKey", { unique: false });
          queue.createIndex("priority", "priority", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_RECOVERY)) {
          const recovery = db.createObjectStore(STORE_RECOVERY, { keyPath: "key" });
          recovery.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessions = db.createObjectStore(STORE_SESSIONS, { keyPath: "key" });
          sessions.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
    });
  }

  return dbPromise;
}

export async function putCache(record: OfflineCacheRecord) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_CACHE, "readwrite");
  tx.objectStore(STORE_CACHE).put(record);
  await withTransactionDone(tx);
}

export async function getCache(key: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_CACHE, "readonly");
  const req = tx.objectStore(STORE_CACHE).get(key);
  const record = await withRequest(req as IDBRequest<OfflineCacheRecord | undefined>);
  await withTransactionDone(tx);
  return record ?? null;
}

export async function putQueue(record: ApiMutationRequest) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  tx.objectStore(STORE_QUEUE).put(record);
  await withTransactionDone(tx);
}

export async function getQueueItem(id: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_QUEUE, "readonly");
  const req = tx.objectStore(STORE_QUEUE).get(id);
  const item = await withRequest(req as IDBRequest<ApiMutationRequest | undefined>);
  await withTransactionDone(tx);
  return item ?? null;
}

export async function findQueueByIdempotencyKey(idempotencyKey: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_QUEUE, "readonly");
  const index = tx.objectStore(STORE_QUEUE).index("idempotencyKey");
  const req = index.getAll(idempotencyKey);
  const items = await withRequest(req as IDBRequest<ApiMutationRequest[]>);
  await withTransactionDone(tx);
  return items;
}

export async function listQueue() {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_QUEUE, "readonly");
  const req = tx.objectStore(STORE_QUEUE).getAll();
  const items = await withRequest(req as IDBRequest<ApiMutationRequest[]>);
  await withTransactionDone(tx);
  return items;
}

export async function deleteQueueItem(id: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  tx.objectStore(STORE_QUEUE).delete(id);
  await withTransactionDone(tx);
}

export async function putRecovery(record: RecoveryRecord) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_RECOVERY, "readwrite");
  tx.objectStore(STORE_RECOVERY).put(record);
  await withTransactionDone(tx);
}

export async function getRecovery(key: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_RECOVERY, "readonly");
  const req = tx.objectStore(STORE_RECOVERY).get(key);
  const record = await withRequest(req as IDBRequest<RecoveryRecord | undefined>);
  await withTransactionDone(tx);
  return record ?? null;
}

export async function deleteRecovery(key: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_RECOVERY, "readwrite");
  tx.objectStore(STORE_RECOVERY).delete(key);
  await withTransactionDone(tx);
}

export async function putSession(record: OfflineSessionRecord) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_SESSIONS, "readwrite");
  tx.objectStore(STORE_SESSIONS).put(record);
  await withTransactionDone(tx);
}

export async function getSession(key: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_SESSIONS, "readonly");
  const req = tx.objectStore(STORE_SESSIONS).get(key);
  const record = await withRequest(req as IDBRequest<OfflineSessionRecord | undefined>);
  await withTransactionDone(tx);
  return record ?? null;
}

export async function putMeta(key: string, value: unknown) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_META, "readwrite");
  tx.objectStore(STORE_META).put({ key, value, updatedAt: new Date().toISOString() });
  await withTransactionDone(tx);
}

export async function getMeta<T>(key: string) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_META, "readonly");
  const req = tx.objectStore(STORE_META).get(key);
  const row = await withRequest(req as IDBRequest<{ key: string; value?: T } | undefined>);
  await withTransactionDone(tx);
  return row?.value ?? null;
}
