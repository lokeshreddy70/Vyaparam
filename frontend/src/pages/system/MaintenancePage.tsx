import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export default function MaintenancePage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md rounded-xl border border-sky-200 bg-sky-50 p-6 text-center dark:border-sky-900 dark:bg-sky-950/40">
        <h1 className="text-2xl font-semibold">Maintenance Window</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The platform is under scheduled maintenance. Core services may be temporarily unavailable.</p>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
