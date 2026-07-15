import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../ui/avatar";
import { Popover } from "../ui/popover";

export function ProfileMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <Popover trigger={<Avatar name={user?.name ?? "User"} />}>
      <div className="w-64 space-y-2 p-1 text-sm">
        <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
          <p className="font-semibold">{user?.name ?? "Unknown User"}</p>
          <p className="text-xs text-slate-500">{user?.email ?? ""}</p>
          <p className="mt-1 text-xs text-slate-500">{user?.role ?? ""}</p>
        </div>
        <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
          <User size={14} />
          Profile
        </button>
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </Popover>
  );
}
