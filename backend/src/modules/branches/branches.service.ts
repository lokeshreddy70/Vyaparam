import { Injectable, NotFoundException } from "@nestjs/common";
import { BranchesRepository } from "./branches.repository";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
  constructor(private readonly repository: BranchesRepository) {}

  create(businessId: string, dto: CreateBranchDto) {
    return this.repository.create(businessId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const branch = await this.repository.findOne(businessId, id);
    if (!branch) throw new NotFoundException("Branch not found");
    return branch;
  }

  async update(businessId: string, id: string, dto: UpdateBranchDto) {
    await this.findOne(businessId, id);
    return this.repository.update(businessId, id, dto);
  }
}
