import { Spinner } from "../ui/spinner";

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center gap-2 rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
      <Spinner />
      <span>{message ?? "Loading..."}</span>
    </div>
  );
}

export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="grid min-h-[140px] place-items-center rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
      {message ?? "No records found."}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {message}
    </div>
  );
}
