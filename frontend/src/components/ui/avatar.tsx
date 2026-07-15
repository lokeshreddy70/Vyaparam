export function Avatar({
  name,
  src,
}: {
  name: string;
  src?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return <img src={src} alt={name} className="h-9 w-9 rounded-full object-cover" />;
  }

  return (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
      {initials || "U"}
    </div>
  );
}
