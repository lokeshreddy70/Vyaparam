import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { WarehousesService } from "./warehouses.service";
import { CreateWarehouseDto, UpdateWarehouseDto } from "./dto/warehouse.dto";

@Controller("warehouses")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateWarehouseDto) {
    return this.service.create(user.businessId, user.id, dto);
  }

  @Get("")
  @Permissions("inventory.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Permissions("inventory.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateWarehouseDto) {
    return this.service.update(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.softDelete(user.businessId, user.id, id);
  }

  @Patch(":id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  restore(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restore(user.businessId, user.id, id);
  }
}
