import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export function OfflineGuard({ children }: { children: React.ReactNode }) {
  useOnlineStatus();
  return <>{children}</>;
}
