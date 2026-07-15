import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UnitsService } from "./units.service";
import { CreateUnitDto, UpdateUnitDto } from "./dto/unit.dto";

@Controller("units")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly service: UnitsService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateUnitDto) {
    return this.service.create(user.businessId, user.id, dto);
  }

  @Get("")
  @Permissions("catalog.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Permissions("catalog.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateUnitDto) {
    return this.service.update(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.softDelete(user.businessId, user.id, id);
  }

  @Patch(":id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  restore(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restore(user.businessId, user.id, id);
  }
}
