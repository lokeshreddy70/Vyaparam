import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateCategoryDto,
  CreateSubCategoryDto,
  UpdateCategoryDto,
  UpdateSubCategoryDto,
} from "./dto/create-category.dto";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(businessId: string, userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { businessId, name: dto.name, createdBy: userId, updatedBy: userId },
    });
  }

  findCategories(businessId: string) {
    return this.prisma.category.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  findCategoryById(businessId: string, id: string) {
    return this.prisma.category.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { subCategories: { where: { deletedAt: null }, orderBy: { name: "asc" } } },
    });
  }

  updateCategory(id: string, userId: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: { id },
      data: { ...dto, updatedBy: userId },
    });
  }

  softDeleteCategory(id: string, userId: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
  }

  restoreCategory(id: string, userId: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId },
    });
  }

  createSubCategory(businessId: string, userId: string, dto: CreateSubCategoryDto) {
    return this.prisma.subCategory.create({
      data: {
        businessId,
        categoryId: dto.categoryId,
        name: dto.name,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  findSubCategories(businessId: string, categoryId?: string) {
    const where: Prisma.SubCategoryWhereInput = { businessId, deletedAt: null };
    if (categoryId) where.categoryId = categoryId;

    return this.prisma.subCategory.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }

  findSubCategoryById(businessId: string, id: string) {
    return this.prisma.subCategory.findFirst({
      where: { id, businessId, deletedAt: null },
      include: { category: true },
    });
  }

  updateSubCategory(id: string, userId: string, dto: UpdateSubCategoryDto) {
    return this.prisma.subCategory.update({
      where: { id },
      data: { ...dto, updatedBy: userId },
    });
  }

  softDeleteSubCategory(id: string, userId: string) {
    return this.prisma.subCategory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
    });
  }

  restoreSubCategory(id: string, userId: string) {
    return this.prisma.subCategory.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null, updatedBy: userId },
    });
  }
}
