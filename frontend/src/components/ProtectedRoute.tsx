import { Navigate, Outlet } from "react-router-dom";
import { useSessionBootstrap } from "../hooks/useSessionBootstrap";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { loading } = useSessionBootstrap();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading session...</div>;
  }

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
