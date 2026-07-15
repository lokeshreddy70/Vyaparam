import { Injectable } from "@nestjs/common";
import { BillingDocumentStatus, BillingDocumentType, Prisma } from "@prisma/client";
import { Response } from "express";
import { ReportsAnalyticsRepository } from "./reports-analytics.repository";
import { ExportFormat, ReportFiltersDto } from "./dto/reports.dto";

@Injectable()
export class ReportsAnalyticsService {
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(private readonly repository: ReportsAnalyticsRepository) {}

  private cacheKey(prefix: string, businessId: string, filters: ReportFiltersDto) {
    return `${prefix}:${businessId}:${JSON.stringify(filters)}`;
  }

  private getCached<T>(key: string): T | null {
    const value = this.cache.get(key);
    if (!value) return null;
    if (Date.now() > value.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return value.value as T;
  }

  private setCached<T>(key: string, value: T, ttlMs = 60_000) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private paginate(filters: ReportFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  async dashboard(businessId: string, filters: ReportFiltersDto) {
    const key = this.cacheKey("dashboard", businessId, filters);
    const cached = this.getCached<any>(key);
    if (cached) return cached;

    const value = await this.repository.dashboardSummary(businessId, filters);
    this.setCached(key, value);
    return value;
  }

  async inventoryCurrentStock(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where = this.repository.inventoryWhere(businessId, filters);
    const [total, items] = await Promise.all([
      this.repository.getClient().inventory.count({ where }),
      this.repository.getClient().inventory.findMany({
        where,
        include: { product: true, warehouse: true, branch: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async inventoryStockValuation(businessId: string, filters: ReportFiltersDto) {
    const rows = await this.repository.getClient().inventory.findMany({
      where: this.repository.inventoryWhere(businessId, filters),
      include: { product: true },
    });

    const valuation = rows.reduce((sum, row) => sum + row.quantity * (row.product?.price ?? 0), 0);
    return { valuation, itemCount: rows.length };
  }

  async inventoryLowStock(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where = {
      ...this.repository.inventoryWhere(businessId, filters),
      reorderLevel: { gt: 0 },
    } as Prisma.InventoryWhereInput;
    const items = await this.repository.getClient().inventory.findMany({
      where,
      include: { product: true, warehouse: true },
      orderBy: { quantity: "asc" },
      skip,
      take: limit,
    });
    const filtered = items.filter((x) => x.quantity <= (x.reorderLevel ?? 0));
    return { page, limit, total: filtered.length, items: filtered };
  }

  async inventoryOutOfStock(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where = {
      ...this.repository.inventoryWhere(businessId, filters),
      quantity: { lte: 0 },
    } as Prisma.InventoryWhereInput;
    const [total, items] = await Promise.all([
      this.repository.getClient().inventory.count({ where }),
      this.repository.getClient().inventory.findMany({
        where,
        include: { product: true, warehouse: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async inventoryFastMovingProducts(businessId: string, filters: ReportFiltersDto) {
    return this.repository.topProducts(businessId, filters, filters.limit ?? 20);
  }

  async inventorySlowMovingProducts(businessId: string, filters: ReportFiltersDto) {
    const top = await this.repository.topProducts(businessId, filters, 200);
    return top.sort((a, b) => a.qty - b.qty).slice(0, filters.limit ?? 20);
  }

  async inventoryDeadStock(businessId: string, filters: ReportFiltersDto) {
    const sold = await this.repository.topProducts(businessId, filters, 5000);
    const soldSet = new Set(sold.map((s) => s.productId).filter(Boolean));
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.ProductWhereInput = {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    };

    const products = await this.repository.getClient().product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    const dead = products.filter((p) => !soldSet.has(p.id));
    return { page, limit, total: dead.length, items: dead.slice(skip, skip + limit) };
  }

  async inventoryMovement(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.InventoryMovementWhereInput = {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.repository.getClient().inventoryMovement.count({ where }),
      this.repository.getClient().inventoryMovement.findMany({
        where,
        include: { inventory: { include: { product: true, warehouse: true } }, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return { page, limit, total, items };
  }

  async inventoryStockAdjustmentHistory(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.StockAdjustmentWhereInput = {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.repository.getClient().stockAdjustment.count({ where }),
      this.repository.getClient().stockAdjustment.findMany({
        where,
        include: { warehouse: true, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async salesTopProducts(businessId: string, filters: ReportFiltersDto) {
    return this.repository.topProducts(businessId, filters, filters.limit ?? 20);
  }

  async salesTopCategories(businessId: string, filters: ReportFiltersDto) {
    return this.repository.topCategories(businessId, filters, filters.limit ?? 20);
  }

  async salesTopCustomers(businessId: string, filters: ReportFiltersDto) {
    const docs = await this.repository.getClient().billingDocument.groupBy({
      by: ["customerId"],
      where: {
        ...this.repository.salesDocWhere(businessId, filters),
        customerId: { not: null },
      },
      _sum: { grandTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: filters.limit ?? 20,
    });

    const customerIds = docs.map((d) => d.customerId).filter(Boolean) as string[];
    const customers = customerIds.length
      ? await this.repository.getClient().customer.findMany({ where: { id: { in: customerIds } } })
      : [];
    const byId = new Map(customers.map((c) => [c.id, c]));

    return docs.map((d) => ({
      customerId: d.customerId,
      customerName: d.customerId ? byId.get(d.customerId)?.name ?? "Unknown" : "Unknown",
      billCount: d._count._all,
      totalAmount: d._sum.grandTotal ?? 0,
    }));
  }

  async salesTopEmployees(businessId: string, filters: ReportFiltersDto) {
    const docs = await this.repository.getClient().billingDocument.groupBy({
      by: ["createdBy"],
      where: {
        ...this.repository.salesDocWhere(businessId, filters),
        createdBy: { not: null },
      },
      _sum: { grandTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: filters.limit ?? 20,
    });

    const userIds = docs.map((d) => d.createdBy).filter(Boolean) as string[];
    const users = userIds.length
      ? await this.repository.getClient().user.findMany({ where: { id: { in: userIds } } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return docs.map((d) => ({
      employeeId: d.createdBy,
      employeeName: d.createdBy ? byId.get(d.createdBy)?.name ?? "Unknown" : "Unknown",
      billCount: d._count._all,
      totalAmount: d._sum.grandTotal ?? 0,
    }));
  }

  async salesTopBranches(businessId: string, filters: ReportFiltersDto) {
    const docs = await this.repository.getClient().billingDocument.groupBy({
      by: ["branchId"],
      where: this.repository.salesDocWhere(businessId, filters),
      _sum: { grandTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: filters.limit ?? 20,
    });
    const branchIds = docs.map((d) => d.branchId).filter(Boolean) as string[];
    const branches = branchIds.length
      ? await this.repository.getClient().branch.findMany({ where: { id: { in: branchIds } } })
      : [];
    const byId = new Map(branches.map((b) => [b.id, b]));

    return docs.map((d) => ({
      branchId: d.branchId,
      branchName: d.branchId ? byId.get(d.branchId)?.name ?? "Head" : "Head",
      billCount: d._count._all,
      totalAmount: d._sum.grandTotal ?? 0,
    }));
  }

  async salesHourly(businessId: string, filters: ReportFiltersDto) {
    return this.repository.salesSeries(businessId, filters, "hour");
  }

  async salesDaily(businessId: string, filters: ReportFiltersDto) {
    return this.repository.salesSeries(businessId, filters, "day");
  }

  async salesMonthly(businessId: string, filters: ReportFiltersDto) {
    return this.repository.salesSeries(businessId, filters, "month");
  }

  async salesCancelledBills(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.BillingDocumentWhereInput = {
      businessId,
      deletedAt: null,
      status: { in: [BillingDocumentStatus.CANCELLED, BillingDocumentStatus.VOID] },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().billingDocument.count({ where }),
      this.repository.getClient().billingDocument.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return { page, limit, total, items };
  }

  async salesReturnedBills(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.BillingDocumentWhereInput = {
      businessId,
      deletedAt: null,
      type: BillingDocumentType.SALES_RETURN,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().billingDocument.count({ where }),
      this.repository.getClient().billingDocument.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return { page, limit, total, items };
  }

  async salesDiscountReport(businessId: string, filters: ReportFiltersDto) {
    const where = this.repository.salesDocWhere(businessId, filters);
    const { page, limit, skip } = this.paginate(filters);
    const [total, items, aggregate] = await Promise.all([
      this.repository.getClient().billingDocument.count({ where }),
      this.repository.getClient().billingDocument.findMany({
        where,
        select: {
          id: true,
          documentNo: true,
          discount: true,
          couponCode: true,
          offerCode: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.repository.getClient().billingDocument.aggregate({ where, _sum: { discount: true } }),
    ]);

    return { page, limit, total, totalDiscount: aggregate._sum.discount ?? 0, items };
  }

  async salesPaymentMethodReport(businessId: string, filters: ReportFiltersDto) {
    return this.repository.getClient().payment.groupBy({
      by: ["method"],
      where: {
        businessId,
        deletedAt: null,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.paymentMethod ? { method: filters.paymentMethod } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              createdAt: {
                ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
                ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    });
  }

  async purchaseSupplierPurchases(businessId: string, filters: ReportFiltersDto) {
    const docs = await this.repository.getClient().billingDocument.groupBy({
      by: ["supplierId"],
      where: {
        ...this.repository.purchaseDocWhere(businessId, filters),
        supplierId: { not: null },
      },
      _sum: { grandTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: filters.limit ?? 50,
    });

    const supplierIds = docs.map((x) => x.supplierId).filter(Boolean) as string[];
    const suppliers = supplierIds.length
      ? await this.repository.getClient().supplier.findMany({ where: { id: { in: supplierIds } } })
      : [];
    const byId = new Map(suppliers.map((s) => [s.id, s]));

    return docs.map((x) => ({
      supplierId: x.supplierId,
      supplierName: x.supplierId ? byId.get(x.supplierId)?.name ?? "Unknown" : "Unknown",
      purchaseCount: x._count._all,
      totalAmount: x._sum.grandTotal ?? 0,
    }));
  }

  async purchasePendingPurchases(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.PurchaseOrderWhereInput = {
      businessId,
      deletedAt: null,
      status: { in: ["OPEN", "PARTIALLY_RECEIVED"] as any },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().purchaseOrder.count({ where }),
      this.repository.getClient().purchaseOrder.findMany({
        where,
        include: { supplier: true, purchaseItems: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async purchaseHistory(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where = this.repository.purchaseDocWhere(businessId, filters);
    const [total, items] = await Promise.all([
      this.repository.getClient().billingDocument.count({ where }),
      this.repository.getClient().billingDocument.findMany({
        where,
        include: { supplier: true, items: true, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async purchaseSupplierLedger(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.SupplierLedgerWhereInput = {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().supplierLedger.count({ where }),
      this.repository.getClient().supplierLedger.findMany({
        where,
        include: { supplier: true, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async customerOutstandingBalance(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.CustomerWhereInput = {
      businessId,
      deletedAt: null,
      outstandingBalance: { gt: 0 },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.customerId ? { id: filters.customerId } : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().customer.count({ where }),
      this.repository.getClient().customer.findMany({
        where,
        orderBy: [{ outstandingBalance: "desc" }, { updatedAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async customerLedger(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.CustomerLedgerWhereInput = {
      businessId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().customerLedger.count({ where }),
      this.repository.getClient().customerLedger.findMany({
        where,
        include: { customer: true, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async customerPurchaseHistory(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const where: Prisma.BillingDocumentWhereInput = {
      ...this.repository.salesDocWhere(businessId, filters),
      customerId: { not: null },
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
    };
    const [total, items] = await Promise.all([
      this.repository.getClient().billingDocument.count({ where }),
      this.repository.getClient().billingDocument.findMany({
        where,
        include: { customer: true, items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return { page, limit, total, items };
  }

  async customerLoyalCustomers(businessId: string, filters: ReportFiltersDto) {
    return this.salesTopCustomers(businessId, filters);
  }

  async financialProfitAndLoss(businessId: string, filters: ReportFiltersDto) {
    const sales = await this.repository.getClient().billingDocument.aggregate({
      where: this.repository.salesDocWhere(businessId, filters),
      _sum: { grandTotal: true },
    });
    const purchases = await this.repository.getClient().billingDocument.aggregate({
      where: this.repository.purchaseDocWhere(businessId, filters),
      _sum: { grandTotal: true },
    });
    const expenses = await this.repository.getClient().expense.aggregate({
      where: this.repository.expenseWhere(businessId, filters),
      _sum: { amount: true },
    });

    const income = sales._sum.grandTotal ?? 0;
    const purchaseCost = purchases._sum.grandTotal ?? 0;
    const expenseCost = expenses._sum.amount ?? 0;
    const grossProfit = income - purchaseCost;
    const netProfit = grossProfit - expenseCost;

    return { income, purchaseCost, expenseCost, grossProfit, netProfit };
  }

  async financialCashBook(businessId: string, filters: ReportFiltersDto) {
    const { page, limit, skip } = this.paginate(filters);
    const [payments, expenses] = await Promise.all([
      this.repository.getClient().payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          ...(filters.branchId ? { branchId: filters.branchId } : {}),
          ...(filters.paymentMethod ? { method: filters.paymentMethod } : {}),
          ...(filters.fromDate || filters.toDate
            ? {
                createdAt: {
                  ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
                  ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
      this.repository.getClient().expense.findMany({
        where: this.repository.expenseWhere(businessId, filters),
        orderBy: { spentAt: "desc" },
      }),
    ]);

    const ledger = [
      ...payments.map((p) => ({ date: p.createdAt, type: "INFLOW", amount: p.amount, source: p.method, reference: p.reference })),
      ...expenses.map((e) => ({ date: e.spentAt, type: "OUTFLOW", amount: e.amount, source: "EXPENSE", reference: e.notes })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return { page, limit, total: ledger.length, items: ledger.slice(skip, skip + limit) };
  }

  async financialIncomeReport(businessId: string, filters: ReportFiltersDto) {
    const sales = await this.repository.getClient().billingDocument.aggregate({
      where: this.repository.salesDocWhere(businessId, filters),
      _sum: { grandTotal: true },
    });
    const incomeEntries = await this.repository.getClient().billingDocument.aggregate({
      where: {
        businessId,
        deletedAt: null,
        type: BillingDocumentType.INCOME_ENTRY,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.fromDate || filters.toDate
          ? {
              createdAt: {
                ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
                ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
              },
            }
          : {}),
      },
      _sum: { grandTotal: true },
    });
    return {
      salesIncome: sales._sum.grandTotal ?? 0,
      otherIncome: incomeEntries._sum.grandTotal ?? 0,
      totalIncome: (sales._sum.grandTotal ?? 0) + (incomeEntries._sum.grandTotal ?? 0),
    };
  }

  async financialExpenseReport(businessId: string, filters: ReportFiltersDto) {
    const expenses = await this.repository.getClient().expense.findMany({
      where: this.repository.expenseWhere(businessId, filters),
      include: { expenseCategory: true, branch: true },
      orderBy: { spentAt: "desc" },
      take: filters.limit ?? 200,
    });
    const total = expenses.reduce((sum, x) => sum + x.amount, 0);
    return { total, items: expenses };
  }

  async financialTaxReport(businessId: string, filters: ReportFiltersDto) {
    const taxAgg = await this.repository.getClient().billingDocument.aggregate({
      where: this.repository.salesDocWhere(businessId, filters),
      _sum: {
        taxTotal: true,
        cgstTotal: true,
        sgstTotal: true,
        igstTotal: true,
      },
    });
    return {
      taxTotal: taxAgg._sum.taxTotal ?? 0,
      cgstTotal: taxAgg._sum.cgstTotal ?? 0,
      sgstTotal: taxAgg._sum.sgstTotal ?? 0,
      igstTotal: taxAgg._sum.igstTotal ?? 0,
    };
  }

  async chartTrendAnalysis(businessId: string, filters: ReportFiltersDto) {
    const [daily, monthly] = await Promise.all([
      this.repository.salesSeries(businessId, filters, "day"),
      this.repository.salesSeries(businessId, filters, "month"),
    ]);
    return {
      lineChart: daily,
      areaChart: daily,
      barChart: monthly,
      pieChart: await this.salesPaymentMethodReport(businessId, filters),
      trendAnalysis: daily,
    };
  }

  async reportByKey(businessId: string, key: string, filters: ReportFiltersDto) {
    const map: Record<string, (businessId: string, filters: ReportFiltersDto) => Promise<unknown>> = {
      dashboard: this.dashboard.bind(this),
      "inventory-current-stock": this.inventoryCurrentStock.bind(this),
      "inventory-stock-valuation": this.inventoryStockValuation.bind(this),
      "inventory-low-stock": this.inventoryLowStock.bind(this),
      "inventory-out-of-stock": this.inventoryOutOfStock.bind(this),
      "inventory-fast-moving-products": this.inventoryFastMovingProducts.bind(this),
      "inventory-slow-moving-products": this.inventorySlowMovingProducts.bind(this),
      "inventory-dead-stock": this.inventoryDeadStock.bind(this),
      "inventory-movement": this.inventoryMovement.bind(this),
      "inventory-stock-adjustment-history": this.inventoryStockAdjustmentHistory.bind(this),
      "sales-top-products": this.salesTopProducts.bind(this),
      "sales-top-categories": this.salesTopCategories.bind(this),
      "sales-top-customers": this.salesTopCustomers.bind(this),
      "sales-top-employees": this.salesTopEmployees.bind(this),
      "sales-top-branches": this.salesTopBranches.bind(this),
      "sales-hourly": this.salesHourly.bind(this),
      "sales-daily": this.salesDaily.bind(this),
      "sales-monthly": this.salesMonthly.bind(this),
      "sales-cancelled-bills": this.salesCancelledBills.bind(this),
      "sales-returned-bills": this.salesReturnedBills.bind(this),
      "sales-discount": this.salesDiscountReport.bind(this),
      "sales-payment-method": this.salesPaymentMethodReport.bind(this),
      "purchase-supplier-purchases": this.purchaseSupplierPurchases.bind(this),
      "purchase-pending": this.purchasePendingPurchases.bind(this),
      "purchase-history": this.purchaseHistory.bind(this),
      "purchase-supplier-ledger": this.purchaseSupplierLedger.bind(this),
      "customer-outstanding-balance": this.customerOutstandingBalance.bind(this),
      "customer-ledger": this.customerLedger.bind(this),
      "customer-purchase-history": this.customerPurchaseHistory.bind(this),
      "customer-loyal": this.customerLoyalCustomers.bind(this),
      "financial-profit-loss": this.financialProfitAndLoss.bind(this),
      "financial-cash-book": this.financialCashBook.bind(this),
      "financial-income": this.financialIncomeReport.bind(this),
      "financial-expense": this.financialExpenseReport.bind(this),
      "financial-tax": this.financialTaxReport.bind(this),
      charts: this.chartTrendAnalysis.bind(this),
    };

    const runner = map[key];
    if (!runner) return null;
    return runner(businessId, filters);
  }

  private flattenRows(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) {
      return data.map((x) => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : { value: x }));
    }
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.items)) {
        return obj.items.map((x) => (typeof x === "object" && x !== null ? (x as Record<string, unknown>) : { value: x }));
      }
      return [obj];
    }
    return [{ value: data }];
  }

  private toCsv(data: unknown): string {
    const rows = this.flattenRows(data);
    if (!rows.length) return "";
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const escape = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const head = keys.join(",");
    const body = rows.map((row) => keys.map((k) => escape(row[k])).join(",")).join("\n");
    return `${head}\n${body}`;
  }

  exportReport(res: Response, reportKey: string, format: ExportFormat, data: unknown) {
    const safeReport = reportKey.replace(/[^a-zA-Z0-9-_]/g, "_");
    const csv = this.toCsv(data);
    if (format === ExportFormat.CSV) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"${safeReport}.csv\"`);
      res.send(csv);
      return;
    }

    if (format === ExportFormat.EXCEL) {
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=\"${safeReport}.xls\"`);
      res.send(csv);
      return;
    }

    if (format === ExportFormat.PDF) {
      const pdfLikeText = `REPORT: ${safeReport}\n\n${csv}`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=\"${safeReport}.pdf\"`);
      res.send(Buffer.from(pdfLikeText, "utf8"));
      return;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<html><head><title>${safeReport}</title></head><body><pre>${csv.replace(/</g, "&lt;")}</pre></body></html>`);
  }
}
