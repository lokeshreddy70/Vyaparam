import { Menu, SidebarClose, SidebarOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useWorkspacePreferences } from "../../hooks/useWorkspacePreferences";
import { usePermissions } from "../../hooks/usePermissions";
import { usePluginPlatform } from "../../plugins/runtime";
import { useAuthStore } from "../../store/authStore";
import { ThemeSwitcher } from "../../context/ThemeProvider";
import { CommandPalette } from "../ui/command-palette";
import { OfflineRuntimeBanner } from "../system/OfflineRuntimeBanner";
import { Breadcrumbs } from "./Breadcrumbs";
import { NotificationCenter } from "./NotificationCenter";
import { ProfileMenu } from "./ProfileMenu";

export default function AppShell() {
  const { can } = usePermissions();
  const { navItems: pluginNavItems } = usePluginPlatform();
  const location = useLocation();
  const { pushRecent } = useWorkspacePreferences();
  const user = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = useMemo(() => pluginNavItems.filter((item) => can(item.permission)), [can, pluginNavItems]);
  const grouped = useMemo(() => {
    const core = navItems.filter((item) => item.section === "core");
    const industry = navItems.filter((item) => item.section === "industry");
    const foundation = navItems.filter((item) => item.section === "foundation");
    const system = navItems.filter((item) => item.section === "system");
    return { core, industry, foundation, system };
  }, [navItems]);

  useEffect(() => {
    pushRecent(location.pathname);
  }, [location.pathname, pushRecent]);

  return (
    <div className="min-h-screen bg-app-grid text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
            collapsed ? "w-[84px]" : "w-[290px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            "transition-all lg:static lg:translate-x-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className={collapsed ? "hidden" : "block"}>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">SmartBiz</p>
              <h1 className="text-lg font-semibold">Enterprise Workspace</h1>
            </div>
            <div className="flex items-center gap-1">
              <button className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setMobileOpen(false)}>
                <Menu size={16} />
              </button>
              <button className="hidden rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 lg:block" onClick={() => setCollapsed((v) => !v)}>
                {collapsed ? <SidebarOpen size={16} /> : <SidebarClose size={16} />}
              </button>
            </div>
          </div>

          <nav className="mt-3 space-y-3 overflow-auto pb-24">
            <Section title={collapsed ? "C" : "Core Modules"}>
              {grouped.core.map((item) => (
                <ShellLink key={item.key} path={item.path} label={collapsed ? item.label.charAt(0) : item.label} />
              ))}
            </Section>
            <Section title={collapsed ? "I" : "Industry Modules"}>
              {grouped.industry.map((item) => (
                <ShellLink key={item.key} path={item.path} label={collapsed ? item.label.charAt(0) : item.label} />
              ))}
            </Section>
            <Section title={collapsed ? "F" : "Foundation"}>
              {grouped.foundation.map((item) => (
                <ShellLink key={item.key} path={item.path} label={collapsed ? item.label.charAt(0) : item.label} />
              ))}
            </Section>
            <Section title={collapsed ? "S" : "System"}>
              {grouped.system.map((item) => (
                <ShellLink key={item.key} path={item.path} label={collapsed ? item.label.charAt(0) : item.label} />
              ))}
            </Section>
          </nav>

          <footer className="absolute inset-x-3 bottom-3 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
            <p className="font-semibold">{collapsed ? user?.name?.charAt(0) : user?.name}</p>
            {!collapsed ? <p className="text-slate-500">{user?.role}</p> : null}
          </footer>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:px-6">
            <div className="space-y-2">
              <OfflineRuntimeBanner />
              <div className="flex flex-wrap items-center gap-2">
              <button className="rounded border border-slate-300 p-1.5 lg:hidden dark:border-slate-700" onClick={() => setMobileOpen(true)}>
                <Menu size={16} />
              </button>
              <div className="min-w-[220px] flex-1">
                <h2 className="text-sm font-semibold">Single Enterprise Business Workspace</h2>
                <Breadcrumbs />
              </div>
              <CommandPalette commands={navItems.map((i) => ({ id: i.key, label: i.label, path: i.path }))} />
              <ThemeSwitcher />
              <NotificationCenter />
              <ProfileMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>

          <footer className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 lg:px-6">
            SmartBiz Workspace • One Login • Multi Tenant • Role Aware Navigation
          </footer>
        </div>
      </div>

      {mobileOpen ? <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 px-2 text-xs uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ShellLink({ path, label }: { path: string; label: string }) {
  return (
    <NavLink
      to={path}
      end={path === "/"}
      className={({ isActive }) =>
        [
          "block rounded-md px-2.5 py-2 text-sm",
          isActive
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
