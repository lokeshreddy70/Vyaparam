import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Injectable()
export class BusinessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBusinessDto) {
    return this.prisma.business.create({ data: dto });
  }

  findAll(businessId: string) {
    return this.prisma.business.findMany({ where: { id: businessId, deletedAt: null } });
  }

  findOne(businessId: string, id: string) {
    if (businessId !== id) return null;
    return this.prisma.business.findFirst({ where: { id, deletedAt: null } });
  }

  update(businessId: string, id: string, dto: UpdateBusinessDto) {
    if (businessId !== id) return null;
    return this.prisma.business.update({ where: { id }, data: dto });
  }
}
