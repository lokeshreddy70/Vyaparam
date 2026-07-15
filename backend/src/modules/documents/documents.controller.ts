import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileCategory } from "@prisma/client";
import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  AttachFileDto,
  CleanupDto,
  FileQueryDto,
  GenerateCodeDto,
  GeneratePdfDto,
  RestoreBackupDto,
  SignedUrlRequestDto,
  UploadFileMetaDto,
} from "./dto/documents.dto";
import { DocumentsService } from "./documents.service";

@ApiTags("documents")
@ApiBearerAuth("bearer")
@Controller("documents")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post("upload")
  @Roles("OWNER", "MANAGER", "STAFF")
  @Permissions("document.upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        category: { type: "string" },
        branchId: { type: "string" },
        entityType: { type: "string" },
        entityId: { type: "string" },
        visibility: { type: "string" },
        metadata: { type: "string" },
        tags: { type: "string" },
      },
      required: ["file", "category"],
    },
  })
  upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const dto: UploadFileMetaDto = {
      category: body.category,
      branchId: body.branchId,
      entityType: body.entityType,
      entityId: body.entityId,
      visibility: body.visibility,
      metadata: body.metadata ? JSON.parse(body.metadata) : undefined,
      tags: body.tags ? JSON.parse(body.tags) : undefined,
    };
    return this.service.uploadFile(user.businessId, user.id, file, dto);
  }

  @Post("upload/multiple")
  @Roles("OWNER", "MANAGER", "STAFF")
  @Permissions("document.upload")
  @UseInterceptors(FilesInterceptor("files", 50))
  @ApiConsumes("multipart/form-data")
  uploadMultiple(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    const dto: UploadFileMetaDto = {
      category: body.category,
      branchId: body.branchId,
      entityType: body.entityType,
      entityId: body.entityId,
      visibility: body.visibility,
      metadata: body.metadata ? JSON.parse(body.metadata) : undefined,
      tags: body.tags ? JSON.parse(body.tags) : undefined,
    };
    return this.service.uploadMultiple(user.businessId, user.id, files, dto);
  }

  @Post("company-logo")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadCompanyLogo(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadFile(user.businessId, user.id, file, { category: FileCategory.COMPANY_LOGO });
  }

  @Post("product/:productId/image")
  @Roles("OWNER", "MANAGER", "STAFF")
  @Permissions("document.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadProductImage(
    @CurrentUser() user: any,
    @Param("productId") productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFile(user.businessId, user.id, file, {
      category: FileCategory.PRODUCT_IMAGE,
      entityType: "Product",
      entityId: productId,
    });
  }

  @Post("employee/:employeeId/photo")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadEmployeePhoto(
    @CurrentUser() user: any,
    @Param("employeeId") employeeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFile(user.businessId, user.id, file, {
      category: FileCategory.EMPLOYEE_PHOTO,
      entityType: "Employee",
      entityId: employeeId,
    });
  }

  @Post("customer/:customerId/document")
  @Roles("OWNER", "MANAGER", "STAFF")
  @Permissions("document.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadCustomerDocument(
    @CurrentUser() user: any,
    @Param("customerId") customerId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFile(user.businessId, user.id, file, {
      category: FileCategory.CUSTOMER_DOCUMENT,
      entityType: "Customer",
      entityId: customerId,
    });
  }

  @Post("supplier/:supplierId/document")
  @Roles("OWNER", "MANAGER", "STAFF")
  @Permissions("document.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadSupplierDocument(
    @CurrentUser() user: any,
    @Param("supplierId") supplierId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadFile(user.businessId, user.id, file, {
      category: FileCategory.SUPPLIER_DOCUMENT,
      entityType: "Supplier",
      entityId: supplierId,
    });
  }

  @Get("")
  @Permissions("document.read")
  listFiles(@CurrentUser() user: any, @Query() query: FileQueryDto) {
    return this.service.listFiles(user.businessId, query);
  }

  @Get(":id")
  @Permissions("document.read")
  getFile(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.getFile(user.businessId, id);
  }

  @Get(":id/versions")
  @Permissions("document.read")
  getVersions(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.getVersions(user.businessId, id);
  }

  @Get(":id/download")
  @Permissions("document.download")
  async download(@CurrentUser() user: any, @Param("id") id: string, @Res() res: Response) {
    const data = await this.service.downloadFile(user.businessId, id);
    res.setHeader("Content-Type", data.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${data.fileName}\"`);
    data.stream.getStream().pipe(res);
  }

  @Post(":id/signed-url")
  @Permissions("document.download")
  createSignedUrl(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: SignedUrlRequestDto) {
    return this.service.createSignedUrl(user.businessId, user.id, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.delete")
  softDelete(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.softDeleteFile(user.businessId, user.id, id);
  }

  @Post("attachments")
  @Permissions("document.attach")
  attach(@CurrentUser() user: any, @Body() dto: AttachFileDto) {
    return this.service.attachFile(user.businessId, user.id, dto);
  }

  @Get("attachments/list")
  @Permissions("document.read")
  listAttachments(
    @CurrentUser() user: any,
    @Query() query: FileQueryDto,
    @Query("module") module?: string,
    @Query("recordId") recordId?: string,
  ) {
    return this.service.listAttachments(user.businessId, query, module, recordId);
  }

  @Post("generate/invoice-pdf")
  @Permissions("document.generate")
  generateInvoicePdf(@CurrentUser() user: any, @Body() dto: GeneratePdfDto) {
    return this.service.generatePdf(user.businessId, user.id, FileCategory.INVOICE_PDF, dto);
  }

  @Post("generate/quotation-pdf")
  @Permissions("document.generate")
  generateQuotationPdf(@CurrentUser() user: any, @Body() dto: GeneratePdfDto) {
    return this.service.generatePdf(user.businessId, user.id, FileCategory.QUOTATION_PDF, dto);
  }

  @Post("generate/purchase-pdf")
  @Permissions("document.generate")
  generatePurchasePdf(@CurrentUser() user: any, @Body() dto: GeneratePdfDto) {
    return this.service.generatePdf(user.businessId, user.id, FileCategory.PURCHASE_PDF, dto);
  }

  @Post("generate/receipt-pdf")
  @Permissions("document.generate")
  generateReceiptPdf(@CurrentUser() user: any, @Body() dto: GeneratePdfDto) {
    return this.service.generatePdf(user.businessId, user.id, FileCategory.RECEIPT_PDF, dto);
  }

  @Post("generate/barcode")
  @Permissions("document.generate")
  generateBarcode(@CurrentUser() user: any, @Body() dto: GenerateCodeDto) {
    return this.service.generateBarcode(user.businessId, user.id, dto);
  }

  @Post("generate/qr")
  @Permissions("document.generate")
  generateQr(@CurrentUser() user: any, @Body() dto: GenerateCodeDto) {
    return this.service.generateQrCode(user.businessId, user.id, dto);
  }

  @Post("cleanup")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.cleanup")
  cleanup(@CurrentUser() user: any, @Body() dto: CleanupDto) {
    return this.service.cleanup(user.businessId, user.id, dto);
  }

  @Post("backup/export")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.backup")
  exportBackup(@CurrentUser() user: any) {
    return this.service.exportBackup(user.businessId);
  }

  @Post("backup/restore")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.backup")
  restoreBackup(@CurrentUser() user: any, @Body() dto: RestoreBackupDto) {
    return this.service.restoreBackup(user.businessId, user.id, dto);
  }

  @Get("audit/logs")
  @Roles("OWNER", "MANAGER")
  @Permissions("document.audit")
  listAuditLogs(@CurrentUser() user: any, @Query() query: FileQueryDto) {
    return this.service.listAuditLogs(user.businessId, query);
  }
}
