import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  baseInclude() {
    return {
      category: true,
      subCategory: true,
      brand: true,
      unit: true,
      variants: { where: { deletedAt: null }, orderBy: { createdAt: "desc" as const } },
      inventories: { where: { deletedAt: null }, include: { warehouse: true } },
    };
  }

  findMany(where: Prisma.ProductWhereInput) {
    return this.prisma.product.findMany({
      where,
      include: this.baseInclude(),
      orderBy: { createdAt: "desc" },
    });
  }

  findFirst(where: Prisma.ProductWhereInput) {
    return this.prisma.product.findFirst({ where, include: this.baseInclude() });
  }

  async createWithVariants(
    tx: Prisma.TransactionClient,
    payload: {
      businessId: string;
      userId: string;
      branchId: string | null;
      categoryId: string | null;
      subCategoryId: string | null;
      brandId: string | null;
      unitId: string | null;
      name: string;
      description?: string;
      sku: string;
      barcode: string | null;
      price: number;
      taxPercent: number;
      trackStock: boolean;
      stockQty: number;
      isAvailable: boolean;
      imageUrl: string | null;
      variants: Array<{ name: string; sku: string | null; barcode: string | null; price: number }>;
      meta: Prisma.InputJsonValue;
    },
  ) {
    const product = await tx.product.create({
      data: {
        businessId: payload.businessId,
        branchId: payload.branchId,
        categoryId: payload.categoryId,
        subCategoryId: payload.subCategoryId,
        brandId: payload.brandId,
        unitId: payload.unitId,
        name: payload.name,
        description: payload.description,
        sku: payload.sku,
        barcode: payload.barcode,
        price: payload.price,
        taxPercent: payload.taxPercent,
        trackStock: payload.trackStock,
        stockQty: payload.stockQty,
        isAvailable: payload.isAvailable,
        imageUrl: payload.imageUrl,
        createdBy: payload.userId,
        updatedBy: payload.userId,
      },
    });

    if (payload.variants.length > 0) {
      await tx.productVariant.createMany({
        data: payload.variants.map((variant) => ({
          businessId: payload.businessId,
          branchId: payload.branchId,
          productId: product.id,
          name: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          price: variant.price,
          createdBy: payload.userId,
          updatedBy: payload.userId,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        businessId: payload.businessId,
        branchId: payload.branchId,
        userId: payload.userId,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        metadata: payload.meta,
        createdBy: payload.userId,
        updatedBy: payload.userId,
      },
    });

    return product;
  }
}
