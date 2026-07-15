import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-semibold">404 Not Found</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">The route you are trying to access does not exist.</p>
        <Link to="/" className="mt-4 inline-block">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
