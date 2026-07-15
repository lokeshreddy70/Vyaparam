export function Stepper({
  steps,
  active,
}: {
  steps: string[];
  active: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const current = index === active;
        const complete = index < active;
        return (
          <li key={step} className="inline-flex items-center gap-2 text-sm">
            <span
              className={[
                "grid h-6 w-6 place-items-center rounded-full border text-xs",
                complete || current
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-300 text-slate-500",
              ].join(" ")}
            >
              {index + 1}
            </span>
            <span className={current ? "font-semibold" : "text-slate-500"}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
