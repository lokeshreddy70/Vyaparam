import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MovementType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  InventoryReservationDto,
  InventoryTransferDto,
  StockAdjustmentDto,
  StockMovementDto,
  UpsertInventoryDto,
} from "./dto/inventory.dto";
import { InventoryRepository } from "./inventory.repository";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: InventoryRepository,
  ) {}

  async upsert(businessId: string, userId: string, dto: UpsertInventoryDto) {
    const inventory = await this.prisma.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
        },
      },
      update: {
        quantity: dto.quantity,
        reorderLevel: dto.reorderLevel,
        updatedBy: userId,
        deletedAt: null,
        deletedBy: null,
      },
      create: {
        businessId,
        branchId: dto.branchId ?? null,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        reorderLevel: dto.reorderLevel ?? 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        businessId,
        branchId: dto.branchId ?? null,
        userId,
        action: "INVENTORY_UPSERT",
        entityType: "Inventory",
        entityId: inventory.id,
        metadata: dto as unknown as Prisma.InputJsonValue,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.findOne(businessId, inventory.id);
  }

  list(businessId: string, query: Record<string, unknown>) {
    const where: Prisma.InventoryWhereInput = {};

    if (typeof query.warehouseId === "string" && query.warehouseId) where.warehouseId = query.warehouseId;
    if (typeof query.productId === "string" && query.productId) where.productId = query.productId;
    if (typeof query.branchId === "string" && query.branchId) where.branchId = query.branchId;

    if (typeof query.q === "string" && query.q.trim()) {
      const q = query.q.trim();
      where.OR = [
        { product: { name: { contains: q, mode: "insensitive" } } },
        { product: { sku: { contains: q, mode: "insensitive" } } },
        { product: { barcode: { contains: q, mode: "insensitive" } } },
        { warehouse: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    return this.repository.findInventory(businessId, where);
  }

  async findOne(businessId: string, id: string) {
    const inventory = await this.repository.findInventoryById(businessId, id);
    if (!inventory) throw new NotFoundException("Inventory not found");
    return inventory;
  }

  lowStock(businessId: string) {
    return this.repository.lowStock(businessId);
  }

  async movement(businessId: string, userId: string, branchId: string | null, dto: StockMovementDto) {
    const updated = await this.prisma.$transaction((tx) =>
      this.repository.applyMovement(tx, {
        businessId,
        userId,
        branchId,
        inventoryId: dto.inventoryId,
        type: dto.type,
        quantity: dto.quantity,
        reference: dto.reference,
        remarks: dto.remarks,
      }),
    );

    if (!updated) throw new NotFoundException("Inventory not found");
    return this.findOne(businessId, updated.id);
  }

  async stockAdjustment(businessId: string, userId: string, branchId: string | null, dto: StockAdjustmentDto) {
    const inventory = await this.findOne(businessId, dto.inventoryId);

    await this.prisma.$transaction(async (tx) => {
      await tx.stockAdjustment.create({
        data: {
          businessId,
          branchId,
          warehouseId: inventory.warehouseId,
          reason: dto.reason,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await this.repository.applyMovement(tx, {
        businessId,
        userId,
        branchId,
        inventoryId: dto.inventoryId,
        type: MovementType.ADJUSTMENT,
        quantity: dto.quantity,
        reference: "STOCK_ADJUSTMENT",
        remarks: dto.reason,
      });
    });

    return this.findOne(businessId, dto.inventoryId);
  }

  async transfer(businessId: string, userId: string, branchId: string | null, dto: InventoryTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException("Source and destination warehouse cannot be same");
    }

    return this.prisma.$transaction((tx) =>
      this.repository.transfer(tx, {
        businessId,
        userId,
        branchId,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        productId: dto.productId,
        quantity: dto.quantity,
        notes: dto.notes,
      }),
    );
  }

  reservation(businessId: string, userId: string, branchId: string | null, dto: InventoryReservationDto) {
    return this.movement(businessId, userId, branchId, {
      inventoryId: dto.inventoryId,
      type: MovementType.OUT,
      quantity: dto.quantity,
      reference: dto.reservationCode || `RES-${Date.now().toString().slice(-8)}`,
      remarks: dto.notes,
    });
  }

  ledger(businessId: string, productId?: string) {
    const where: Prisma.InventoryMovementWhereInput = {};
    if (productId) where.inventory = { productId, deletedAt: null };
    return this.repository.movements(businessId, where);
  }

  history(businessId: string, inventoryId: string) {
    return this.repository.movements(businessId, { inventoryId });
  }
}
