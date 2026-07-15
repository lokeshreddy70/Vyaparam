import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "../lib/utils";

type ToastKind = "success" | "error" | "info";

type ToastMessage = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastContextValue = {
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...toast }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-lg border p-3 shadow-lg",
              toast.kind === "success" && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
              toast.kind === "error" && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950",
              toast.kind === "info" && "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950",
            )}
          >
            <div className="flex items-start gap-2">
              {toast.kind === "success" ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="text-xs text-slate-600 dark:text-slate-300">{toast.description}</p> : null}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss toast"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
