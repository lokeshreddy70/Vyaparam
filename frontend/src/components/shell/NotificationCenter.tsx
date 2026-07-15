import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { api } from "../../api/client";
import { Popover } from "../ui/popover";

type Announcement = {
  id: string;
  title?: string;
  message?: string;
  createdAt?: string;
};

export function NotificationCenter() {
  const query = useQuery({
    queryKey: ["notification-center"],
    queryFn: async () => (await api.get<Announcement[]>("/notifications/announcements", { params: { page: 1, limit: 10 } })).data,
    refetchInterval: 30000,
  });

  const announcements = Array.isArray(query.data)
    ? query.data
    : ((query.data as { items?: Announcement[] } | undefined)?.items ?? []);

  return (
    <Popover
      trigger={
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 dark:border-slate-700">
          <Bell size={16} />
          {announcements.length ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /> : null}
        </span>
      }
    >
      <div className="w-80">
        <h3 className="mb-2 text-sm font-semibold">Notifications</h3>
        <div className="max-h-80 space-y-2 overflow-auto">
          {announcements.length ? (
            announcements.map((item) => (
              <article key={item.id} className="rounded border border-slate-200 p-2 text-sm dark:border-slate-700">
                <p className="font-medium">{item.title ?? "Notification"}</p>
                {item.message ? <p className="text-xs text-slate-600 dark:text-slate-300">{item.message}</p> : null}
                {item.createdAt ? <p className="mt-1 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p> : null}
              </article>
            ))
          ) : (
            <p className="text-xs text-slate-500">No notifications available.</p>
          )}
        </div>
      </div>
    </Popover>
  );
}
