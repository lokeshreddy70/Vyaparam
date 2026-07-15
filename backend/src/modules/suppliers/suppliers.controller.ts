import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  BulkImportSuppliersDto,
  CreateSupplierDto,
  CreateSupplierGroupDto,
  CreateSupplierTypeDto,
  SupplierLedgerEntryDto,
  SupplierListQueryDto,
  UpdateSupplierDto,
} from "./dto/supplier.dto";
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post("groups")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  createGroup(@CurrentUser() user: any, @Body() dto: CreateSupplierGroupDto) {
    return this.service.createGroup(user.businessId, user.id, dto);
  }

  @Get("groups")
  @Permissions("supplier.read")
  groups(@CurrentUser() user: any) {
    return this.service.groups(user.businessId);
  }

  @Post("types")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  createType(@CurrentUser() user: any, @Body() dto: CreateSupplierTypeDto) {
    return this.service.createType(user.businessId, user.id, dto);
  }

  @Get("types")
  @Permissions("supplier.read")
  types(@CurrentUser() user: any) {
    return this.service.types(user.businessId);
  }

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateSupplierDto) {
    return this.service.create(user.businessId, user.id, dto);
  }

  @Post("import")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  bulkImport(@CurrentUser() user: any, @Body() dto: BulkImportSuppliersDto) {
    return this.service.bulkImport(user.businessId, user.id, dto);
  }

  @Get("export")
  @Permissions("supplier.read")
  bulkExport(@CurrentUser() user: any) {
    return this.service.bulkExport(user.businessId);
  }

  @Get("")
  @Permissions("supplier.read")
  list(@CurrentUser() user: any, @Query() query: SupplierListQueryDto) {
    return this.service.list(user.businessId, query);
  }

  @Get(":id")
  @Permissions("supplier.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.softDelete(user.businessId, user.id, id);
  }

  @Patch(":id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  restore(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restore(user.businessId, user.id, id);
  }

  @Get(":id/ledger")
  @Permissions("supplier.read")
  ledger(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.ledger(user.businessId, id);
  }

  @Post(":id/ledger")
  @Roles("OWNER", "MANAGER")
  @Permissions("supplier.manage")
  addLedger(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: SupplierLedgerEntryDto) {
    return this.service.addLedgerEntry(user.businessId, user.id, id, dto);
  }

  @Get(":id/payments")
  @Permissions("supplier.read")
  payments(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.paymentHistory(user.businessId, id);
  }

  @Get(":id/transactions")
  @Permissions("supplier.read")
  transactions(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.transactionHistory(user.businessId, id);
  }
}
