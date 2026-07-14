import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: async () => (await api.get('/invoices/reports/daily')).data,
  });

  const { data: tables } = useQuery({
    queryKey: ['tables-summary'],
    queryFn: async () => (await api.get('/tables')).data,
    enabled: !!user && user.role !== 'KITCHEN_STAFF',
  });

  const occupied = tables?.filter((t: any) => t.status === 'OCCUPIED').length ?? 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]}</h1>
      <p className="text-slate-500 mb-8">Here's how the business is doing today.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        <StatCard label="Today's Sales" value={isLoading ? '…' : `₹${summary?.totalSales?.toFixed(2) ?? '0.00'}`} />
        <StatCard label="Invoices Today" value={isLoading ? '…' : summary?.invoiceCount ?? 0} />
        <StatCard label="Tables Occupied" value={tables ? `${occupied} / ${tables.length}` : '…'} />
      </div>

      <div className="mt-10 text-sm text-slate-400 max-w-lg">
        This is Phase 1 of Vyaparam — the shared engine plus the Restaurant vertical, fully wired to a
        real Postgres backend. Additional verticals (Grocery, Medical, Cement…) plug into the same
        products, inventory, billing and auth engine in later phases.
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
