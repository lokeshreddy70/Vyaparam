import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BrandsRepository } from "./brands.repository";
import { CreateBrandDto, UpdateBrandDto } from "./dto/brand.dto";

@Injectable()
export class BrandsService {
  constructor(
    private readonly repository: BrandsRepository,
    private readonly prisma: PrismaService,
  ) {}

  create(businessId: string, userId: string, dto: CreateBrandDto) {
    return this.repository.create(businessId, userId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const brand = await this.repository.findOne(businessId, id);
    if (!brand) throw new NotFoundException("Brand not found");
    return brand;
  }

  async update(businessId: string, userId: string, id: string, dto: UpdateBrandDto) {
    await this.findOne(businessId, id);
    return this.repository.update(id, userId, dto);
  }

  async softDelete(businessId: string, userId: string, id: string) {
    await this.findOne(businessId, id);
    return this.repository.softDelete(id, userId);
  }

  async restore(businessId: string, userId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, businessId, deletedAt: { not: null } } });
    if (!brand) throw new NotFoundException("Deleted brand not found");
    return this.repository.restore(id, userId);
  }
}
