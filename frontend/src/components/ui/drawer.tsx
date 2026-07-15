import { X } from "lucide-react";

export function Drawer({
  open,
  side = "right",
  title,
  onClose,
  children,
}: {
  open: boolean;
  side?: "left" | "right";
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" aria-modal="true" role="dialog">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close drawer overlay" />
      <div
        className={[
          "absolute top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-slate-950",
          side === "right" ? "right-0" : "left-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-semibold">{title}</h2>
          <button className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
