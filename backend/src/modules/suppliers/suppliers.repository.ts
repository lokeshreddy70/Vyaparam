import { Injectable } from "@nestjs/common";
import { LedgerEntryType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  supplierInclude() {
    return {
      supplierGroup: true,
      supplierType: true,
      branch: true,
      contacts: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
      addresses: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
    };
  }

  createGroup(businessId: string, userId: string, name: string) {
    return this.prisma.supplierGroup.create({
      data: { businessId, name, createdBy: userId, updatedBy: userId },
    });
  }

  createType(businessId: string, userId: string, name: string, description?: string) {
    return this.prisma.supplierType.create({
      data: { businessId, name, description, createdBy: userId, updatedBy: userId },
    });
  }

  listGroups(businessId: string) {
    return this.prisma.supplierGroup.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  listTypes(businessId: string) {
    return this.prisma.supplierType.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findSupplier(businessId: string, id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, businessId, deletedAt: null },
      include: this.supplierInclude(),
    });
  }

  listSuppliers(
    businessId: string,
    where: Prisma.SupplierWhereInput,
    orderBy: Prisma.SupplierOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return this.prisma.$transaction([
      this.prisma.supplier.count({ where: { businessId, deletedAt: null, ...where } }),
      this.prisma.supplier.findMany({
        where: { businessId, deletedAt: null, ...where },
        include: this.supplierInclude(),
        orderBy,
        skip,
        take,
      }),
    ]);
  }

  async createSupplierWithDetails(
    tx: Prisma.TransactionClient,
    input: {
      businessId: string;
      userId: string;
      branchId: string | null;
      name: string;
      phone?: string;
      email?: string;
      supplierGroupId?: string;
      supplierTypeId?: string;
      gstNumber?: string;
      panNumber?: string;
      tinNumber?: string;
      creditLimit: number;
      notes?: string;
      tags?: string[];
      contacts: Array<{
        name: string;
        designation?: string;
        phone?: string;
        email?: string;
        isPrimary?: boolean;
      }>;
      addresses: Array<{
        label?: string;
        address1: string;
        address2?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
        isPrimary?: boolean;
      }>;
    },
  ) {
    const supplier = await tx.supplier.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId,
        supplierGroupId: input.supplierGroupId,
        supplierTypeId: input.supplierTypeId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        gstNumber: input.gstNumber,
        panNumber: input.panNumber,
        tinNumber: input.tinNumber,
        creditLimit: input.creditLimit,
        notes: input.notes,
        tags: input.tags ?? [],
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    if (input.contacts.length) {
      await tx.supplierContact.createMany({
        data: input.contacts.map((contact) => ({
          businessId: input.businessId,
          supplierId: supplier.id,
          ...contact,
          createdBy: input.userId,
          updatedBy: input.userId,
        })),
      });
    }

    if (input.addresses.length) {
      await tx.supplierAddress.createMany({
        data: input.addresses.map((address) => ({
          businessId: input.businessId,
          supplierId: supplier.id,
          ...address,
          createdBy: input.userId,
          updatedBy: input.userId,
        })),
      });
    }

    return supplier;
  }

  listLedger(businessId: string, supplierId: string) {
    return this.prisma.supplierLedger.findMany({
      where: { businessId, supplierId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  listPaymentHistory(businessId: string, supplierId: string) {
    return this.prisma.supplierLedger.findMany({
      where: {
        businessId,
        supplierId,
        entryType: LedgerEntryType.CREDIT,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listTransactions(businessId: string, supplierId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { businessId, supplierId, deletedAt: null },
      include: { purchaseItems: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
