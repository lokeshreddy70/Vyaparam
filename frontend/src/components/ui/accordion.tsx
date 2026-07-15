import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function Accordion({
  items,
}: {
  items: { id: string; title: string; content: React.ReactNode }[];
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className="border-b border-slate-200 last:border-b-0 dark:border-slate-800">
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
              onClick={() => setOpenId(open ? null : item.id)}
            >
              {item.title}
              <ChevronDown size={14} className={open ? "rotate-180" : ""} />
            </button>
            {open ? <div className="px-3 pb-3 text-sm text-slate-600 dark:text-slate-300">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
