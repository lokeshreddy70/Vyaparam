import { Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  includeConfig() {
    return {
      logoAsset: true,
      assets: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" as const },
      },
    };
  }

  findByBusinessId(businessId: string) {
    return this.prisma.businessConfiguration.findUnique({
      where: { businessId },
      include: this.includeConfig(),
    });
  }

  createDefault(
    tx: Prisma.TransactionClient,
    businessId: string,
    userId: string,
    businessDefaults?: { name?: string | null; address?: string | null; phone?: string | null; gstNumber?: string | null },
  ) {
    return tx.businessConfiguration.create({
      data: {
        businessId,
        businessName: businessDefaults?.name ?? null,
        address: businessDefaults?.address ?? null,
        phone: businessDefaults?.phone ?? null,
        gst: businessDefaults?.gstNumber ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: this.includeConfig(),
    });
  }

  async upsertByBusinessId(businessId: string, userId: string, data: Prisma.BusinessConfigurationUncheckedUpdateInput) {
    return this.prisma.$transaction(async (tx) => {
      const business = await tx.business.findUnique({ where: { id: businessId } });
      const { businessId: _ignoredBusinessId, ...createData } = data as Prisma.BusinessConfigurationUncheckedCreateInput;

      return tx.businessConfiguration.upsert({
        where: { businessId },
        create: {
          businessId,
          businessName: business?.name ?? null,
          address: business?.address ?? null,
          phone: business?.phone ?? null,
          gst: business?.gstNumber ?? null,
          createdBy: userId,
          updatedBy: userId,
          ...createData,
        },
        update: {
          ...data,
          updatedBy: userId,
        },
        include: this.includeConfig(),
      });
    });
  }

  createAsset(
    tx: Prisma.TransactionClient,
    data: Prisma.BusinessConfigAssetUncheckedCreateInput,
  ) {
    return tx.businessConfigAsset.create({ data });
  }

  setLogoAsset(
    tx: Prisma.TransactionClient,
    businessId: string,
    logoAssetId: string,
    userId: string,
  ) {
    return tx.businessConfiguration.update({
      where: { businessId },
      data: { logoAssetId, updatedBy: userId },
    });
  }

  listAssets(businessId: string, type?: string) {
    return this.prisma.businessConfigAsset.findMany({
      where: {
        businessId,
        deletedAt: null,
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  getClient(): PrismaClient {
    return this.prisma;
  }
}
