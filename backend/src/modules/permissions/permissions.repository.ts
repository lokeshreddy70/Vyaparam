import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, dto: CreatePermissionDto) {
    return this.prisma.permission.create({ data: { ...dto, businessId } });
  }

  findAll(businessId: string) {
    return this.prisma.permission.findMany({ where: { businessId, deletedAt: null } });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.permission.findFirst({ where: { id, businessId, deletedAt: null } });
  }

  update(businessId: string, id: string, dto: CreatePermissionDto) {
    return this.prisma.permission.update({ where: { id }, data: dto });
  }
}
