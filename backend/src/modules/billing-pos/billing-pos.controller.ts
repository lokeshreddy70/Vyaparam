import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  BillingDocumentQueryDto,
  CloseShiftDto,
  CreateBillingDocumentDto,
  CreateCashRegisterDto,
  CreatePosTerminalDto,
  MergeDocumentsDto,
  OpenShiftDto,
  RecordDocumentPaymentDto,
  SplitDocumentDto,
  UpdateDocumentStatusDto,
  VoidDocumentDto,
} from "./dto/billing-pos.dto";
import { BillingPosService } from "./billing-pos.service";

@Controller("billing-pos")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BillingPosController {
  constructor(private readonly service: BillingPosService) {}

  @Post("documents")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  createDocument(@CurrentUser() user: any, @Body() dto: CreateBillingDocumentDto) {
    return this.service.createDocument(user.businessId, user.id, dto);
  }

  @Get("documents")
  @Permissions("billing.read")
  list(@CurrentUser() user: any, @Query() query: BillingDocumentQueryDto) {
    return this.service.list(user.businessId, query);
  }

  @Get("documents/:id")
  @Permissions("billing.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch("documents/:id/status")
  @Roles("OWNER", "MANAGER")
  @Permissions("billing.manage")
  updateStatus(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateDocumentStatusDto) {
    return this.service.updateStatus(user.businessId, user.id, id, dto);
  }

  @Post("documents/:id/hold")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  hold(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.hold(user.businessId, user.id, id);
  }

  @Post("documents/:id/resume")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  resume(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.resume(user.businessId, user.id, id);
  }

  @Post("documents/:id/cancel")
  @Roles("OWNER", "MANAGER")
  @Permissions("billing.manage")
  cancel(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.cancel(user.businessId, user.id, id);
  }

  @Post("documents/:id/void")
  @Roles("OWNER", "MANAGER")
  @Permissions("billing.manage")
  voidDocument(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: VoidDocumentDto) {
    return this.service.void(user.businessId, user.id, id, dto);
  }

  @Post("documents/:id/payments")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  payments(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: RecordDocumentPaymentDto) {
    return this.service.recordPayment(user.businessId, user.id, id, dto);
  }

  @Post("documents/:id/refund")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  refund(@CurrentUser() user: any, @Param("id") id: string, @Body("amount") amount: number) {
    return this.service.refund(user.businessId, user.id, id, Number(amount));
  }

  @Post("documents/:id/split")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  split(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: SplitDocumentDto) {
    return this.service.split(user.businessId, user.id, id, dto);
  }

  @Post("documents/merge")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("billing.manage")
  merge(@CurrentUser() user: any, @Body() dto: MergeDocumentsDto) {
    return this.service.merge(user.businessId, user.id, dto);
  }

  @Get("documents/:id/receipt")
  @Permissions("billing.read")
  receipt(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.receipt(user.businessId, id);
  }

  @Post("registers")
  @Roles("OWNER", "MANAGER")
  @Permissions("pos.manage")
  createRegister(@CurrentUser() user: any, @Body() dto: CreateCashRegisterDto) {
    return this.service.createRegister(user.businessId, user.id, dto);
  }

  @Post("shifts/open")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("pos.manage")
  openShift(@CurrentUser() user: any, @Body() dto: OpenShiftDto) {
    return this.service.openShift(user.businessId, user.id, dto);
  }

  @Post("shifts/:id/close")
  @Roles("OWNER", "MANAGER", "CASHIER")
  @Permissions("pos.manage")
  closeShift(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: CloseShiftDto) {
    return this.service.closeShift(user.businessId, user.id, id, dto);
  }

  @Post("terminals")
  @Roles("OWNER", "MANAGER")
  @Permissions("pos.manage")
  createTerminal(@CurrentUser() user: any, @Body() dto: CreatePosTerminalDto) {
    return this.service.createTerminal(user.businessId, user.id, dto);
  }

  @Get("search")
  @Permissions("billing.read")
  search(@CurrentUser() user: any, @Query("q") q?: string, @Query("barcode") barcode?: string, @Query("sku") sku?: string) {
    return this.service.searchForPos(user.businessId, q, barcode, sku);
  }

  @Delete("documents/:id")
  @Roles("OWNER", "MANAGER")
  @Permissions("billing.manage")
  deleteSoft(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.void(user.businessId, user.id, id, { reason: "Deleted by admin" });
  }
}
