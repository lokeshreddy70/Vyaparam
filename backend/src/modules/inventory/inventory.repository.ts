import { Injectable } from "@nestjs/common";
import { MovementType, Prisma, TransferStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findInventoryById(businessId: string, id: string) {
    return this.prisma.inventory.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { product: true, warehouse: true },
    });
  }

  findInventory(businessId: string, query: Prisma.InventoryWhereInput = {}) {
    return this.prisma.inventory.findMany({
      where: { businessId, deletedAt: null, ...query },
      include: { product: true, warehouse: true, branch: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  lowStock(businessId: string) {
    return this.prisma.inventory.findMany({
      where: {
        businessId,
        deletedAt: null,
        reorderLevel: { not: null },
        quantity: { lt: this.prisma.inventory.fields.reorderLevel },
      },
      include: { product: true, warehouse: true },
      orderBy: { quantity: "asc" },
    });
  }

  movements(businessId: string, where: Prisma.InventoryMovementWhereInput = {}) {
    return this.prisma.inventoryMovement.findMany({
      where: { businessId, deletedAt: null, ...where },
      include: {
        inventory: { include: { product: true, warehouse: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async applyMovement(
    tx: Prisma.TransactionClient,
    input: {
      businessId: string;
      userId: string;
      branchId: string | null;
      inventoryId: string;
      type: MovementType;
      quantity: number;
      reference?: string;
      remarks?: string;
    },
  ) {
    const inventory = await tx.inventory.findFirst({
      where: { id: input.inventoryId, businessId: input.businessId, deletedAt: null },
    });
    if (!inventory) return null;

    let nextQty = inventory.quantity;
    if (input.type === MovementType.IN || input.type === MovementType.TRANSFER_IN) nextQty += input.quantity;
    if (input.type === MovementType.OUT || input.type === MovementType.TRANSFER_OUT) nextQty -= input.quantity;
    if (input.type === MovementType.ADJUSTMENT) nextQty = input.quantity;

    if (nextQty < 0) throw new Error("Insufficient stock");

    const updatedInventory = await tx.inventory.update({
      where: { id: inventory.id },
      data: { quantity: nextQty, updatedBy: input.userId },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId,
        inventoryId: inventory.id,
        type: input.type,
        quantity: input.quantity,
        reference: input.reference,
        remarks: input.remarks,
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId,
        userId: input.userId,
        action: "INVENTORY_MOVEMENT",
        entityType: "Inventory",
        entityId: inventory.id,
        metadata: {
          movementId: movement.id,
          type: input.type,
          quantity: input.quantity,
          nextQty,
          reference: input.reference,
        },
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    return updatedInventory;
  }

  async transfer(
    tx: Prisma.TransactionClient,
    input: {
      businessId: string;
      userId: string;
      branchId: string | null;
      fromWarehouseId: string;
      toWarehouseId: string;
      productId: string;
      quantity: number;
      notes?: string;
    },
  ) {
    const fromInventory = await tx.inventory.findFirst({
      where: {
        businessId: input.businessId,
        warehouseId: input.fromWarehouseId,
        productId: input.productId,
        deletedAt: null,
      },
    });

    if (!fromInventory || fromInventory.quantity < input.quantity) {
      throw new Error("Insufficient stock for transfer");
    }

    const toInventory = await tx.inventory.upsert({
      where: { warehouseId_productId: { warehouseId: input.toWarehouseId, productId: input.productId } },
      update: { quantity: { increment: input.quantity }, updatedBy: input.userId },
      create: {
        businessId: input.businessId,
        branchId: input.branchId,
        warehouseId: input.toWarehouseId,
        productId: input.productId,
        quantity: input.quantity,
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    await tx.inventory.update({
      where: { id: fromInventory.id },
      data: { quantity: { decrement: input.quantity }, updatedBy: input.userId },
    });

    const transferNo = `TRF-${Date.now().toString().slice(-8)}`;
    const transfer = await tx.transfer.create({
      data: {
        businessId: input.businessId,
        fromBranchId: input.branchId,
        toBranchId: input.branchId,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        transferNo,
        status: TransferStatus.COMPLETED,
        notes: input.notes,
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    await tx.inventoryMovement.createMany({
      data: [
        {
          businessId: input.businessId,
          branchId: input.branchId,
          inventoryId: fromInventory.id,
          type: MovementType.TRANSFER_OUT,
          quantity: input.quantity,
          reference: transfer.transferNo,
          remarks: input.notes,
          createdBy: input.userId,
          updatedBy: input.userId,
        },
        {
          businessId: input.businessId,
          branchId: input.branchId,
          inventoryId: toInventory.id,
          type: MovementType.TRANSFER_IN,
          quantity: input.quantity,
          reference: transfer.transferNo,
          remarks: input.notes,
          createdBy: input.userId,
          updatedBy: input.userId,
        },
      ],
    });

    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId,
        userId: input.userId,
        action: "INVENTORY_TRANSFER",
        entityType: "Transfer",
        entityId: transfer.id,
        metadata: {
          transferNo: transfer.transferNo,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          productId: input.productId,
          quantity: input.quantity,
        },
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    return transfer;
  }
}
