export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={[
            "rounded px-3 py-1.5 text-sm",
            active === tab.key
              ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-slate-100"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300",
          ].join(" ")}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
