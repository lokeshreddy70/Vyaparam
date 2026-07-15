import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ExportFormat, ReportFiltersDto } from "./dto/reports.dto";
import { ReportsAnalyticsService } from "./reports-analytics.service";

@ApiTags("Reports & Analytics")
@ApiBearerAuth("bearer")
@Controller("reports-analytics")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReportsAnalyticsController {
  constructor(private readonly service: ReportsAnalyticsService) {}

  @Get("dashboard")
  @Permissions("reports.read")
  dashboard(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.dashboard(user.businessId, filters);
  }

  @Get("inventory/current-stock")
  @Permissions("reports.read")
  inventoryCurrentStock(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryCurrentStock(user.businessId, filters);
  }

  @Get("inventory/stock-valuation")
  @Permissions("reports.read")
  inventoryStockValuation(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryStockValuation(user.businessId, filters);
  }

  @Get("inventory/low-stock")
  @Permissions("reports.read")
  inventoryLowStock(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryLowStock(user.businessId, filters);
  }

  @Get("inventory/out-of-stock")
  @Permissions("reports.read")
  inventoryOutOfStock(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryOutOfStock(user.businessId, filters);
  }

  @Get("inventory/fast-moving-products")
  @Permissions("reports.read")
  inventoryFastMovingProducts(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryFastMovingProducts(user.businessId, filters);
  }

  @Get("inventory/slow-moving-products")
  @Permissions("reports.read")
  inventorySlowMovingProducts(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventorySlowMovingProducts(user.businessId, filters);
  }

  @Get("inventory/dead-stock")
  @Permissions("reports.read")
  inventoryDeadStock(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryDeadStock(user.businessId, filters);
  }

  @Get("inventory/movement")
  @Permissions("reports.read")
  inventoryMovement(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryMovement(user.businessId, filters);
  }

  @Get("inventory/stock-adjustment-history")
  @Permissions("reports.read")
  inventoryStockAdjustmentHistory(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.inventoryStockAdjustmentHistory(user.businessId, filters);
  }

  @Get("sales/top-products")
  @Permissions("reports.read")
  salesTopProducts(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesTopProducts(user.businessId, filters);
  }

  @Get("sales/top-categories")
  @Permissions("reports.read")
  salesTopCategories(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesTopCategories(user.businessId, filters);
  }

  @Get("sales/top-customers")
  @Permissions("reports.read")
  salesTopCustomers(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesTopCustomers(user.businessId, filters);
  }

  @Get("sales/top-employees")
  @Permissions("reports.read")
  salesTopEmployees(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesTopEmployees(user.businessId, filters);
  }

  @Get("sales/top-branches")
  @Permissions("reports.read")
  salesTopBranches(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesTopBranches(user.businessId, filters);
  }

  @Get("sales/hourly")
  @Permissions("reports.read")
  salesHourly(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesHourly(user.businessId, filters);
  }

  @Get("sales/daily")
  @Permissions("reports.read")
  salesDaily(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesDaily(user.businessId, filters);
  }

  @Get("sales/monthly")
  @Permissions("reports.read")
  salesMonthly(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesMonthly(user.businessId, filters);
  }

  @Get("sales/cancelled-bills")
  @Permissions("reports.read")
  salesCancelledBills(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesCancelledBills(user.businessId, filters);
  }

  @Get("sales/returned-bills")
  @Permissions("reports.read")
  salesReturnedBills(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesReturnedBills(user.businessId, filters);
  }

  @Get("sales/discount")
  @Permissions("reports.read")
  salesDiscount(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesDiscountReport(user.businessId, filters);
  }

  @Get("sales/payment-method")
  @Permissions("reports.read")
  salesPaymentMethod(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.salesPaymentMethodReport(user.businessId, filters);
  }

  @Get("purchase/supplier-purchases")
  @Permissions("reports.read")
  purchaseSupplierPurchases(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.purchaseSupplierPurchases(user.businessId, filters);
  }

  @Get("purchase/pending")
  @Permissions("reports.read")
  purchasePending(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.purchasePendingPurchases(user.businessId, filters);
  }

  @Get("purchase/history")
  @Permissions("reports.read")
  purchaseHistory(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.purchaseHistory(user.businessId, filters);
  }

  @Get("purchase/supplier-ledger")
  @Permissions("reports.read")
  purchaseSupplierLedger(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.purchaseSupplierLedger(user.businessId, filters);
  }

  @Get("customer/outstanding-balance")
  @Permissions("reports.read")
  customerOutstanding(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.customerOutstandingBalance(user.businessId, filters);
  }

  @Get("customer/ledger")
  @Permissions("reports.read")
  customerLedger(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.customerLedger(user.businessId, filters);
  }

  @Get("customer/purchase-history")
  @Permissions("reports.read")
  customerPurchaseHistory(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.customerPurchaseHistory(user.businessId, filters);
  }

  @Get("customer/loyal")
  @Permissions("reports.read")
  customerLoyal(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.customerLoyalCustomers(user.businessId, filters);
  }

  @Get("financial/profit-loss")
  @Permissions("reports.read")
  financialProfitLoss(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.financialProfitAndLoss(user.businessId, filters);
  }

  @Get("financial/cash-book")
  @Permissions("reports.read")
  financialCashBook(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.financialCashBook(user.businessId, filters);
  }

  @Get("financial/income")
  @Permissions("reports.read")
  financialIncome(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.financialIncomeReport(user.businessId, filters);
  }

  @Get("financial/expense")
  @Permissions("reports.read")
  financialExpense(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.financialExpenseReport(user.businessId, filters);
  }

  @Get("financial/tax")
  @Permissions("reports.read")
  financialTax(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.financialTaxReport(user.businessId, filters);
  }

  @Get("charts")
  @Permissions("reports.read")
  charts(@CurrentUser() user: any, @Query() filters: ReportFiltersDto) {
    return this.service.chartTrendAnalysis(user.businessId, filters);
  }

  @Get("export/:reportKey")
  @Roles("OWNER", "MANAGER")
  @Permissions("reports.read")
  async exportReport(
    @CurrentUser() user: any,
    @Param("reportKey") reportKey: string,
    @Query() query: ReportFiltersDto & { format: ExportFormat },
    @Res() res: Response,
  ) {
    const data = await this.service.reportByKey(user.businessId, reportKey, query);
    this.service.exportReport(res, reportKey, query.format ?? ExportFormat.CSV, data ?? []);
  }
}
