import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { PermissionsService } from "./permissions.service";
import { CreatePermissionDto } from "./dto/create-permission.dto";

@Controller("permissions")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("permission.manage")
  create(@CurrentUser() user: any, @Body() dto: CreatePermissionDto) {
    return this.service.create(user.businessId, dto);
  }

  @Get("")
  @Permissions("permission.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Permissions("permission.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("permission.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: CreatePermissionDto) {
    return this.service.update(user.businessId, id, dto);
  }
}
