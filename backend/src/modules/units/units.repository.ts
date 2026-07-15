import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";

@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, userId: string, dto: CreateUnitDto) {
    return this.prisma.unit.create({
      data: { businessId, name: dto.name, symbol: dto.symbol, createdBy: userId, updatedBy: userId },
    });
  }

  findAll(businessId: string) {
    return this.prisma.unit.findMany({
      where: { businessId, deletedAt: null },
      orderBy: [{ name: "asc" }, { symbol: "asc" }],
    });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.unit.findFirst({ where: { id, businessId, deletedAt: null } });
  }

  update(id: string, userId: string, dto: UpdateUnitDto) {
    return this.prisma.unit.update({ where: { id }, data: { ...dto, updatedBy: userId } });
  }

  softDelete(id: string, userId: string) {
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
  }

  restore(id: string, userId: string) {
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId },
    });
  }
}
