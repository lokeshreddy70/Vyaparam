import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/40">
        <h1 className="text-2xl font-semibold">403 Access Denied</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You do not have sufficient permissions to access this area.</p>
        <Link to="/" className="mt-4 inline-block">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
