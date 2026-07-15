import { Injectable, NotFoundException } from "@nestjs/common";
import { CategoriesRepository } from "./categories.repository";
import {
  CreateCategoryDto,
  CreateSubCategoryDto,
  UpdateCategoryDto,
  UpdateSubCategoryDto,
} from "./dto/create-category.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repository: CategoriesRepository,
    private readonly prisma: PrismaService,
  ) {}

  createCategory(businessId: string, userId: string, dto: CreateCategoryDto) {
    return this.repository.createCategory(businessId, userId, dto);
  }

  findCategories(businessId: string) {
    return this.repository.findCategories(businessId);
  }

  async findCategory(businessId: string, id: string) {
    const category = await this.repository.findCategoryById(businessId, id);
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async updateCategory(businessId: string, userId: string, id: string, dto: UpdateCategoryDto) {
    await this.findCategory(businessId, id);
    return this.repository.updateCategory(id, userId, dto);
  }

  async deleteCategory(businessId: string, userId: string, id: string) {
    await this.findCategory(businessId, id);
    return this.repository.softDeleteCategory(id, userId);
  }

  async restoreCategory(businessId: string, userId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, businessId, deletedAt: { not: null } } });
    if (!category) throw new NotFoundException("Deleted category not found");
    return this.repository.restoreCategory(id, userId);
  }

  async createSubCategory(businessId: string, userId: string, dto: CreateSubCategoryDto) {
    await this.findCategory(businessId, dto.categoryId);
    return this.repository.createSubCategory(businessId, userId, dto);
  }

  findSubCategories(businessId: string, categoryId?: string) {
    return this.repository.findSubCategories(businessId, categoryId);
  }

  async findSubCategory(businessId: string, id: string) {
    const subCategory = await this.repository.findSubCategoryById(businessId, id);
    if (!subCategory) throw new NotFoundException("Sub category not found");
    return subCategory;
  }

  async updateSubCategory(businessId: string, userId: string, id: string, dto: UpdateSubCategoryDto) {
    await this.findSubCategory(businessId, id);
    return this.repository.updateSubCategory(id, userId, dto);
  }

  async deleteSubCategory(businessId: string, userId: string, id: string) {
    await this.findSubCategory(businessId, id);
    return this.repository.softDeleteSubCategory(id, userId);
  }

  async restoreSubCategory(businessId: string, userId: string, id: string) {
    const subCategory = await this.prisma.subCategory.findFirst({
      where: { id, businessId, deletedAt: { not: null } },
    });
    if (!subCategory) throw new NotFoundException("Deleted sub category not found");
    return this.repository.restoreSubCategory(id, userId);
  }
}
