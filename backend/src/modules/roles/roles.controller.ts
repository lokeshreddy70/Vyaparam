import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";

@Controller("roles")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("role.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateRoleDto) {
    return this.service.create(user.businessId, dto);
  }

  @Get("")
  @Permissions("role.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Permissions("role.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("role.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: CreateRoleDto) {
    return this.service.update(user.businessId, id, dto);
  }
}
