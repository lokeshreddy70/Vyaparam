import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export default function SystemErrorPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
        <h1 className="text-2xl font-semibold">500 Internal Error</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A system-level error occurred. Retry or contact support.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Link to="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
