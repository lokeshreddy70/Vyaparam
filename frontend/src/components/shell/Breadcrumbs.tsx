import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-slate-500">
      <Link to="/" className="hover:text-slate-900 dark:hover:text-slate-100">
        Home
      </Link>
      {parts.map((part, index) => {
        const path = `/${parts.slice(0, index + 1).join("/")}`;
        const label = part.replace(/-/g, " ");
        const last = index === parts.length - 1;
        return (
          <span key={path} className="inline-flex items-center gap-1">
            <ChevronRight size={12} />
            {last ? (
              <span className="capitalize text-slate-700 dark:text-slate-300">{label}</span>
            ) : (
              <Link to={path} className="capitalize hover:text-slate-900 dark:hover:text-slate-100">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
