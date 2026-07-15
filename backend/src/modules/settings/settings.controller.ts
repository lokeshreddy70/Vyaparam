import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { BusinessConfigAssetType } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  BusinessConfigurationQueryDto,
  UpdateBusinessConfigurationDto,
  UpdateFeatureFlagDto,
  UpdateModuleToggleDto,
} from "./dto/business-configuration.dto";
import { SettingsService } from "./settings.service";

@ApiTags("Business Configuration")
@ApiBearerAuth("bearer")
@Controller("settings/business-configuration")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get("")
  @Permissions("business.read")
  getConfiguration(@CurrentUser() user: any, @Query() query: BusinessConfigurationQueryDto) {
    return this.service.getConfiguration(user.businessId, query.section);
  }

  @Patch("")
  @Roles("OWNER", "MANAGER")
  @Permissions("business.manage")
  updateConfiguration(@CurrentUser() user: any, @Body() dto: UpdateBusinessConfigurationDto) {
    return this.service.updateConfiguration(user.businessId, user.id, dto);
  }

  @Patch("feature-flag")
  @Roles("OWNER", "MANAGER")
  @Permissions("business.manage")
  updateFeatureFlag(@CurrentUser() user: any, @Body() dto: UpdateFeatureFlagDto) {
    return this.service.updateFeatureFlag(user.businessId, user.id, dto.key, dto.isEnabled);
  }

  @Patch("module-toggle")
  @Roles("OWNER", "MANAGER")
  @Permissions("business.manage")
  updateModuleToggle(@CurrentUser() user: any, @Body() dto: UpdateModuleToggleDto) {
    return this.service.updateModuleToggle(user.businessId, user.id, dto.module, dto.isEnabled);
  }

  @Get("tax")
  @Permissions("business.read")
  getTaxConfiguration(@CurrentUser() user: any) {
    return this.service.getTaxConfiguration(user.businessId);
  }

  @Get("invoice")
  @Permissions("business.read")
  getInvoiceConfiguration(@CurrentUser() user: any) {
    return this.service.getInvoiceConfiguration(user.businessId);
  }

  @Get("report")
  @Permissions("business.read")
  getReportConfiguration(@CurrentUser() user: any) {
    return this.service.getReportConfiguration(user.businessId);
  }

  @Get("printer")
  @Permissions("business.read")
  getPrinterConfiguration(@CurrentUser() user: any) {
    return this.service.getPrinterConfiguration(user.businessId);
  }

  @Get("assets")
  @Permissions("business.read")
  listAssets(@CurrentUser() user: any, @Query("type") type?: string) {
    return this.service.listAssets(user.businessId, type);
  }

  @Post("upload/:type")
  @Roles("OWNER", "MANAGER")
  @Permissions("business.manage")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  uploadAsset(
    @CurrentUser() user: any,
    @Param("type") type: BusinessConfigAssetType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadAsset(user.businessId, user.id, file, type);
  }
}
