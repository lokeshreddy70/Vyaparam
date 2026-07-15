import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { BulkImportProductsDto, CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("product.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.service.create(user.businessId, user.id, dto);
  }

  @Post("bulk-import")
  @Roles("OWNER", "MANAGER")
  @Permissions("product.manage")
  bulkImport(@CurrentUser() user: any, @Body() dto: BulkImportProductsDto) {
    return this.service.bulkImport(user.businessId, user.id, dto);
  }

  @Get("bulk-export")
  @Permissions("product.read")
  bulkExport(@CurrentUser() user: any) {
    return this.service.bulkExport(user.businessId);
  }

  @Get("search")
  @Permissions("product.read")
  search(@CurrentUser() user: any, @Query() query: Record<string, unknown>) {
    return this.service.findAll(user.businessId, query);
  }

  @Get("barcode/:barcode")
  @Permissions("product.read")
  barcode(@CurrentUser() user: any, @Param("barcode") barcode: string) {
    return this.service.findByBarcode(user.businessId, barcode);
  }

  @Get("sku/:sku")
  @Permissions("product.read")
  sku(@CurrentUser() user: any, @Param("sku") sku: string) {
    return this.service.findBySku(user.businessId, sku);
  }

  @Get("")
  @Permissions("product.read")
  findAll(@CurrentUser() user: any, @Query() query: Record<string, unknown>) {
    return this.service.findAll(user.businessId, query);
  }

  @Get(":id")
  @Permissions("product.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("product.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("product.manage")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.softDelete(user.businessId, user.id, id);
  }

  @Patch(":id/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("product.manage")
  restore(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.restore(user.businessId, user.id, id);
  }

  @Get(":id/history")
  @Permissions("product.read")
  history(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.history(user.businessId, id);
  }
}
