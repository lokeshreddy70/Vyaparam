import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(businessId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        businessId,
        userId: dto.userId,
        branchId: dto.branchId,
        employeeNo: dto.employeeNo,
        designation: dto.designation,
      },
    });
  }

  findAll(businessId: string) {
    return this.prisma.employee.findMany({
      where: { businessId, deletedAt: null },
      include: { user: true, branch: true },
    });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { user: true, branch: true },
    });
  }

  update(businessId: string, id: string, dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        designation: dto.designation,
      },
      include: { user: true, branch: true },
    });
  }

  setStatus(employeeId: string, isActive: boolean) {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        user: {
          update: {
            isActive,
          },
        },
      },
      include: { user: true },
    });
  }
}
