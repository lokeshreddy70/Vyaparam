export function Timeline({
  items,
}: {
  items: { id: string; title: string; timestamp?: string; description?: string }[];
}) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="relative pl-6">
          <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
          <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.timestamp ? <p className="text-xs text-slate-500">{item.timestamp}</p> : null}
            {item.description ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
