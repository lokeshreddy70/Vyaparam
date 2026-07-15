import { Injectable } from "@nestjs/common";
import { BillingDocumentType, Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BillingPosRepository {
  constructor(private readonly prisma: PrismaService) {}

  documentInclude() {
    return {
      items: { where: { deletedAt: null }, include: { product: true } },
      payments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
      customer: true,
      supplier: true,
      branch: true,
      shift: true,
      terminal: true,
    };
  }

  async nextDocumentNo(
    tx: Prisma.TransactionClient,
    businessId: string,
    type: BillingDocumentType,
  ) {
    const count = await tx.billingDocument.count({ where: { businessId, type } });
    const yyyy = new Date().getFullYear();
    const prefix = type.replace(/_/g, "").slice(0, 6);
    return `${prefix}-${yyyy}-${String(count + 1).padStart(6, "0")}`;
  }

  findDocument(businessId: string, id: string) {
    return this.prisma.billingDocument.findFirst({
      where: { id, businessId, deletedAt: null },
      include: this.documentInclude(),
    });
  }

  listDocuments(
    businessId: string,
    where: Prisma.BillingDocumentWhereInput,
    skip: number,
    take: number,
  ) {
    return this.prisma.$transaction([
      this.prisma.billingDocument.count({ where: { businessId, deletedAt: null, ...where } }),
      this.prisma.billingDocument.findMany({
        where: { businessId, deletedAt: null, ...where },
        include: this.documentInclude(),
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }
}
