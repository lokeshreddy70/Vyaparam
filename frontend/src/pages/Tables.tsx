import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  OCCUPIED: 'bg-red-100 text-red-700 border-red-300',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-300',
  CLEANING: 'bg-slate-100 text-slate-600 border-slate-300',
};

export default function Tables() {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  const { data: tables, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => (await api.get('/tables')).data,
    refetchInterval: 5000,
  });

  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: async () => (await api.get('/products', { params: { pageSize: 100 } })).data.items,
  });

  const [cart, setCart] = useState<{ productId: string; quantity: number; name: string; price: number }[]>([]);

  const createOrder = useMutation({
    mutationFn: async () => {
      return api.post('/orders', {
        tableId: selectedTable.id,
        type: 'DINE_IN',
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setCart([]);
      setSelectedTable(null);
    },
  });

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) => (c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { productId: product.id, quantity: 1, name: product.name, price: Number(product.price) }];
    });
  }

  if (isLoading) return <div className="p-8">Loading tables…</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Tables</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 max-w-2xl">
        {tables?.map((t: any) => (
          <button
            key={t.id}
            onClick={() => t.status === 'AVAILABLE' && setSelectedTable(t)}
            className={`border rounded-xl p-4 text-left ${statusColors[t.status]} ${t.status !== 'AVAILABLE' ? 'cursor-default' : 'hover:shadow'}`}
          >
            <div className="font-bold text-lg">{t.label}</div>
            <div className="text-xs mt-1">{t.capacity} seats</div>
            <div className="text-xs mt-2 font-medium">{t.status}</div>
          </button>
        ))}
      </div>

      {selectedTable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10" onClick={() => setSelectedTable(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New order — {selectedTable.label}</h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {products?.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="border rounded-lg p-2 text-left hover:bg-slate-50 text-sm"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-slate-500">₹{Number(p.price).toFixed(2)}</div>
                </button>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-3 mb-4">
                {cart.map((c) => (
                  <div key={c.productId} className="flex justify-between text-sm py-1">
                    <span>{c.name} × {c.quantity}</span>
                    <span>₹{(c.price * c.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setSelectedTable(null)} className="flex-1 border rounded py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={() => createOrder.mutate()}
                disabled={cart.length === 0 || createOrder.isPending}
                className="flex-1 bg-brand-600 text-white rounded py-2 text-sm disabled:opacity-50"
              >
                {createOrder.isPending ? 'Sending…' : 'Send to Kitchen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
