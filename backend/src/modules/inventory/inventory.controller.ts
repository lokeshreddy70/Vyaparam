import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import {
  InventoryReservationDto,
  InventoryTransferDto,
  StockAdjustmentDto,
  StockMovementDto,
  UpsertInventoryDto,
} from "./dto/inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post("upsert")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  upsert(@CurrentUser() user: any, @Body() dto: UpsertInventoryDto) {
    return this.service.upsert(user.businessId, user.id, dto);
  }

  @Get("")
  @Permissions("inventory.read")
  list(@CurrentUser() user: any, @Query() query: Record<string, unknown>) {
    return this.service.list(user.businessId, query);
  }

  @Get("low-stock")
  @Permissions("inventory.read")
  lowStock(@CurrentUser() user: any) {
    return this.service.lowStock(user.businessId);
  }

  @Get("ledger")
  @Permissions("inventory.read")
  ledger(@CurrentUser() user: any, @Query("productId") productId?: string) {
    return this.service.ledger(user.businessId, productId);
  }

  @Get(":id")
  @Permissions("inventory.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Get(":id/history")
  @Permissions("inventory.read")
  history(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.history(user.businessId, id);
  }

  @Post("movements")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  movement(@CurrentUser() user: any, @Body() dto: StockMovementDto) {
    return this.service.movement(user.businessId, user.id, user.branchId ?? null, dto);
  }

  @Patch("adjustments")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  adjustment(@CurrentUser() user: any, @Body() dto: StockAdjustmentDto) {
    return this.service.stockAdjustment(user.businessId, user.id, user.branchId ?? null, dto);
  }

  @Post("transfers")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  transfer(@CurrentUser() user: any, @Body() dto: InventoryTransferDto) {
    return this.service.transfer(user.businessId, user.id, user.branchId ?? null, dto);
  }

  @Post("reservations")
  @Roles("OWNER", "MANAGER")
  @Permissions("inventory.manage")
  reservation(@CurrentUser() user: any, @Body() dto: InventoryReservationDto) {
    return this.service.reservation(user.businessId, user.id, user.branchId ?? null, dto);
  }
}
