import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { usePluginPlatform } from "../../plugins/runtime";

const quickLinks = [
  { label: "POS", path: "/pos" },
  { label: "Billing", path: "/billing" },
  { label: "Inventory", path: "/inventory" },
  { label: "Customers", path: "/customers" },
  { label: "Reports", path: "/reports" },
  { label: "Settings", path: "/settings" },
];

export default function IndustryModulePage() {
  const location = useLocation();
  const { runtimeStates } = usePluginPlatform();

  const current = useMemo(() => {
    return runtimeStates.find((state) => state.manifest.routes.some((route) => route.path === location.pathname));
  }, [location.pathname, runtimeStates]);

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">Industry Module</h1>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300">
          The selected module is not active for this tenant.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">{current.manifest.name} Module</h1>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{current.manifest.description}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Status" value={current.enabled ? "Enabled" : "Disabled"} />
            <Stat label="Installed" value={current.installed ? "Installed" : "Not Installed"} />
            <Stat label="Health" value={current.health} />
            <Stat label="Version" value={current.version} />
            <Stat label="Dependencies" value={current.manifest.dependencies.join(", ") || "None"} />
            <Stat label="Permission Model" value={current.permissions.join(", ") || "Inherited"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Shared Platform Workflows</h2>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Module Storage Isolation</h2>
        </CardHeader>
        <CardContent>
          <pre className="max-h-72 overflow-auto rounded-md bg-slate-100 p-3 text-xs dark:bg-slate-900">{JSON.stringify({
            config: current.config,
            settings: current.settings,
            permissions: current.permissions,
          }, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
