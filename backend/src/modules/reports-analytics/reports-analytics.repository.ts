import { Injectable } from "@nestjs/common";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportFiltersDto } from "./dto/reports.dto";

const SALES_TYPES: BillingDocumentType[] = [
  BillingDocumentType.POS_BILL,
  BillingDocumentType.SALES_INVOICE,
  BillingDocumentType.SALES_ORDER,
];

const PURCHASE_TYPES: BillingDocumentType[] = [
  BillingDocumentType.PURCHASE_INVOICE,
  BillingDocumentType.PURCHASE_ORDER,
  BillingDocumentType.GOODS_RECEIPT_NOTE,
];

const RETURN_TYPES: BillingDocumentType[] = [BillingDocumentType.SALES_RETURN, BillingDocumentType.PURCHASE_RETURN];

@Injectable()
export class ReportsAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getClient(): PrismaClient {
    return this.prisma;
  }

  private dateRange(filters: ReportFiltersDto, field: "createdAt" | "spentAt" = "createdAt") {
    const range: Prisma.DateTimeFilter = {};
    if (filters.fromDate) range.gte = new Date(filters.fromDate);
    if (filters.toDate) range.lte = new Date(filters.toDate);
    return Object.keys(range).length ? { [field]: range } : {};
  }

  salesDocWhere(businessId: string, filters: ReportFiltersDto): Prisma.BillingDocumentWhereInput {
    return {
      businessId,
      deletedAt: null,
      type: { in: SALES_TYPES },
      status: { in: [BillingDocumentStatus.CONFIRMED, BillingDocumentStatus.COMPLETED] },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.employeeId ? { createdBy: filters.employeeId } : {}),
      ...(filters.invoiceStatus ? { status: filters.invoiceStatus } : {}),
      ...this.dateRange(filters),
    };
  }

  purchaseDocWhere(businessId: string, filters: ReportFiltersDto): Prisma.BillingDocumentWhereInput {
    return {
      businessId,
      deletedAt: null,
      type: { in: PURCHASE_TYPES },
      status: { in: [BillingDocumentStatus.CONFIRMED, BillingDocumentStatus.COMPLETED] },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...this.dateRange(filters),
    };
  }

  expenseWhere(businessId: string, filters: ReportFiltersDto): Prisma.ExpenseWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...this.dateRange(filters, "spentAt"),
    };
  }

  inventoryWhere(businessId: string, filters: ReportFiltersDto): Prisma.InventoryWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.categoryId
        ? { product: { categoryId: filters.categoryId, deletedAt: null } }
        : { product: { deletedAt: null } }),
    };
  }

  async dashboardSummary(businessId: string, filters: ReportFiltersDto) {
    const salesWhere = this.salesDocWhere(businessId, filters);
    const purchaseWhere = this.purchaseDocWhere(businessId, filters);
    const expenseWhere = this.expenseWhere(businessId, filters);

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - dayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      salesAgg,
      purchaseAgg,
      expenseAgg,
      dailySales,
      weeklySales,
      monthlySales,
      yearlySales,
      inventoryAgg,
      lowStockRows,
      outOfStockCount,
      customerCount,
      supplierCount,
      employeeCount,
      returnsAgg,
      taxAgg,
      paymentsAgg,
    ] = await Promise.all([
      this.prisma.billingDocument.aggregate({ where: salesWhere, _sum: { grandTotal: true, discount: true, taxTotal: true } }),
      this.prisma.billingDocument.aggregate({ where: purchaseWhere, _sum: { grandTotal: true } }),
      this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      this.prisma.billingDocument.aggregate({ where: { ...salesWhere, createdAt: { gte: dayStart } }, _sum: { grandTotal: true } }),
      this.prisma.billingDocument.aggregate({ where: { ...salesWhere, createdAt: { gte: weekStart } }, _sum: { grandTotal: true } }),
      this.prisma.billingDocument.aggregate({ where: { ...salesWhere, createdAt: { gte: monthStart } }, _sum: { grandTotal: true } }),
      this.prisma.billingDocument.aggregate({ where: { ...salesWhere, createdAt: { gte: yearStart } }, _sum: { grandTotal: true } }),
      this.prisma.inventory.aggregate({ where: this.inventoryWhere(businessId, filters), _sum: { quantity: true } }),
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(1)::int AS count
        FROM "inventory" i
        INNER JOIN "products" p ON p."id" = i."productId"
        WHERE i."businessId" = ${businessId}
          AND i."deletedAt" IS NULL
          AND p."deletedAt" IS NULL
          ${filters.branchId ? Prisma.sql`AND i."branchId" = ${filters.branchId}` : Prisma.empty}
          ${filters.categoryId ? Prisma.sql`AND p."categoryId" = ${filters.categoryId}` : Prisma.empty}
          AND COALESCE(i."reorderLevel", 0) > 0
            AND i."quantity" <= i."reorderLevel"
      `),
      this.prisma.inventory.count({ where: { ...this.inventoryWhere(businessId, filters), quantity: { lte: 0 } } }),
      this.prisma.customer.count({ where: { businessId, deletedAt: null, ...(filters.branchId ? { branchId: filters.branchId } : {}) } }),
      this.prisma.supplier.count({ where: { businessId, deletedAt: null, ...(filters.branchId ? { branchId: filters.branchId } : {}) } }),
      this.prisma.employee.count({ where: { businessId, deletedAt: null, ...(filters.branchId ? { branchId: filters.branchId } : {}) } }),
      this.prisma.billingDocument.aggregate({ where: { businessId, deletedAt: null, type: { in: RETURN_TYPES }, ...this.dateRange(filters) }, _sum: { grandTotal: true } }),
      this.prisma.billingDocument.aggregate({ where: salesWhere, _sum: { cgstTotal: true, sgstTotal: true, igstTotal: true, taxTotal: true } }),
      this.prisma.payment.aggregate({ where: { businessId, deletedAt: null, ...(filters.branchId ? { branchId: filters.branchId } : {}), ...this.dateRange(filters) }, _sum: { amount: true } }),
    ]);

    const revenue = salesAgg._sum.grandTotal ?? 0;
    const purchases = purchaseAgg._sum.grandTotal ?? 0;
    const expenses = expenseAgg._sum.amount ?? 0;
    const profit = revenue - purchases;
    const netProfit = profit - expenses;

    return {
      dailySales: dailySales._sum.grandTotal ?? 0,
      weeklySales: weeklySales._sum.grandTotal ?? 0,
      monthlySales: monthlySales._sum.grandTotal ?? 0,
      yearlySales: yearlySales._sum.grandTotal ?? 0,
      revenue,
      profit,
      expenses,
      netProfit,
      salesSummary: {
        totalSales: revenue,
        totalDiscount: salesAgg._sum.discount ?? 0,
        totalTax: salesAgg._sum.taxTotal ?? 0,
      },
      purchaseSummary: { totalPurchases: purchases },
      inventorySummary: {
        totalStockUnits: inventoryAgg._sum.quantity ?? 0,
        lowStockCount: lowStockRows[0]?.count ?? 0,
        outOfStockCount,
      },
      customerSummary: { totalCustomers: customerCount },
      supplierSummary: { totalSuppliers: supplierCount },
      employeeSummary: { totalEmployees: employeeCount },
      cashFlow: {
        inflow: paymentsAgg._sum.amount ?? 0,
        outflow: expenses,
      },
      gstSummary: {
        cgst: taxAgg._sum.cgstTotal ?? 0,
        sgst: taxAgg._sum.sgstTotal ?? 0,
        igst: taxAgg._sum.igstTotal ?? 0,
      },
      taxSummary: {
        totalTax: taxAgg._sum.taxTotal ?? 0,
      },
      returns: returnsAgg._sum.grandTotal ?? 0,
    };
  }

  async salesSeries(businessId: string, filters: ReportFiltersDto, bucket: "hour" | "day" | "month") {
    const whereParts: Prisma.Sql[] = [Prisma.sql`bd."businessId" = ${businessId}`, Prisma.sql`bd."deletedAt" IS NULL`];
    whereParts.push(Prisma.sql`bd."type"::text IN (${Prisma.join(SALES_TYPES)})`);
    whereParts.push(Prisma.sql`bd."status"::text IN (${Prisma.join([BillingDocumentStatus.CONFIRMED, BillingDocumentStatus.COMPLETED])})`);
    if (filters.branchId) whereParts.push(Prisma.sql`bd."branchId" = ${filters.branchId}`);
    if (filters.fromDate) whereParts.push(Prisma.sql`bd."createdAt" >= ${new Date(filters.fromDate)}`);
    if (filters.toDate) whereParts.push(Prisma.sql`bd."createdAt" <= ${new Date(filters.toDate)}`);

    const trunc = bucket === "hour" ? "hour" : bucket === "month" ? "month" : "day";

    return this.prisma.$queryRaw<Array<{ period: Date; amount: number }>>(Prisma.sql`
      SELECT date_trunc(${trunc}, bd."createdAt") AS period,
             COALESCE(SUM(bd."grandTotal"), 0)::float AS amount
      FROM "billing_documents" bd
      WHERE ${Prisma.join(whereParts, " AND ")}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
  }

  async topProducts(businessId: string, filters: ReportFiltersDto, take: number) {
    return this.prisma.$queryRaw<Array<{ productId: string; productName: string; qty: number; total: number }>>(Prisma.sql`
      SELECT bdi."productId" AS "productId",
             COALESCE(p."name", bdi."description") AS "productName",
             COALESCE(SUM(bdi."quantity"), 0)::float AS qty,
             COALESCE(SUM(bdi."lineTotal"), 0)::float AS total
      FROM "billing_document_items" bdi
      INNER JOIN "billing_documents" bd ON bd."id" = bdi."billingDocumentId"
      LEFT JOIN "products" p ON p."id" = bdi."productId"
      WHERE bd."businessId" = ${businessId}
        AND bd."deletedAt" IS NULL
        AND bdi."deletedAt" IS NULL
        AND bd."type"::text IN (${Prisma.join(SALES_TYPES)})
        AND bd."status"::text IN (${Prisma.join([BillingDocumentStatus.CONFIRMED, BillingDocumentStatus.COMPLETED])})
        ${filters.branchId ? Prisma.sql`AND bd."branchId" = ${filters.branchId}` : Prisma.empty}
        ${filters.fromDate ? Prisma.sql`AND bd."createdAt" >= ${new Date(filters.fromDate)}` : Prisma.empty}
        ${filters.toDate ? Prisma.sql`AND bd."createdAt" <= ${new Date(filters.toDate)}` : Prisma.empty}
      GROUP BY bdi."productId", COALESCE(p."name", bdi."description")
      ORDER BY total DESC
      LIMIT ${take}
    `);
  }

  async topCategories(businessId: string, filters: ReportFiltersDto, take: number) {
    return this.prisma.$queryRaw<Array<{ categoryId: string | null; categoryName: string; qty: number; total: number }>>(Prisma.sql`
      SELECT c."id" AS "categoryId",
             COALESCE(c."name", 'Uncategorized') AS "categoryName",
             COALESCE(SUM(bdi."quantity"), 0)::float AS qty,
             COALESCE(SUM(bdi."lineTotal"), 0)::float AS total
      FROM "billing_document_items" bdi
      INNER JOIN "billing_documents" bd ON bd."id" = bdi."billingDocumentId"
      LEFT JOIN "products" p ON p."id" = bdi."productId"
      LEFT JOIN "categories" c ON c."id" = p."categoryId"
      WHERE bd."businessId" = ${businessId}
        AND bd."deletedAt" IS NULL
        AND bdi."deletedAt" IS NULL
        AND bd."type"::text IN (${Prisma.join(SALES_TYPES)})
        AND bd."status"::text IN (${Prisma.join([BillingDocumentStatus.CONFIRMED, BillingDocumentStatus.COMPLETED])})
        ${filters.branchId ? Prisma.sql`AND bd."branchId" = ${filters.branchId}` : Prisma.empty}
        ${filters.fromDate ? Prisma.sql`AND bd."createdAt" >= ${new Date(filters.fromDate)}` : Prisma.empty}
        ${filters.toDate ? Prisma.sql`AND bd."createdAt" <= ${new Date(filters.toDate)}` : Prisma.empty}
      GROUP BY c."id", COALESCE(c."name", 'Uncategorized')
      ORDER BY total DESC
      LIMIT ${take}
    `);
  }
}
