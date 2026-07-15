import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  InvoiceStatus,
  LedgerEntryType,
  MovementType,
  PaymentMethod,
  ShiftStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
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
import { BillingPosRepository } from "./billing-pos.repository";

@Injectable()
export class BillingPosService {
  private readonly salesTypes = new Set<BillingDocumentType>([
    BillingDocumentType.SALES_INVOICE,
    BillingDocumentType.SALES_ORDER,
    BillingDocumentType.DELIVERY_CHALLAN,
    BillingDocumentType.POS_BILL,
    BillingDocumentType.ESTIMATE,
    BillingDocumentType.QUOTATION,
  ]);

  private readonly purchaseTypes = new Set<BillingDocumentType>([
    BillingDocumentType.PURCHASE_INVOICE,
    BillingDocumentType.PURCHASE_ORDER,
    BillingDocumentType.GOODS_RECEIPT_NOTE,
  ]);

  private readonly returnTypes = new Set<BillingDocumentType>([
    BillingDocumentType.SALES_RETURN,
    BillingDocumentType.PURCHASE_RETURN,
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: BillingPosRepository,
    private readonly settingsService: SettingsService,
  ) {}

  private isSalesType(type: BillingDocumentType) {
    return this.salesTypes.has(type);
  }

  private isPurchaseType(type: BillingDocumentType) {
    return this.purchaseTypes.has(type);
  }

  private isReturnType(type: BillingDocumentType) {
    return this.returnTypes.has(type);
  }

  private calcTotals(
    dto: CreateBillingDocumentDto,
    taxConfig: { cgst: number; sgst: number; igst: number; cess: number; defaultTaxPercent: number },
  ) {
    const defaultTaxPercent = taxConfig.defaultTaxPercent;
    const rows = dto.items.map((item) => {
      const lineBase = item.quantity * item.unitPrice;
      const discount = item.discount ?? 0;
      const taxable = Math.max(0, lineBase - discount);
      const taxPercent = item.taxPercent ?? defaultTaxPercent;
      const taxAmount = dto.isInclusiveTax
        ? taxable - taxable / (1 + taxPercent / 100)
        : (taxable * taxPercent) / 100;
      const lineTotal = dto.isInclusiveTax ? taxable : taxable + taxAmount;
      return { ...item, discount, taxPercent, taxAmount, lineTotal };
    });

    const subtotal = rows.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0);
    const lineDiscount = rows.reduce((sum, row) => sum + row.discount, 0);
    const discount = lineDiscount + (dto.discount ?? 0);
    const taxTotal = rows.reduce((sum, row) => sum + row.taxAmount, 0);
    const splitPercent = taxConfig.cgst + taxConfig.sgst + taxConfig.igst + taxConfig.cess;
    const cgstTotal = splitPercent > 0 ? (taxTotal * taxConfig.cgst) / splitPercent : taxTotal / 2;
    const sgstTotal = splitPercent > 0 ? (taxTotal * taxConfig.sgst) / splitPercent : taxTotal / 2;
    const igstTotal = splitPercent > 0 ? (taxTotal * taxConfig.igst) / splitPercent : 0;
    const roundOff = dto.roundOff ?? 0;
    const grandTotal = Math.max(0, subtotal - discount + (dto.isInclusiveTax ? 0 : taxTotal) + roundOff);

    return { rows, subtotal, discount, taxTotal, cgstTotal, sgstTotal, igstTotal, roundOff, grandTotal };
  }

  async createDocument(businessId: string, userId: string, dto: CreateBillingDocumentDto) {
    if (!dto.items.length) throw new BadRequestException("items required");

    const [taxConfig, invoiceConfig] = await Promise.all([
      this.settingsService.getTaxConfiguration(businessId),
      this.settingsService.getInvoiceConfiguration(businessId),
    ]);
    const totals = this.calcTotals(dto, taxConfig);

    let documentId: string;
    try {
      documentId = await this.prisma.$transaction(async (tx) => {
      const documentNo = await this.repository.nextDocumentNo(tx, businessId, dto.type, {
        prefix: invoiceConfig.invoice.prefix ?? undefined,
        series: invoiceConfig.invoice.series ?? undefined,
        financialYear: invoiceConfig.invoice.financialYear ?? undefined,
      });

      const doc = await tx.billingDocument.create({
        data: {
          businessId,
          branchId: dto.branchId ?? null,
          customerId: dto.customerId ?? null,
          supplierId: dto.supplierId ?? null,
          shiftId: dto.shiftId ?? null,
          terminalId: dto.terminalId ?? null,
          type: dto.type,
          status: BillingDocumentStatus.DRAFT,
          documentNo,
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxTotal: totals.taxTotal,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          dueAmount: totals.grandTotal,
          couponCode: dto.couponCode,
          offerCode: dto.offerCode,
          isInclusiveTax: dto.isInclusiveTax ?? false,
          notes: dto.notes,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const row of totals.rows) {
        const stockImpactQty =
          this.isSalesType(dto.type) ? -Math.abs(row.quantity) :
          this.isPurchaseType(dto.type) ? Math.abs(row.quantity) :
          dto.type === BillingDocumentType.SALES_RETURN ? Math.abs(row.quantity) :
          dto.type === BillingDocumentType.PURCHASE_RETURN ? -Math.abs(row.quantity) : 0;

        await tx.billingDocumentItem.create({
          data: {
            businessId,
            billingDocumentId: doc.id,
            productId: row.productId ?? null,
            description: row.description,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            discount: row.discount,
            taxPercent: row.taxPercent,
            taxAmount: row.taxAmount,
            lineTotal: row.lineTotal,
            stockImpactQty,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        if (row.productId && stockImpactQty !== 0) {
          const inventory = await tx.inventory.findFirst({
            where: { businessId, productId: row.productId, deletedAt: null },
            orderBy: { createdAt: "asc" },
          });

          if (!inventory) {
            throw new BadRequestException(`Inventory not found for product ${row.productId}`);
          }

          const nextQty = inventory.quantity + stockImpactQty;
          if (nextQty < 0) throw new BadRequestException(`Insufficient stock for product ${row.productId}`);

          await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: nextQty, updatedBy: userId } });
          await tx.inventoryMovement.create({
            data: {
              businessId,
              branchId: dto.branchId ?? null,
              inventoryId: inventory.id,
              type: stockImpactQty > 0 ? MovementType.IN : MovementType.OUT,
              quantity: Math.abs(stockImpactQty),
              reference: doc.documentNo,
              remarks: dto.type,
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }
      }

      if (dto.customerId && this.isSalesType(dto.type)) {
        const customer = await tx.customer.findFirst({ where: { id: dto.customerId, businessId, deletedAt: null } });
        if (customer) {
          const balance = customer.outstandingBalance + totals.grandTotal;
          await tx.customerLedger.create({
            data: {
              businessId,
              branchId: dto.branchId ?? null,
              customerId: customer.id,
              entryType: LedgerEntryType.DEBIT,
              amount: totals.grandTotal,
              balanceAfter: balance,
              referenceType: dto.type,
              referenceId: doc.id,
              remarks: "Billing debit",
              createdBy: userId,
              updatedBy: userId,
            },
          });
          await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: balance, updatedBy: userId } });
        }
      }

      if (dto.supplierId && this.isPurchaseType(dto.type)) {
        const supplier = await tx.supplier.findFirst({ where: { id: dto.supplierId, businessId, deletedAt: null } });
        if (supplier) {
          const balance = supplier.outstandingBalance + totals.grandTotal;
          await tx.supplierLedger.create({
            data: {
              businessId,
              branchId: dto.branchId ?? null,
              supplierId: supplier.id,
              entryType: LedgerEntryType.DEBIT,
              amount: totals.grandTotal,
              balanceAfter: balance,
              referenceType: dto.type,
              referenceId: doc.id,
              remarks: "Purchase debit",
              createdBy: userId,
              updatedBy: userId,
            },
          });
          await tx.supplier.update({ where: { id: supplier.id }, data: { outstandingBalance: balance, updatedBy: userId } });
        }
      }

      await tx.auditLog.create({
        data: {
          businessId,
          branchId: dto.branchId ?? null,
          userId,
          action: "BILLING_DOCUMENT_CREATED",
          entityType: "BillingDocument",
          entityId: doc.id,
          metadata: { type: dto.type, documentNo: doc.documentNo },
          createdBy: userId,
          updatedBy: userId,
        },
      });

        return doc.id;
      });
    } catch (error: any) {
      throw new BadRequestException(error?.message ?? "Document creation failed");
    }

    return this.findOne(businessId, documentId);
  }

  async list(businessId: string, query: BillingDocumentQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.branchId) where.branchId = query.branchId;
    if (query.q) {
      where.OR = [
        { documentNo: { contains: query.q, mode: "insensitive" } },
        { notes: { contains: query.q, mode: "insensitive" } },
        { customer: { name: { contains: query.q, mode: "insensitive" } } },
        { supplier: { name: { contains: query.q, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await this.repository.listDocuments(businessId, where, skip, limit);
    return { page, limit, total, items };
  }

  async findOne(businessId: string, id: string) {
    const document = await this.repository.findDocument(businessId, id);
    if (!document) throw new NotFoundException("Document not found");
    const [invoiceConfiguration, reportConfiguration, printerConfiguration] = await Promise.all([
      this.settingsService.getInvoiceConfiguration(businessId),
      this.settingsService.getReportConfiguration(businessId),
      this.settingsService.getPrinterConfiguration(businessId),
    ]);
    return {
      ...document,
      configuration: {
        invoice: invoiceConfiguration,
        report: reportConfiguration,
        printer: printerConfiguration,
      },
    };
  }

  async updateStatus(businessId: string, userId: string, id: string, dto: UpdateDocumentStatusDto) {
    await this.findOne(businessId, id);
    await this.prisma.billingDocument.update({ where: { id }, data: { status: dto.status, updatedBy: userId } });
    return this.findOne(businessId, id);
  }

  async hold(businessId: string, userId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.billingDocument.update({
      where: { id },
      data: { status: BillingDocumentStatus.HOLD, isHold: true, updatedBy: userId },
    });
    return this.findOne(businessId, id);
  }

  async resume(businessId: string, userId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.billingDocument.update({
      where: { id },
      data: { status: BillingDocumentStatus.DRAFT, isHold: false, updatedBy: userId },
    });
    return this.findOne(businessId, id);
  }

  async cancel(businessId: string, userId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.billingDocument.update({
      where: { id },
      data: { status: BillingDocumentStatus.CANCELLED, updatedBy: userId },
    });
    return this.findOne(businessId, id);
  }

  async void(businessId: string, userId: string, id: string, dto: VoidDocumentDto) {
    await this.findOne(businessId, id);
    await this.prisma.billingDocument.update({
      where: { id },
      data: {
        status: BillingDocumentStatus.VOID,
        isVoided: true,
        voidReason: dto.reason,
        updatedBy: userId,
      },
    });
    return this.findOne(businessId, id);
  }

  async recordPayment(businessId: string, userId: string, id: string, dto: RecordDocumentPaymentDto) {
    const document = await this.findOne(businessId, id);
    const totalPayment = dto.payments.reduce((s, p) => s + p.amount, 0);

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const line of dto.payments) {
        await tx.payment.create({
          data: {
            businessId,
            branchId: document.branchId,
            billingDocumentId: id,
            method: line.method,
            amount: line.amount,
            reference: line.reference,
            paymentMeta: { mixed: dto.payments.length > 1 },
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }

      const paidAmount = document.paidAmount + totalPayment;
      const dueAmount = Math.max(0, document.grandTotal - paidAmount);
      return tx.billingDocument.update({
        where: { id },
        data: {
          paidAmount,
          dueAmount,
          status: dueAmount === 0 ? BillingDocumentStatus.COMPLETED : BillingDocumentStatus.CONFIRMED,
          updatedBy: userId,
        },
      });
    });

    if (document.customerId && totalPayment > 0) {
      await this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({ where: { id: document.customerId!, businessId, deletedAt: null } });
        if (!customer) return;
        const balanceAfter = Math.max(0, customer.outstandingBalance - totalPayment);
        await tx.customerLedger.create({
          data: {
            businessId,
            branchId: document.branchId,
            customerId: customer.id,
            entryType: LedgerEntryType.CREDIT,
            amount: totalPayment,
            balanceAfter,
            referenceType: document.type,
            referenceId: document.id,
            remarks: "Payment credit",
            createdBy: userId,
            updatedBy: userId,
          },
        });
        await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: balanceAfter, updatedBy: userId } });
      });
    }

    if (document.supplierId && totalPayment > 0) {
      await this.prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.findFirst({ where: { id: document.supplierId!, businessId, deletedAt: null } });
        if (!supplier) return;
        const balanceAfter = Math.max(0, supplier.outstandingBalance - totalPayment);
        await tx.supplierLedger.create({
          data: {
            businessId,
            branchId: document.branchId,
            supplierId: supplier.id,
            entryType: LedgerEntryType.CREDIT,
            amount: totalPayment,
            balanceAfter,
            referenceType: document.type,
            referenceId: document.id,
            remarks: "Payment credit",
            createdBy: userId,
            updatedBy: userId,
          },
        });
        await tx.supplier.update({ where: { id: supplier.id }, data: { outstandingBalance: balanceAfter, updatedBy: userId } });
      });
    }

    return this.findOne(businessId, updated.id);
  }

  async split(businessId: string, userId: string, id: string, dto: SplitDocumentDto) {
    const source = await this.findOne(businessId, id);
    if (!source.items.length) throw new BadRequestException("No items to split");

    const newDocId = await this.prisma.$transaction(async (tx) => {
      const documentNo = await this.repository.nextDocumentNo(tx, businessId, source.type);
      const target = await tx.billingDocument.create({
        data: {
          businessId,
          branchId: source.branchId,
          customerId: source.customerId,
          supplierId: source.supplierId,
          shiftId: source.shiftId,
          terminalId: source.terminalId,
          type: source.type,
          status: BillingDocumentStatus.DRAFT,
          documentNo,
          isInclusiveTax: source.isInclusiveTax,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const split of dto.items) {
        const srcItem = source.items.find((i) => i.id === split.itemId);
        if (!srcItem || split.quantity > srcItem.quantity) throw new BadRequestException("Invalid split item quantity");

        const ratio = split.quantity / srcItem.quantity;
        const lineTotal = srcItem.lineTotal * ratio;
        const discount = srcItem.discount * ratio;
        const taxAmount = srcItem.taxAmount * ratio;

        await tx.billingDocumentItem.create({
          data: {
            businessId,
            billingDocumentId: target.id,
            productId: srcItem.productId,
            description: srcItem.description,
            quantity: split.quantity,
            unitPrice: srcItem.unitPrice,
            discount,
            taxPercent: srcItem.taxPercent,
            taxAmount,
            lineTotal,
            stockImpactQty: srcItem.stockImpactQty * ratio,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        await tx.billingDocumentItem.update({
          where: { id: srcItem.id },
          data: {
            quantity: srcItem.quantity - split.quantity,
            lineTotal: srcItem.lineTotal - lineTotal,
            discount: srcItem.discount - discount,
            taxAmount: srcItem.taxAmount - taxAmount,
            stockImpactQty: srcItem.stockImpactQty - srcItem.stockImpactQty * ratio,
            updatedBy: userId,
          },
        });
      }

      return target.id;
    });

    await this.recalculateDocument(businessId, userId, id);
    await this.recalculateDocument(businessId, userId, newDocId);
    return this.findOne(businessId, newDocId);
  }

  async merge(businessId: string, userId: string, dto: MergeDocumentsDto) {
    if (dto.documentIds.length < 2) throw new BadRequestException("At least two documents are required");

    const docs = await this.prisma.billingDocument.findMany({
      where: { businessId, id: { in: dto.documentIds }, deletedAt: null },
      include: { items: { where: { deletedAt: null } } },
    });
    if (docs.length !== dto.documentIds.length) throw new NotFoundException("One or more documents not found");

    const base = docs[0];
    const mergedId = await this.prisma.$transaction(async (tx) => {
      const documentNo = await this.repository.nextDocumentNo(tx, businessId, base.type);
      const merged = await tx.billingDocument.create({
        data: {
          businessId,
          branchId: base.branchId,
          customerId: base.customerId,
          supplierId: base.supplierId,
          shiftId: base.shiftId,
          terminalId: base.terminalId,
          type: base.type,
          status: BillingDocumentStatus.DRAFT,
          documentNo,
          isInclusiveTax: base.isInclusiveTax,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const doc of docs) {
        for (const item of doc.items) {
          await tx.billingDocumentItem.create({
            data: {
              businessId,
              billingDocumentId: merged.id,
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              lineTotal: item.lineTotal,
              stockImpactQty: item.stockImpactQty,
              createdBy: userId,
              updatedBy: userId,
            },
          });
        }

        await tx.billingDocument.update({
          where: { id: doc.id },
          data: { status: BillingDocumentStatus.CANCELLED, notes: "Merged", updatedBy: userId },
        });
      }

      return merged.id;
    });

    await this.recalculateDocument(businessId, userId, mergedId);
    return this.findOne(businessId, mergedId);
  }

  private async recalculateDocument(businessId: string, userId: string, id: string) {
    const doc = await this.findOne(businessId, id);
    const subtotal = doc.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = doc.items.reduce((s, i) => s + i.discount, 0);
    const taxTotal = doc.items.reduce((s, i) => s + i.taxAmount, 0);
    const grandTotal = Math.max(0, subtotal - discount + (doc.isInclusiveTax ? 0 : taxTotal) + doc.roundOff);
    const dueAmount = Math.max(0, grandTotal - doc.paidAmount);

    await this.prisma.billingDocument.update({
      where: { id },
      data: {
        subtotal,
        discount,
        taxTotal,
        cgstTotal: taxTotal / 2,
        sgstTotal: taxTotal / 2,
        igstTotal: 0,
        grandTotal,
        dueAmount,
        updatedBy: userId,
      },
    });
  }

  createRegister(businessId: string, userId: string, dto: CreateCashRegisterDto) {
    return this.prisma.cashRegister.create({
      data: {
        businessId,
        branchId: dto.branchId ?? null,
        name: dto.name,
        code: dto.code,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  openShift(businessId: string, userId: string, dto: OpenShiftDto) {
    return this.prisma.cashShift.create({
      data: {
        businessId,
        branchId: dto.branchId ?? null,
        registerId: dto.registerId,
        openingUserId: userId,
        openingBalance: dto.openingBalance,
        status: ShiftStatus.OPEN,
        remarks: dto.remarks,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async closeShift(businessId: string, userId: string, id: string, dto: CloseShiftDto) {
    const shift = await this.prisma.cashShift.findFirst({ where: { id, businessId, deletedAt: null } });
    if (!shift) throw new NotFoundException("Shift not found");

    return this.prisma.cashShift.update({
      where: { id },
      data: {
        status: ShiftStatus.CLOSED,
        closingUserId: userId,
        closingBalance: dto.closingBalance,
        closedAt: new Date(),
        remarks: dto.remarks,
        updatedBy: userId,
      },
    });
  }

  createTerminal(businessId: string, userId: string, dto: CreatePosTerminalDto) {
    return this.prisma.posTerminal.create({
      data: {
        businessId,
        branchId: dto.branchId ?? null,
        shiftId: dto.shiftId ?? null,
        name: dto.name,
        code: dto.code,
        deviceId: dto.deviceId,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async searchForPos(businessId: string, q?: string, barcode?: string, sku?: string) {
    if (barcode) {
      return this.prisma.product.findMany({
        where: {
          businessId,
          deletedAt: null,
          OR: [{ barcode }, { variants: { some: { barcode, deletedAt: null } } }],
        },
        include: { variants: { where: { deletedAt: null } } },
      });
    }

    if (sku) {
      return this.prisma.product.findMany({
        where: {
          businessId,
          deletedAt: null,
          OR: [{ sku }, { variants: { some: { sku, deletedAt: null } } }],
        },
        include: { variants: { where: { deletedAt: null } } },
      });
    }

    if (!q) return [];

    return this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { variants: { where: { deletedAt: null } } },
      take: 50,
      orderBy: { name: "asc" },
    });
  }

  async receipt(businessId: string, id: string) {
    const doc = await this.findOne(businessId, id);
    const qrPayload = `${doc.documentNo}|${doc.grandTotal.toFixed(2)}|${doc.createdAt.toISOString()}`;
    return { ...doc, qrPayload };
  }

  async refund(businessId: string, userId: string, id: string, amount: number) {
    const doc = await this.findOne(businessId, id);
    if (amount <= 0) throw new BadRequestException("amount should be > 0");

    const paid = doc.paidAmount;
    if (amount > paid) throw new BadRequestException("refund exceeds paid amount");

    const paidAmount = paid - amount;
    const dueAmount = Math.max(0, doc.grandTotal - paidAmount);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          businessId,
          branchId: doc.branchId,
          billingDocumentId: id,
          method: PaymentMethod.CASH,
          amount: -amount,
          reference: `REFUND-${doc.documentNo}`,
          paymentMeta: { refund: true },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.billingDocument.update({
        where: { id },
        data: {
          paidAmount,
          dueAmount,
          status: dueAmount === 0 ? BillingDocumentStatus.COMPLETED : BillingDocumentStatus.CONFIRMED,
          updatedBy: userId,
        },
      });
    });

    return this.findOne(businessId, id);
  }
}
