import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', roles: ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_STAFF'] },
  { to: '/tables', label: 'Tables', roles: ['OWNER', 'MANAGER', 'WAITER', 'CASHIER'] },
  { to: '/kitchen', label: 'Kitchen Display', roles: ['OWNER', 'MANAGER', 'KITCHEN_STAFF'] },
  { to: '/pos', label: 'Billing', roles: ['OWNER', 'MANAGER', 'CASHIER'] },
];

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-slate-700">Vyaparam</div>
        <nav className="flex-1 p-2 space-y-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-sm">
          <div className="font-medium">{user?.name}</div>
          <div className="text-slate-400 text-xs mb-2">{user?.role}</div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
