import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { UpdateEmployeeStatusDto } from "./dto/update-employee-status.dto";

@Controller("employees")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("employee.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.service.create(user.businessId, dto);
  }

  @Get("")
  @Roles("OWNER", "MANAGER")
  @Permissions("employee.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("employee.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("employee.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(user.businessId, id, dto);
  }

  @Patch(":id/status")
  @Roles("OWNER", "MANAGER")
  @Permissions("employee.manage")
  setStatus(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.service.setStatus(user.businessId, id, dto.isActive);
  }
}
