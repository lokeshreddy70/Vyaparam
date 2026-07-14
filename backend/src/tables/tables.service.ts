import { Injectable, NotFoundException } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  create(businessId: string, label: string, capacity: number) {
    return this.prisma.restaurantTable.create({ data: { businessId, label, capacity } });
  }

  findAll(businessId: string) {
    return this.prisma.restaurantTable.findMany({
      where: { businessId },
      orderBy: { label: 'asc' },
      include: {
        orders: {
          where: { status: { notIn: ['BILLED', 'CANCELLED'] } },
          include: { items: { include: { product: true } } },
        },
      },
    });
  }

  async updateStatus(businessId: string, id: string, status: TableStatus) {
    const table = await this.prisma.restaurantTable.findFirst({ where: { id, businessId } });
    if (!table) throw new NotFoundException('Table not found');
    return this.prisma.restaurantTable.update({ where: { id }, data: { status } });
  }
}
