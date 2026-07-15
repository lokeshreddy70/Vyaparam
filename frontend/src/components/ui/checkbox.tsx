import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "grid h-5 w-5 place-items-center rounded border",
          checked ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900" : "border-slate-300",
        )}
      >
        {checked ? <Check size={12} /> : null}
      </button>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
