type BatchLike = {
  id: string;
  quantityRemaining: number;
  expiryDate: Date;
};

export function allocateBatchDeduction(batches: BatchLike[], requestQty: number) {
  const sorted = [...batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  const total = sorted.reduce((sum, batch) => sum + batch.quantityRemaining, 0);

  if (requestQty > total) {
    throw new Error("Insufficient stock");
  }

  let remainingQty = requestQty;
  const allocations: Array<{ batchId: string; quantity: number }> = [];

  for (const batch of sorted) {
    if (remainingQty <= 0) break;
    const quantity = Math.min(batch.quantityRemaining, remainingQty);
    if (quantity > 0) {
      allocations.push({ batchId: batch.id, quantity });
      remainingQty -= quantity;
    }
  }

  return { allocations, remainingQty };
}
