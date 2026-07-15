import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "./dialog";
import { Input } from "./input";

type CommandItem = {
  id: string;
  label: string;
  path: string;
};

export function CommandPalette({
  commands,
}: {
  commands: CommandItem[];
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(
    () => commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12),
    [commands, query],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm text-slate-500 dark:border-slate-700"
      >
        <Search size={14} />
        Quick Search
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">Ctrl+K</span>
      </button>
      <Dialog open={open} title="Command Palette" onClose={() => setOpen(false)}>
        <div className="space-y-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type route or command" />
          <div className="max-h-80 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
            {filtered.map((item) => (
              <button
                key={item.id}
                className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                onClick={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
              >
                {item.label}
                <span className="ml-2 text-xs text-slate-500">{item.path}</span>
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
