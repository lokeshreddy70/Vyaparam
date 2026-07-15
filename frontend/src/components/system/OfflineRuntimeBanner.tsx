import { useOfflineSync } from "../../context/OfflineSyncProvider";

export function OfflineRuntimeBanner() {
  const { state, forceSyncNow, pauseSync, resumeSync, retryFailed } = useOfflineSync();

  const offline = !state.online;
  const statusClass = offline
    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";

  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${statusClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <strong>{offline ? "Offline Billing Active" : "Online and Synced"}</strong>
        <span>Quality: {state.networkQuality}</span>
        <span>Pending: {state.pendingCount}</span>
        <span>Failed: {state.failedCount}</span>
        <span>Conflicts: {state.conflictCount}</span>
        <span>{state.processing ? "Sync: running" : "Sync: idle"}</span>
        <span>{state.lastSyncAt ? `Last Sync: ${new Date(state.lastSyncAt).toLocaleTimeString()}` : "Last Sync: not yet"}</span>

        <button
          type="button"
          className="rounded border border-current px-2 py-1"
          onClick={() => void forceSyncNow()}
          disabled={!state.online || state.processing || state.paused}
        >
          Sync Now
        </button>
        <button
          type="button"
          className="rounded border border-current px-2 py-1"
          onClick={() => void retryFailed()}
          disabled={state.failedCount + state.conflictCount === 0}
        >
          Retry Failed
        </button>
        {state.paused ? (
          <button type="button" className="rounded border border-current px-2 py-1" onClick={() => void resumeSync()}>
            Resume Sync
          </button>
        ) : (
          <button type="button" className="rounded border border-current px-2 py-1" onClick={() => void pauseSync()}>
            Pause Sync
          </button>
        )}
      </div>
    </div>
  );
}
