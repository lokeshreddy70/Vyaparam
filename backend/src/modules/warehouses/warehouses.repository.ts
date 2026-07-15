import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWarehouseDto, UpdateWarehouseDto } from "./dto/warehouse.dto";

@Injectable()
export class WarehousesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, userId: string, dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({
      data: {
        businessId,
        name: dto.name,
        code: dto.code,
        branchId: dto.branchId ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  findAll(businessId: string) {
    return this.prisma.warehouse.findMany({
      where: { businessId, deletedAt: null },
      include: { branch: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.warehouse.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { branch: true },
    });
  }

  update(id: string, userId: string, dto: UpdateWarehouseDto) {
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...dto,
        branchId: dto.branchId === undefined ? undefined : dto.branchId || null,
        updatedBy: userId,
      },
    });
  }

  softDelete(id: string, userId: string) {
    return this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
  }

  restore(id: string, userId: string) {
    return this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId },
    });
  }
}
