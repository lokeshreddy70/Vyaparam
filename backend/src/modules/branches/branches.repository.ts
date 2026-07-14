import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { ...dto, businessId } });
  }

  findAll(businessId: string) {
    return this.prisma.branch.findMany({ where: { businessId, deletedAt: null } });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.branch.findFirst({ where: { id, businessId, deletedAt: null } });
  }

  update(businessId: string, id: string, dto: UpdateBranchDto) {
    return this.prisma.branch.update({ where: { id }, data: dto });
  }
}
