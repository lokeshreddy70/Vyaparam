import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(businessId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { businessId, ...dto },
    });
  }

  async findAll(businessId: string, opts: { search?: string; categoryId?: string; page?: number; pageSize?: number }) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const pageSize = opts.pageSize && opts.pageSize > 0 ? Math.min(opts.pageSize, 100) : 25;

    const where = {
      businessId,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.search
        ? { name: { contains: opts.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(businessId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(businessId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }
}
