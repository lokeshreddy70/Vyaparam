import { Injectable, NotFoundException } from "@nestjs/common";
import { LedgerEntryType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BulkImportCustomersDto,
  CreateCustomerDto,
  CreateCustomerGroupDto,
  CreateCustomerTypeDto,
  CustomerListQueryDto,
  LedgerEntryDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";
import { CustomersRepository } from "./customers.repository";

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CustomersRepository,
  ) {}

  createGroup(businessId: string, userId: string, dto: CreateCustomerGroupDto) {
    return this.repository.createGroup(businessId, userId, dto.name);
  }

  createType(businessId: string, userId: string, dto: CreateCustomerTypeDto) {
    return this.repository.createType(businessId, userId, dto.name, dto.description);
  }

  groups(businessId: string) {
    return this.repository.listGroups(businessId);
  }

  types(businessId: string) {
    return this.repository.listTypes(businessId);
  }

  async create(businessId: string, userId: string, dto: CreateCustomerDto) {
    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await this.repository.createCustomerWithDetails(tx, {
        businessId,
        userId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        customerGroupId: dto.customerGroupId,
        customerTypeId: dto.customerTypeId,
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
          activity: "CUSTOMER_CREATED",
          metadata: { customerId: created.id },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          businessId,
          branchId: dto.branchId ?? null,
          userId,
          action: "CUSTOMER_CREATED",
          entityType: "Customer",
          entityId: created.id,
          metadata: dto as unknown as Prisma.InputJsonValue,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return created;
    });

    return this.findOne(businessId, customer.id);
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.repository.findCustomer(businessId, id);
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async list(businessId: string, query: CustomerListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.customerGroupId) where.customerGroupId = query.customerGroupId;
    if (query.customerTypeId) where.customerTypeId = query.customerTypeId;
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
    const orderBy = { [sortBy]: sortable[sortBy] } as Prisma.CustomerOrderByWithRelationInput;

    const [total, items] = await this.repository.listCustomers(businessId, where, orderBy, skip, limit);
    return { page, limit, total, items };
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.findOne(businessId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          branchId: dto.branchId === undefined ? undefined : dto.branchId || null,
          customerGroupId: dto.customerGroupId === undefined ? undefined : dto.customerGroupId || null,
          customerTypeId: dto.customerTypeId === undefined ? undefined : dto.customerTypeId || null,
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
        await tx.customerContact.updateMany({
          where: { customerId: id, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
        });
        if (dto.contacts.length) {
          await tx.customerContact.createMany({
            data: dto.contacts.map((contact) => ({
              businessId,
              customerId: id,
              ...contact,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      if (dto.addresses) {
        await tx.customerAddress.updateMany({
          where: { customerId: id, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
        });
        if (dto.addresses.length) {
          await tx.customerAddress.createMany({
            data: dto.addresses.map((address) => ({
              businessId,
              customerId: id,
              ...address,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      if (dto.creditLimit !== undefined && dto.creditLimit !== existing.creditLimit) {
        const entryType = dto.creditLimit >= existing.creditLimit ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT;
        await tx.customerLedger.create({
          data: {
            businessId,
            branchId: existing.branchId,
            customerId: id,
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
          activity: "CUSTOMER_UPDATED",
          metadata: { customerId: id },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          businessId,
          branchId: existing.branchId,
          userId,
          action: "CUSTOMER_UPDATED",
          entityType: "Customer",
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
    const customer = await this.findOne(businessId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId, isActive: false },
      });
      await tx.activityLog.create({
        data: {
          businessId,
          branchId: customer.branchId,
          userId,
          activity: "CUSTOMER_DELETED",
          metadata: { customerId: id },
          createdBy: userId,
          updatedBy: userId,
        },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          branchId: customer.branchId,
          userId,
          action: "CUSTOMER_DELETED",
          entityType: "Customer",
          entityId: id,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });

    return { success: true };
  }

  async restore(businessId: string, userId: string, id: string) {
    const deleted = await this.prisma.customer.findFirst({ where: { id, businessId, deletedAt: { not: null } } });
    if (!deleted) throw new NotFoundException("Deleted customer not found");

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId, isActive: true },
    });

    return this.findOne(businessId, id);
  }

  async ledger(businessId: string, customerId: string) {
    await this.findOne(businessId, customerId);
    return this.repository.listLedger(businessId, customerId);
  }

  async addLedgerEntry(businessId: string, userId: string, customerId: string, dto: LedgerEntryDto) {
    const customer = await this.findOne(businessId, customerId);

    const balanceAfter =
      dto.entryType === LedgerEntryType.DEBIT
        ? customer.outstandingBalance + dto.amount
        : dto.entryType === LedgerEntryType.CREDIT
          ? Math.max(0, customer.outstandingBalance - dto.amount)
          : dto.amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.customerLedger.create({
        data: {
          businessId,
          branchId: customer.branchId,
          customerId,
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

      await tx.customer.update({ where: { id: customerId }, data: { outstandingBalance: balanceAfter, updatedBy: userId } });
    });

    return this.findOne(businessId, customerId);
  }

  async paymentHistory(businessId: string, customerId: string) {
    await this.findOne(businessId, customerId);
    return this.repository.listPaymentHistory(businessId, customerId);
  }

  async transactionHistory(businessId: string, customerId: string) {
    await this.findOne(businessId, customerId);
    const [bills, salesOrders] = await this.repository.listTransactions(businessId, customerId);
    return { bills, salesOrders };
  }

  async bulkImport(businessId: string, userId: string, dto: BulkImportCustomersDto) {
    const ids: string[] = [];
    for (const item of dto.items) {
      const created = await this.create(businessId, userId, item);
      ids.push(created.id);
    }
    return { count: ids.length, ids };
  }

  async bulkExport(businessId: string) {
    const result = await this.list(businessId, { page: 1, limit: 10000 } as CustomerListQueryDto);
    return result.items;
  }
}
