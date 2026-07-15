import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UnitsRepository } from "./units.repository";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";

@Injectable()
export class UnitsService {
  constructor(
    private readonly repository: UnitsRepository,
    private readonly prisma: PrismaService,
  ) {}

  create(businessId: string, userId: string, dto: CreateUnitDto) {
    return this.repository.create(businessId, userId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const unit = await this.repository.findOne(businessId, id);
    if (!unit) throw new NotFoundException("Unit not found");
    return unit;
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateUnitDto) {
    await this.findOne(businessId, id);
    return this.repository.update(id, userId, dto);
  }

  async softDelete(businessId: string, userId: string, id: string) {
    await this.findOne(businessId, id);
    return this.repository.softDelete(id, userId);
  }

  async restore(businessId: string, userId: string, id: string) {
    const unit = await this.prisma.unit.findFirst({ where: { id, businessId, deletedAt: { not: null } } });
    if (!unit) throw new NotFoundException("Deleted unit not found");
    return this.repository.restore(id, userId);
  }
}
