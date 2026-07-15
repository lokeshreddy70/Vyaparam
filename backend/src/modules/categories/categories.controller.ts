import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { CategoriesService } from "./categories.service";
import {
  CreateCategoryDto,
  CreateSubCategoryDto,
  UpdateCategoryDto,
  UpdateSubCategoryDto,
} from "./dto/create-category.dto";

@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateCategoryDto) {
    return this.service.createCategory(user.businessId, user.id, dto);
  }

  @Get("")
  @Permissions("catalog.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findCategories(user.businessId);
  }

  @Get(":id")
  @Permissions("catalog.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findCategory(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.deleteCategory(user.businessId, user.id, id);
  }

  @Patch(":id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  restore(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restoreCategory(user.businessId, user.id, id);
  }

  @Post("sub-categories")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  createSubCategory(@CurrentUser() user: any, @Body() dto: CreateSubCategoryDto) {
    return this.service.createSubCategory(user.businessId, user.id, dto);
  }

  @Get("sub-categories/list")
  @Permissions("catalog.read")
  findSubCategories(@CurrentUser() user: any, @Query("categoryId") categoryId?: string) {
    return this.service.findSubCategories(user.businessId, categoryId);
  }

  @Patch("sub-categories/:id")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  updateSubCategory(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateSubCategoryDto) {
    return this.service.updateSubCategory(user.businessId, user.id, id, dto);
  }

  @Delete("sub-categories/:id")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  removeSubCategory(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.deleteSubCategory(user.businessId, user.id, id);
  }

  @Patch("sub-categories/:id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("catalog.manage")
  restoreSubCategory(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restoreSubCategory(user.businessId, user.id, id);
  }
}
