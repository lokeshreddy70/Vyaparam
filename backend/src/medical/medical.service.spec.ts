import { allocateBatchDeduction } from './medical.service';

describe('allocateBatchDeduction', () => {
  it('deducts from the earliest expiring batch first', () => {
    const batches = [
      { id: 'b1', quantityRemaining: 5, expiryDate: new Date('2026-01-01') },
      { id: 'b2', quantityRemaining: 10, expiryDate: new Date('2026-03-01') },
      { id: 'b3', quantityRemaining: 8, expiryDate: new Date('2026-02-01') },
    ] as any;

    const result = allocateBatchDeduction(batches, 12);

    expect(result.allocations).toEqual([
      { batchId: 'b1', quantity: 5 },
      { batchId: 'b3', quantity: 7 },
    ]);
    expect(result.remainingQty).toBe(0);
  });

  it('rejects orders when the total available stock cannot cover the request', () => {
    const batches = [
      { id: 'b1', quantityRemaining: 3, expiryDate: new Date('2026-01-01') },
      { id: 'b2', quantityRemaining: 2, expiryDate: new Date('2026-03-01') },
    ] as any;

    expect(() => allocateBatchDeduction(batches, 6)).toThrow('Insufficient stock');
  });
});
