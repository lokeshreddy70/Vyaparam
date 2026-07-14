import { Injectable, NotFoundException } from "@nestjs/common";
import { PermissionsRepository } from "./permissions.repository";
import { CreatePermissionDto } from "./dto/create-permission.dto";

@Injectable()
export class PermissionsService {
  constructor(private readonly repository: PermissionsRepository) {}

  create(businessId: string, dto: CreatePermissionDto) {
    return this.repository.create(businessId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const permission = await this.repository.findOne(businessId, id);
    if (!permission) throw new NotFoundException("Permission not found");
    return permission;
  }

  async update(businessId: string, id: string, dto: CreatePermissionDto) {
    await this.findOne(businessId, id);
    return this.repository.update(businessId, id, dto);
  }
}
