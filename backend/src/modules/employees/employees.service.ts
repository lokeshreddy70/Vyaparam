import { Injectable, NotFoundException } from "@nestjs/common";
import { EmployeesRepository } from "./employees.repository";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  create(businessId: string, dto: CreateEmployeeDto) {
    return this.repository.create(businessId, dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const employee = await this.repository.findOne(businessId, id);
    if (!employee) throw new NotFoundException("Employee not found");
    return employee;
  }

  async update(businessId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(businessId, id);
    return this.repository.update(businessId, id, dto);
  }

  async setStatus(businessId: string, id: string, isActive: boolean) {
    await this.findOne(businessId, id);
    return this.repository.setStatus(id, isActive);
  }
}
