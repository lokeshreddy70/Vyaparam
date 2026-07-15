import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BulkImportProductsDto, CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsRepository } from "./products.repository";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ProductsRepository,
  ) {}

  private generateSku(name: string, businessId: string) {
    const normalized = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "PRD";
    return `${normalized}-${businessId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  }

  private toProductWhere(businessId: string, query: Record<string, unknown>): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { businessId, deletedAt: null };

    const q = typeof query.q === "string" ? query.q.trim() : "";
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
      ];
    }

    if (typeof query.categoryId === "string" && query.categoryId) where.categoryId = query.categoryId;
    if (typeof query.subCategoryId === "string" && query.subCategoryId) where.subCategoryId = query.subCategoryId;
    if (typeof query.brandId === "string" && query.brandId) where.brandId = query.brandId;
    if (typeof query.sku === "string" && query.sku) where.sku = query.sku;
    if (typeof query.barcode === "string" && query.barcode) where.barcode = query.barcode;
    if (typeof query.status === "string" && query.status) where.isAvailable = query.status === "ACTIVE";

    return where;
  }

  async create(businessId: string, userId: string, dto: CreateProductDto) {
    const sku = dto.sku?.trim() || this.generateSku(dto.name, businessId);
    const barcode = dto.barcode?.trim() || dto.barcodes?.[0]?.trim() || null;
    const imageUrl = dto.imageUrl?.trim() || dto.imageUrls?.[0]?.trim() || null;

    const product = await this.prisma.$transaction((tx) =>
      this.repository.createWithVariants(tx, {
        businessId,
        userId,
        branchId: dto.branchId ?? null,
        categoryId: dto.categoryId ?? null,
        subCategoryId: dto.subCategoryId ?? null,
        brandId: dto.brandId ?? null,
        unitId: dto.unitId ?? null,
        name: dto.name,
        description: dto.description,
        sku,
        barcode,
        price: dto.sellingPrice,
        taxPercent: dto.taxPercent ?? 0,
        trackStock: dto.trackStock ?? true,
        stockQty: dto.stockQty ?? 0,
        isAvailable: dto.isAvailable ?? true,
        imageUrl,
        variants: (dto.variants ?? []).map((variant) => ({
          name: variant.name,
          sku: variant.sku?.trim() || null,
          barcode: variant.barcode?.trim() || null,
          price: variant.price,
        })),
        meta: {
          barcodes: dto.barcodes ?? [],
          imageUrls: dto.imageUrls ?? [],
          variantCount: dto.variants?.length ?? 0,
        },
      }),
    );

    return this.findOne(businessId, product.id);
  }

  findAll(businessId: string, query: Record<string, unknown>) {
    return this.repository.findMany(this.toProductWhere(businessId, query));
  }

  async findOne(businessId: string, id: string) {
    const product = await this.repository.findFirst({ id, businessId, deletedAt: null });
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(businessId, id);

    const data: Prisma.ProductUncheckedUpdateInput = {
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId === undefined ? undefined : dto.categoryId || null,
      subCategoryId: dto.subCategoryId === undefined ? undefined : dto.subCategoryId || null,
      brandId: dto.brandId === undefined ? undefined : dto.brandId || null,
      unitId: dto.unitId === undefined ? undefined : dto.unitId || null,
      sku: dto.sku,
      barcode: dto.barcode,
      price: dto.sellingPrice,
      taxPercent: dto.taxPercent,
      trackStock: dto.trackStock,
      stockQty: dto.stockQty,
      isAvailable: dto.isAvailable,
      imageUrl: dto.imageUrl,
      updatedBy: userId,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });

      if (dto.variants) {
        await tx.productVariant.updateMany({ where: { productId: id, deletedAt: null }, data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId } });
        if (dto.variants.length > 0) {
          await tx.productVariant.createMany({
            data: dto.variants.map((variant) => ({
              businessId,
              productId: id,
              name: variant.name,
              sku: variant.sku ?? null,
              barcode: variant.barcode ?? null,
              price: variant.price,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: "PRODUCT_UPDATED",
          entityType: "Product",
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
    await this.findOne(businessId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId, isAvailable: false },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: "PRODUCT_DELETED",
          entityType: "Product",
          entityId: id,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });

    return { success: true };
  }

  async restore(businessId: string, userId: string, id: string) {
    const deleted = await this.prisma.product.findFirst({ where: { id, businessId, deletedAt: { not: null } } });
    if (!deleted) throw new NotFoundException("Deleted product not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: null, deletedBy: null, updatedBy: userId, isAvailable: true },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: "PRODUCT_RESTORED",
          entityType: "Product",
          entityId: id,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    });

    return this.findOne(businessId, id);
  }

  async bulkImport(businessId: string, userId: string, dto: BulkImportProductsDto) {
    const createdIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const sku = item.sku?.trim() || this.generateSku(item.name, businessId);
        const result = await this.repository.createWithVariants(tx, {
          businessId,
          userId,
          branchId: item.branchId ?? null,
          categoryId: item.categoryId ?? null,
          subCategoryId: item.subCategoryId ?? null,
          brandId: item.brandId ?? null,
          unitId: item.unitId ?? null,
          name: item.name,
          description: item.description,
          sku,
          barcode: item.barcode ?? item.barcodes?.[0] ?? null,
          price: item.sellingPrice,
          taxPercent: item.taxPercent ?? 0,
          trackStock: item.trackStock ?? true,
          stockQty: item.stockQty ?? 0,
          isAvailable: item.isAvailable ?? true,
          imageUrl: item.imageUrl ?? item.imageUrls?.[0] ?? null,
          variants: (item.variants ?? []).map((variant) => ({
            name: variant.name,
            sku: variant.sku ?? null,
            barcode: variant.barcode ?? null,
            price: variant.price,
          })),
          meta: { mode: "bulk-import" },
        });

        createdIds.push(result.id);
      }
    });

    return { count: createdIds.length, ids: createdIds };
  }

  bulkExport(businessId: string) {
    return this.repository.findMany({ businessId, deletedAt: null });
  }

  async findByBarcode(businessId: string, barcode: string) {
    if (!barcode) throw new BadRequestException("barcode is required");

    const product = await this.repository.findFirst({
      businessId,
      deletedAt: null,
      OR: [{ barcode }, { variants: { some: { barcode, deletedAt: null } } }],
    });

    if (!product) throw new NotFoundException("Product not found for barcode");
    return product;
  }

  async findBySku(businessId: string, sku: string) {
    if (!sku) throw new BadRequestException("sku is required");

    const product = await this.repository.findFirst({
      businessId,
      deletedAt: null,
      OR: [{ sku }, { variants: { some: { sku, deletedAt: null } } }],
    });

    if (!product) throw new NotFoundException("Product not found for sku");
    return product;
  }

  async history(businessId: string, id: string) {
    await this.findOne(businessId, id);

    const [auditLogs, movements] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { businessId, entityType: "Product", entityId: id, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.inventoryMovement.findMany({
        where: {
          businessId,
          deletedAt: null,
          inventory: { productId: id, deletedAt: null },
        },
        include: { inventory: { include: { warehouse: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { auditLogs, movements };
  }
}
