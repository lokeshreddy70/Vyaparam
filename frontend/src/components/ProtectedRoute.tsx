import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, AuthUser } from '../store/authStore';

interface Props {
  allowedRoles?: AuthUser['role'][];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
