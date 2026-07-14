import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KotStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KitchenGateway } from './kitchen.gateway';
import { CreateOrderDto, AddOrderItemsDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private kitchenGateway: KitchenGateway,
  ) {}

  private async priceItems(businessId: string, items: { productId: string; quantity: number; modifiers?: any }[]) {
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
      if (!product.isAvailable) throw new BadRequestException(`${product.name} is currently unavailable`);
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        modifiers: item.modifiers ?? undefined,
        kotStatus: KotStatus.QUEUED,
      };
    });
  }

  async create(businessId: string, waiterId: string, dto: CreateOrderDto) {
    const itemsData = await this.priceItems(businessId, dto.items);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          businessId,
          tableId: dto.tableId,
          customerId: dto.customerId,
          waiterId,
          type: dto.type,
          notes: dto.notes,
          status: OrderStatus.SENT_TO_KITCHEN,
          items: { create: itemsData },
        },
        include: { items: { include: { product: true } }, table: true },
      });

      if (dto.tableId) {
        await tx.restaurantTable.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      return created;
    });

    this.kitchenGateway.emitNewKot(businessId, order);
    return order;
  }

  async findAll(businessId: string, status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      include: { items: { include: { product: true } }, table: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(businessId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, businessId },
      include: { items: { include: { product: true } }, table: true, invoice: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async addItems(businessId: string, orderId: string, dto: AddOrderItemsDto) {
    const order = await this.findOne(businessId, orderId);
    if (order.status === OrderStatus.BILLED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot add items to a closed order');
    }
    const itemsData = await this.priceItems(businessId, dto.items);

    await this.prisma.orderItem.createMany({
      data: itemsData.map((i) => ({ ...i, orderId })),
    });

    const updated = await this.findOne(businessId, orderId);
    this.kitchenGateway.emitNewKot(businessId, updated);
    return updated;
  }

  async updateItemKotStatus(businessId: string, orderItemId: string, status: KotStatus) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: orderItemId, order: { businessId } },
      include: { order: true },
    });
    if (!item) throw new NotFoundException('Order item not found');

    const updated = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { kotStatus: status },
    });

    this.kitchenGateway.emitKotStatusChange(businessId, {
      orderId: item.orderId,
      orderItemId,
      status,
    });

    // Auto-advance order status once every item in the order is ready.
    const siblings = await this.prisma.orderItem.findMany({ where: { orderId: item.orderId } });
    const allReady = siblings.every((s) => (s.id === orderItemId ? status : s.kotStatus) === 'READY');
    if (allReady) {
      await this.prisma.order.update({ where: { id: item.orderId }, data: { status: OrderStatus.READY } });
    }

    return updated;
  }

  async updateOrderStatus(businessId: string, id: string, status: OrderStatus) {
    await this.findOne(businessId, id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  async cancel(businessId: string, id: string) {
    const order = await this.findOne(businessId, id);
    await this.prisma.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
    if (order.tableId) {
      await this.prisma.restaurantTable.update({
        where: { id: order.tableId },
        data: { status: 'AVAILABLE' },
      });
    }
    return { success: true };
  }
}
