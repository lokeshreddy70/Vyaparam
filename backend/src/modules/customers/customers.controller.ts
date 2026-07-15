import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  BulkImportCustomersDto,
  CreateCustomerDto,
  CreateCustomerGroupDto,
  CreateCustomerTypeDto,
  CustomerListQueryDto,
  LedgerEntryDto,
  UpdateCustomerDto,
} from "./dto/customer.dto";
import { CustomersService } from "./customers.service";

@Controller("customers")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post("groups")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  createGroup(@CurrentUser() user: any, @Body() dto: CreateCustomerGroupDto) {
    return this.service.createGroup(user.businessId, user.id, dto);
  }

  @Get("groups")
  @Permissions("customer.read")
  groups(@CurrentUser() user: any) {
    return this.service.groups(user.businessId);
  }

  @Post("types")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  createType(@CurrentUser() user: any, @Body() dto: CreateCustomerTypeDto) {
    return this.service.createType(user.businessId, user.id, dto);
  }

  @Get("types")
  @Permissions("customer.read")
  types(@CurrentUser() user: any) {
    return this.service.types(user.businessId);
  }

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerDto) {
    return this.service.create(user.businessId, user.id, dto);
  }

  @Post("import")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  bulkImport(@CurrentUser() user: any, @Body() dto: BulkImportCustomersDto) {
    return this.service.bulkImport(user.businessId, user.id, dto);
  }

  @Get("export")
  @Permissions("customer.read")
  bulkExport(@CurrentUser() user: any) {
    return this.service.bulkExport(user.businessId);
  }

  @Get("")
  @Permissions("customer.read")
  list(@CurrentUser() user: any, @Query() query: CustomerListQueryDto) {
    return this.service.list(user.businessId, query);
  }

  @Get(":id")
  @Permissions("customer.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.softDelete(user.businessId, user.id, id);
  }

  @Patch(":id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  restore(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restore(user.businessId, user.id, id);
  }

  @Get(":id/ledger")
  @Permissions("customer.read")
  ledger(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.ledger(user.businessId, id);
  }

  @Post(":id/ledger")
  @Roles("OWNER", "MANAGER")
  @Permissions("customer.manage")
  addLedger(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: LedgerEntryDto) {
    return this.service.addLedgerEntry(user.businessId, user.id, id, dto);
  }

  @Get(":id/payments")
  @Permissions("customer.read")
  payments(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.paymentHistory(user.businessId, id);
  }

  @Get(":id/transactions")
  @Permissions("customer.read")
  transactions(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.transactionHistory(user.businessId, id);
  }
}
