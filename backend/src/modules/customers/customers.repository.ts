import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  customerInclude() {
    return {
      customerGroup: true,
      customerType: true,
      branch: true,
      contacts: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
      addresses: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
    };
  }

  createGroup(businessId: string, userId: string, name: string) {
    return this.prisma.customerGroup.create({
      data: { businessId, name, createdBy: userId, updatedBy: userId },
    });
  }

  createType(businessId: string, userId: string, name: string, description?: string) {
    return this.prisma.customerType.create({
      data: { businessId, name, description, createdBy: userId, updatedBy: userId },
    });
  }

  listGroups(businessId: string) {
    return this.prisma.customerGroup.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  listTypes(businessId: string) {
    return this.prisma.customerType.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findCustomer(businessId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, businessId, deletedAt: null },
      include: this.customerInclude(),
    });
  }

  listCustomers(
    businessId: string,
    where: Prisma.CustomerWhereInput,
    orderBy: Prisma.CustomerOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    return this.prisma.$transaction([
      this.prisma.customer.count({ where: { businessId, deletedAt: null, ...where } }),
      this.prisma.customer.findMany({
        where: { businessId, deletedAt: null, ...where },
        include: this.customerInclude(),
        orderBy,
        skip,
        take,
      }),
    ]);
  }

  async createCustomerWithDetails(
    tx: Prisma.TransactionClient,
    input: {
      businessId: string;
      userId: string;
      branchId: string | null;
      name: string;
      phone?: string;
      email?: string;
      customerGroupId?: string;
      customerTypeId?: string;
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
    const customer = await tx.customer.create({
      data: {
        businessId: input.businessId,
        branchId: input.branchId,
        customerGroupId: input.customerGroupId,
        customerTypeId: input.customerTypeId,
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
      await tx.customerContact.createMany({
        data: input.contacts.map((contact) => ({
          businessId: input.businessId,
          customerId: customer.id,
          ...contact,
          createdBy: input.userId,
          updatedBy: input.userId,
        })),
      });
    }

    if (input.addresses.length) {
      await tx.customerAddress.createMany({
        data: input.addresses.map((address) => ({
          businessId: input.businessId,
          customerId: customer.id,
          ...address,
          createdBy: input.userId,
          updatedBy: input.userId,
        })),
      });
    }

    return customer;
  }

  listLedger(businessId: string, customerId: string) {
    return this.prisma.customerLedger.findMany({
      where: { businessId, customerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  listPaymentHistory(businessId: string, customerId: string) {
    return this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        OR: [{ bill: { customerId } }, { invoice: { customerId } }],
      },
      include: { bill: true, invoice: true },
      orderBy: { createdAt: "desc" },
    });
  }

  listTransactions(businessId: string, customerId: string) {
    return this.prisma.$transaction([
      this.prisma.bill.findMany({
        where: { businessId, customerId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.salesOrder.findMany({
        where: { businessId, customerId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  }
}
