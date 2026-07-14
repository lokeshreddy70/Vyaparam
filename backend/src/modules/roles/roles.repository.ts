import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildRoleData(businessId: string, dto: CreateRoleDto) {
    const data: any = {
      businessId,
      name: dto.name,
      description: dto.description,
    };
    return data;
  }

  async create(businessId: string, dto: CreateRoleDto) {
    const role = await this.prisma.roleEntity.create({ data: this.buildRoleData(businessId, dto) });
    if (dto.permissions?.length) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissions.map((permissionId) => ({ businessId, roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
    return this.findOne(businessId, role.id);
  }

  findAll(businessId: string) {
    return this.prisma.roleEntity.findMany({
      where: { businessId, deletedAt: null },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.roleEntity.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async update(businessId: string, id: string, dto: CreateRoleDto) {
    const data = this.buildRoleData(businessId, dto);
    await this.prisma.roleEntity.update({ where: { id }, data });

    if (dto.permissions) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissions.length) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissions.map((permissionId) => ({ businessId, roleId: id, permissionId })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(businessId, id);
  }
}
