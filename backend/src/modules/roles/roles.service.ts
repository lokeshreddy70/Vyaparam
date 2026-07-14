import { Injectable, NotFoundException } from "@nestjs/common";
import { RolesRepository } from "./roles.repository";
import { CreateRoleDto } from "./dto/create-role.dto";

@Injectable()
export class RolesService {
  constructor(private readonly repository: RolesRepository) {}

  create(businessId: string, dto: CreateRoleDto) {
    return this.repository.create(businessId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const role = await this.repository.findOne(businessId, id);
    if (!role) throw new NotFoundException("Role not found");
    return role;
  }

  async update(businessId: string, id: string, dto: CreateRoleDto) {
    await this.findOne(businessId, id);
    return this.repository.update(businessId, id, dto);
  }
}
