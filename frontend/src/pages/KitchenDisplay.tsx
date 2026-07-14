import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

const kotStatusFlow: Record<string, string> = {
  QUEUED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
};

export default function KitchenDisplay() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  const { data: orders } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: async () => (await api.get('/orders', { params: { status: 'SENT_TO_KITCHEN' } })).data,
  });

  useEffect(() => {
    if (!user) return;
    const s = io('/kitchen', { path: '/socket.io' });
    s.on('connect', () => s.emit('join-business', user.businessId));
    s.on('kot:new', () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }));
    s.on('kot:status', () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }));
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [user, queryClient]);

  const advanceStatus = useMutation({
    mutationFn: async ({ orderItemId, status }: { orderItemId: string; status: string }) =>
      api.patch(`/orders/items/${orderItemId}/kot-status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <span className={`text-xs px-2 py-1 rounded ${socket?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {socket?.connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders?.map((order: any) => (
          <div key={order.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold">{order.table?.label ?? order.type}</span>
              <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="space-y-2">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                  <div>
                    <div className="font-medium">{item.product.name} × {item.quantity}</div>
                    <div className="text-xs text-slate-400">{item.kotStatus}</div>
                  </div>
                  {kotStatusFlow[item.kotStatus] && (
                    <button
                      onClick={() =>
                        advanceStatus.mutate({ orderItemId: item.id, status: kotStatusFlow[item.kotStatus] })
                      }
                      className="text-xs bg-brand-600 text-white px-2 py-1 rounded"
                    >
                      Mark {kotStatusFlow[item.kotStatus]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {orders?.length === 0 && <div className="text-slate-400 text-sm">No active kitchen orders.</div>}
      </div>
    </div>
  );
}
