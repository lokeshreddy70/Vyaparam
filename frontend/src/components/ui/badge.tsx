import { cn } from "../../lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5 text-xs font-medium dark:border-slate-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
