import { useMemo, useState } from "react";
import { DataTable } from "../components/app/DataTable";
import { ErrorState } from "../components/app/OperationState";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { usePluginPlatform } from "../plugins/runtime";
import type { PluginFlagScope } from "../plugins/types";

const initialJson = "{}";

export default function PluginPlatformPage() {
  const {
    runtimeStates,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    upgradePlugin,
    rollbackPlugin,
    validatePlugin,
    configurePlugin,
    setPluginSettings,
    setPluginPermissions,
    setFeatureFlag,
    refresh,
  } = usePluginPlatform();

  const [selectedPluginId, setSelectedPluginId] = useState<string>("");
  const [targetVersion, setTargetVersion] = useState("1.1.0");
  const [configJson, setConfigJson] = useState(initialJson);
  const [settingsJson, setSettingsJson] = useState(initialJson);
  const [permissionsRaw, setPermissionsRaw] = useState("business.read");
  const [flagScope, setFlagScope] = useState<PluginFlagScope>("global");
  const [flagScopeId, setFlagScopeId] = useState("");
  const [flagKey, setFlagKey] = useState("plugin.industry-restaurant.enabled");
  const [flagValue, setFlagValue] = useState("true");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => runtimeStates.find((item) => item.manifest.id === selectedPluginId) ?? null,
    [runtimeStates, selectedPluginId],
  );

  const rows = useMemo(
    () =>
      runtimeStates.map((state) => ({
        id: state.manifest.id,
        name: state.manifest.name,
        category: state.manifest.category,
        module: state.manifest.moduleKey ?? "CORE",
        installed: state.installed ? "YES" : "NO",
        enabled: state.enabled ? "YES" : "NO",
        version: state.version,
        previousVersion: state.previousVersion ?? "-",
        health: state.health,
        dependenciesSatisfied: state.dependenciesSatisfied ? "YES" : "NO",
        validationError: state.validationError ?? "-",
      })),
    [runtimeStates],
  );

  const applyJson = async (action: "config" | "settings") => {
    if (!selected) return;
    setError(null);

    try {
      const json = action === "config" ? configJson : settingsJson;
      const payload = JSON.parse(json) as Record<string, unknown>;
      if (action === "config") {
        await configurePlugin(selected.manifest.id, payload);
      } else {
        await setPluginSettings(selected.manifest.id, payload);
      }
    } catch {
      setError("Invalid JSON payload.");
    }
  };

  const applyPermissions = async () => {
    if (!selected) return;
    setError(null);
    const parsed = permissionsRaw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    await setPluginPermissions(selected.manifest.id, parsed);
  };

  const applyFlag = async () => {
    setError(null);
    await setFeatureFlag(flagScope, flagKey, flagValue === "true", flagScopeId || undefined);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Plugin and Module Engine</h1>
          <div className="ml-auto">
            <Button variant="outline" onClick={refresh}>Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            columns={[
              { accessorKey: "id", header: "Plugin ID" },
              { accessorKey: "name", header: "Name" },
              { accessorKey: "category", header: "Category" },
              { accessorKey: "module", header: "Module" },
              { accessorKey: "installed", header: "Installed" },
              { accessorKey: "enabled", header: "Enabled" },
              { accessorKey: "version", header: "Version" },
              { accessorKey: "previousVersion", header: "Previous" },
              { accessorKey: "health", header: "Health" },
              { accessorKey: "dependenciesSatisfied", header: "Dependencies" },
              { accessorKey: "validationError", header: "Validation" },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Plugin Manager</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Select value={selectedPluginId} onChange={(event) => setSelectedPluginId(event.target.value)}>
              <option value="">Select Plugin</option>
              {runtimeStates.map((state) => (
                <option key={state.manifest.id} value={state.manifest.id}>
                  {state.manifest.name}
                </option>
              ))}
            </Select>
            <Input value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)} placeholder="Target Version" />
            <Input value={permissionsRaw} onChange={(event) => setPermissionsRaw(event.target.value)} placeholder="permission.one, permission.two" />
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <Button disabled={!selected} onClick={() => selected && installPlugin(selected.manifest.id)}>Install</Button>
            <Button disabled={!selected} variant="secondary" onClick={() => selected && uninstallPlugin(selected.manifest.id)}>Uninstall</Button>
            <Button disabled={!selected} onClick={() => selected && enablePlugin(selected.manifest.id)}>Enable</Button>
            <Button disabled={!selected} variant="secondary" onClick={() => selected && disablePlugin(selected.manifest.id)}>Disable</Button>
            <Button disabled={!selected} onClick={() => selected && upgradePlugin(selected.manifest.id, targetVersion)}>Upgrade</Button>
            <Button disabled={!selected} variant="secondary" onClick={() => selected && rollbackPlugin(selected.manifest.id)}>Rollback</Button>
            <Button disabled={!selected} onClick={() => selected && validatePlugin(selected.manifest.id)}>Validate</Button>
            <Button disabled={!selected} variant="outline" onClick={applyPermissions}>Save Permissions</Button>
          </div>

          {selected ? (
            <pre className="max-h-56 overflow-auto rounded-md bg-slate-100 p-2 text-xs dark:bg-slate-900">{JSON.stringify(selected, null, 2)}</pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Plugin Configuration Storage</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Plugin Config</p>
              <Textarea className="min-h-[180px]" value={configJson} onChange={(event) => setConfigJson(event.target.value)} />
              <Button disabled={!selected} onClick={() => void applyJson("config")}>Save Config</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Plugin Settings</p>
              <Textarea className="min-h-[180px]" value={settingsJson} onChange={(event) => setSettingsJson(event.target.value)} />
              <Button disabled={!selected} onClick={() => void applyJson("settings")}>Save Settings</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Feature Flags by Scope</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-5">
            <Select value={flagScope} onChange={(event) => setFlagScope(event.target.value as PluginFlagScope)}>
              <option value="global">Global</option>
              <option value="business">Business</option>
              <option value="branch">Branch</option>
              <option value="role">Role</option>
              <option value="user">User</option>
            </Select>
            <Input value={flagScopeId} onChange={(event) => setFlagScopeId(event.target.value)} placeholder="Scope ID (optional for global)" />
            <Input value={flagKey} onChange={(event) => setFlagKey(event.target.value)} placeholder="Feature Flag Key" />
            <Select value={flagValue} onChange={(event) => setFlagValue(event.target.value)}>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Select>
            <Button onClick={applyFlag}>Save Flag</Button>
          </div>
        </CardContent>
      </Card>

      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
