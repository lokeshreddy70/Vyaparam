import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(businessId: string, name: string) {
    return this.prisma.category.create({ data: { businessId, name } });
  }

  findAll(businessId: string) {
    return this.prisma.category.findMany({ where: { businessId }, orderBy: { name: 'asc' } });
  }

  async update(businessId: string, id: string, name: string) {
    const category = await this.prisma.category.findFirst({ where: { id, businessId } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.category.update({ where: { id }, data: { name } });
  }

  async remove(businessId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, businessId } });
    if (!category) throw new NotFoundException('Category not found');
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
