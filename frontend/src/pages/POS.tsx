import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function POS() {
  const queryClient = useQueryClient();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const { data: billableOrders } = useQuery({
    queryKey: ['billable-orders'],
    queryFn: async () => (await api.get('/orders', { params: { status: 'READY' } })).data,
    refetchInterval: 5000,
  });

  const { data: invoice } = useQuery({
    queryKey: ['invoice', selectedInvoiceId],
    queryFn: async () => (await api.get(`/invoices/${selectedInvoiceId}`)).data,
    enabled: !!selectedInvoiceId,
  });

  const generateInvoice = useMutation({
    mutationFn: async (orderId: string) => (await api.post('/invoices', { orderId })).data,
    onSuccess: (data) => {
      setSelectedInvoiceId(data.id);
      queryClient.invalidateQueries({ queryKey: ['billable-orders'] });
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () =>
      api.post(`/invoices/${selectedInvoiceId}/payments`, {
        method: paymentMethod,
        amount: Number(paymentAmount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoiceId] });
      setPaymentAmount('');
    },
  });

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Ready to bill</h1>
        <div className="space-y-2">
          {billableOrders?.map((order: any) => (
            <div key={order.id} className="bg-white border rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{order.table?.label ?? order.type}</div>
                <div className="text-xs text-slate-400">{order.items.length} items</div>
              </div>
              <button
                onClick={() => generateInvoice.mutate(order.id)}
                disabled={generateInvoice.isPending}
                className="bg-brand-600 text-white text-sm px-3 py-2 rounded disabled:opacity-50"
              >
                Generate Bill
              </button>
            </div>
          ))}
          {billableOrders?.length === 0 && <div className="text-slate-400 text-sm">No orders ready for billing.</div>}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-4">Invoice</h1>
        {!invoice && <div className="text-slate-400 text-sm">Generate a bill to see it here.</div>}
        {invoice && (
          <div className="bg-white border rounded-xl p-6">
            <div className="flex justify-between mb-4">
              <span className="font-bold">{invoice.invoiceNo}</span>
              <span className="text-xs px-2 py-1 rounded bg-slate-100">{invoice.status}</span>
            </div>

            <div className="space-y-1 text-sm mb-4">
              {invoice.order?.items.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span>₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(invoice.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>₹{Number(invoice.taxTotal).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{Number(invoice.grandTotal).toFixed(2)}</span></div>
            </div>

            {invoice.status !== 'PAID' && (
              <div className="mt-6 border-t pt-4">
                <div className="flex gap-2 mb-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border rounded px-2 py-2 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="border rounded px-2 py-2 text-sm flex-1"
                  />
                </div>
                <button
                  onClick={() => recordPayment.mutate()}
                  disabled={!paymentAmount || recordPayment.isPending}
                  className="w-full bg-brand-600 text-white rounded py-2 text-sm disabled:opacity-50"
                >
                  Record Payment
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
