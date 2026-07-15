import { Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useAuthStore } from "../store/authStore";
import { navModules } from "./app/moduleConfig";
import { Button } from "./ui/button";

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);

  const visibleModules = useMemo(() => navModules.filter((item) => can(item.permission)), [can]);

  return (
    <div className="min-h-screen bg-app-grid text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1700px]">
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white/95 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95",
            "transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Enterprise</p>
              <h1 className="text-xl font-semibold">Vyaparam Admin</h1>
            </div>
            <button className="rounded p-1 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav className="mt-4 space-y-1 overflow-y-auto pb-24">
            {visibleModules.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    "block rounded-md px-3 py-2 text-sm",
                    isActive
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  ].join(" ")
                }
              >
                {item.title}
              </NavLink>
            ))}
          </nav>

          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
            <div className="mt-2 text-xs text-slate-500">{user?.role}</div>
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="outline"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded border border-slate-300 p-1.5 lg:hidden dark:border-slate-700" onClick={() => setOpen(true)}>
                <Menu size={18} />
              </button>
              <div>
                <h2 className="text-base font-semibold">Enterprise Operations Console</h2>
                <p className="text-xs text-slate-500">Live business modules with role and permission controls</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {open ? <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} /> : null}
    </div>
  );
}
