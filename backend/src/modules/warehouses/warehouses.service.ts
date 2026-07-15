import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WarehousesRepository } from "./warehouses.repository";
import { CreateWarehouseDto, UpdateWarehouseDto } from "./dto/warehouse.dto";

@Injectable()
export class WarehousesService {
  constructor(
    private readonly repository: WarehousesRepository,
    private readonly prisma: PrismaService,
  ) {}

  create(businessId: string, userId: string, dto: CreateWarehouseDto) {
    return this.repository.create(businessId, userId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const warehouse = await this.repository.findOne(businessId, id);
    if (!warehouse) throw new NotFoundException("Warehouse not found");
    return warehouse;
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateWarehouseDto) {
    await this.findOne(businessId, id);
    return this.repository.update(id, userId, dto);
  }

  async softDelete(businessId: string, userId: string, id: string) {
    await this.findOne(businessId, id);
    return this.repository.softDelete(id, userId);
  }

  async restore(businessId: string, userId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, businessId, deletedAt: { not: null } },
    });
    if (!warehouse) throw new NotFoundException("Deleted warehouse not found");
    return this.repository.restore(id, userId);
  }
}
