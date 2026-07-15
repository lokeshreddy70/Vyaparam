import { Injectable, NotFoundException } from "@nestjs/common";
import { LedgerEntryType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BulkImportSuppliersDto,
  CreateSupplierDto,
  CreateSupplierGroupDto,
  CreateSupplierTypeDto,
  SupplierLedgerEntryDto,
  SupplierListQueryDto,
  UpdateSupplierDto,
} from "./dto/supplier.dto";
import { SuppliersRepository } from "./suppliers.repository";

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SuppliersRepository,
  ) {}

  createGroup(businessId: string, userId: string, dto: CreateSupplierGroupDto) {
    return this.repository.createGroup(businessId, userId, dto.name);
  }

  createType(businessId: string, userId: string, dto: CreateSupplierTypeDto) {
    return this.repository.createType(businessId, userId, dto.name, dto.description);
  }

  groups(businessId: string) {
    return this.repository.listGroups(businessId);
  }

  types(businessId: string) {
    return this.repository.listTypes(businessId);
  }

  async create(businessId: string, userId: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.$transaction(async (tx) => {
      const created = await this.repository.createSupplierWithDetails(tx, {
        businessId,
        userId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        supplierGroupId: dto.supplierGroupId,
        supplierTypeId: dto.supplierTypeId,
        gstNumber: dto.gstNumber,
        panNumber: dto.panNumber,
        tinNumber: dto.tinNumber,
        creditLimit: dto.creditLimit ?? 0,
        notes: dto.notes,
        tags: dto.tags,
        contacts: dto.contacts ?? [],
        addresses: dto.addresses ?? [],
      });

      await tx.activityLog.create({
        data: {
          businessId,
          branchId: dto.branchId ?? null,
          userId,
          activity: "SUPPLIER_CREATED",
          metadata: { supplierId: created.id },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          businessId,
          branchId: dto.branchId ?? null,
          userId,
          action: "SUPPLIER_CREATED",
          entityType: "Supplier",
          entityId: created.id,
          metadata: dto as unknown as Prisma.InputJsonValue,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return created;
    });

    return this.findOne(businessId, supplier.id);
  }

  async findOne(businessId: string, id: string) {
    const supplier = await this.repository.findSupplier(businessId, id);
    if (!supplier) throw new NotFoundException("Supplier not found");
    return supplier;
  }

  async list(businessId: string, query: SupplierListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.supplierGroupId) where.supplierGroupId = query.supplierGroupId;
    if (query.supplierTypeId) where.supplierTypeId = query.supplierTypeId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { gstNumber: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const sortable: Record<string, Prisma.SortOrder> = {
      name: query.sortOrder === "desc" ? "desc" : "asc",
      createdAt: query.sortOrder === "asc" ? "asc" : "desc",
      outstandingBalance: query.sortOrder === "asc" ? "asc" : "desc",
    };
    const sortBy = query.sortBy && sortable[query.sortBy] ? query.sortBy : "createdAt";
    const orderBy = { [sortBy]: sortable[sortBy] } as Prisma.SupplierOrderByWithRelationInput;

    const [total, items] = await this.repository.listSuppliers(businessId, where, orderBy, skip, limit);
    return { page, limit, total, items };
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateSupplierDto) {
    const existing = await this.findOne(businessId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          branchId: dto.branchId === undefined ? undefined : dto.branchId || null,
          supplierGroupId: dto.supplierGroupId === undefined ? undefined : dto.supplierGroupId || null,
          supplierTypeId: dto.supplierTypeId === undefined ? undefined : dto.supplierTypeId || null,
          gstNumber: dto.gstNumber,
          panNumber: dto.panNumber,
          tinNumber: dto.tinNumber,
          creditLimit: dto.creditLimit,
          notes: dto.notes,
          tags: dto.tags === undefined ? undefined : (dto.tags as unknown as Prisma.InputJsonValue),
          isActive: dto.isActive,
          updatedBy: userId,
        },
      });

      if (dto.contacts) {
        await tx.supplierContact.updateMany({
          where: { supplierId: id, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
        });
        if (dto.contacts.length) {
          await tx.supplierContact.createMany({
            data: dto.contacts.map((contact) => ({
              businessId,
              supplierId: id,
              ...contact,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      if (dto.addresses) {
        await tx.supplierAddress.updateMany({
          where: { supplierId: id, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
        });
        if (dto.addresses.length) {
          await tx.supplierAddress.createMany({
            data: dto.addresses.map((address) => ({
              businessId,
              supplierId: id,
              ...address,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      if (dto.creditLimit !== undefined && dto.creditLimit !== existing.creditLimit) {
        const entryType = dto.creditLimit >= existing.creditLimit ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT;
        await tx.supplierLedger.create({
          data: {
            businessId,
            branchId: existing.branchId,
            supplierId: id,
            entryType,
            amount: Math.abs(dto.creditLimit - existing.creditLimit),
            balanceAfter: existing.outstandingBalance,
            referenceType: "CREDIT_LIMIT_UPDATE",
            referenceId: id,
            remarks: "Credit limit updated",
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          businessId,
          branchId: existing.branchId,
          userId,
          activity: "SUPPLIER_UPDATED",
          metadata: { supplierId: id },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          businessId,
          branchId: existing.branchId,
          userId,
          action: "SUPPLIER_UPDATED",
          entityType: "Supplier",
          entityId: id,
          metadata: dto as unknown as Prisma.InputJsonValue,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });

    return this.findOne(businessId, id);
  }

  async softDelete(businessId: string, userId: string, id: string) {
    const supplier = await this.findOne(businessId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.supplier.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId, isActive: false },
      });
      await tx.activityLog.create({
        data: {
          businessId,
          branchId: supplier.branchId,
          userId,
          activity: "SUPPLIER_DELETED",
          metadata: { supplierId: id },
          createdBy: userId,
          updatedBy: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          branchId: supplier.branchId,
          userId,
          action: "SUPPLIER_DELETED",
          entityType: "Supplier",
          entityId: id,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });

    return { success: true };
  }

  async restore(businessId: string, userId: string, id: string) {
    const deleted = await this.prisma.supplier.findFirst({ where: { id, businessId, deletedAt: { not: null } } });
    if (!deleted) throw new NotFoundException("Deleted supplier not found");

    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId, isActive: true },
    });

    return this.findOne(businessId, id);
  }

  async ledger(businessId: string, supplierId: string) {
    await this.findOne(businessId, supplierId);
    return this.repository.listLedger(businessId, supplierId);
  }

  async addLedgerEntry(businessId: string, userId: string, supplierId: string, dto: SupplierLedgerEntryDto) {
    const supplier = await this.findOne(businessId, supplierId);

    const balanceAfter =
      dto.entryType === LedgerEntryType.DEBIT
        ? supplier.outstandingBalance + dto.amount
        : dto.entryType === LedgerEntryType.CREDIT
          ? Math.max(0, supplier.outstandingBalance - dto.amount)
          : dto.amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.supplierLedger.create({
        data: {
          businessId,
          branchId: supplier.branchId,
          supplierId,
          entryType: dto.entryType,
          amount: dto.amount,
          balanceAfter,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          remarks: dto.remarks,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.supplier.update({ where: { id: supplierId }, data: { outstandingBalance: balanceAfter, updatedBy: userId } });
    });

    return this.findOne(businessId, supplierId);
  }

  async paymentHistory(businessId: string, supplierId: string) {
    await this.findOne(businessId, supplierId);
    return this.repository.listPaymentHistory(businessId, supplierId);
  }

  async transactionHistory(businessId: string, supplierId: string) {
    await this.findOne(businessId, supplierId);
    const purchaseOrders = await this.repository.listTransactions(businessId, supplierId);
    return { purchaseOrders };
  }

  async bulkImport(businessId: string, userId: string, dto: BulkImportSuppliersDto) {
    const ids: string[] = [];
    for (const item of dto.items) {
      const created = await this.create(businessId, userId, item);
      ids.push(created.id);
    }
    return { count: ids.length, ids };
  }

  async bulkExport(businessId: string) {
    const result = await this.list(businessId, { page: 1, limit: 10000 } as SupplierListQueryDto);
    return result.items;
  }
}
