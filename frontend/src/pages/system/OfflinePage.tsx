import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";

export default function OfflinePage() {
  const online = useOnlineStatus();

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-semibold">Offline Mode</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Network connection is currently unavailable. Reconnect to continue.</p>
        <p className="mt-2 text-xs text-slate-500">Status: {online ? "Online" : "Offline"}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Link to="/">
            <Button variant="outline" disabled={!online}>Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
