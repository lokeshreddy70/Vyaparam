import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, RecordPaymentDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private async nextInvoiceNumber(businessId: string) {
    const count = await this.prisma.invoice.count({ where: { businessId } });
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async createFromOrder(businessId: string, cashierId: string, dto: CreateInvoiceDto) {
    if (!dto.orderId) throw new BadRequestException('orderId is required');

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, businessId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Cannot bill a cancelled order');

    const existingInvoice = await this.prisma.invoice.findUnique({ where: { orderId: order.id } });
    if (existingInvoice) throw new BadRequestException('This order has already been billed');

    let subtotal = 0;
    let taxTotal = 0;
    for (const item of order.items) {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      subtotal += lineTotal;
      taxTotal += (lineTotal * Number(item.product.taxPercent)) / 100;
    }
    const discount = dto.discount ?? 0;
    const grandTotal = Math.max(subtotal + taxTotal - discount, 0);

    const invoiceNo = await this.nextInvoiceNumber(businessId);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          businessId,
          orderId: order.id,
          customerId: dto.customerId ?? order.customerId,
          cashierId,
          invoiceNo,
          subtotal,
          taxTotal,
          discount,
          grandTotal,
          status: InvoiceStatus.UNPAID,
        },
      });

      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.BILLED } });

      if (order.tableId) {
        await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'CLEANING' } });
      }

      return created;
    });

    return invoice;
  }

  async recordPayment(businessId: string, invoiceId: string, dto: RecordPaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, businessId },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = await this.prisma.payment.create({
      data: { invoiceId, method: dto.method, amount: dto.amount },
    });

    const paidSoFar = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + dto.amount;
    const status: InvoiceStatus =
      paidSoFar >= Number(invoice.grandTotal)
        ? InvoiceStatus.PAID
        : paidSoFar > 0
          ? InvoiceStatus.PARTIALLY_PAID
          : InvoiceStatus.UNPAID;

    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status } });

    return payment;
  }

  async findOne(businessId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        payments: true,
        order: { include: { items: { include: { product: true } }, table: true } },
        customer: true,
        cashier: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findAll(businessId: string, from?: string, to?: string) {
    return this.prisma.invoice.findMany({
      where: {
        businessId,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { payments: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async dailySummary(businessId: string, date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: { businessId, createdAt: { gte: start, lte: end }, status: { not: InvoiceStatus.REFUNDED } },
    });

    const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const totalTax = invoices.reduce((sum, inv) => sum + Number(inv.taxTotal), 0);

    return {
      date,
      invoiceCount: invoices.length,
      totalSales,
      totalTax,
    };
  }
}
