import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BusinessConfigAssetType, Prisma } from "@prisma/client";
import { promises as fs } from "node:fs";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { SettingsRepository } from "./settings.repository";
import { UpdateBusinessConfigurationDto } from "./dto/business-configuration.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  private toJsonValue(input: unknown): Prisma.InputJsonValue {
    return input as Prisma.InputJsonValue;
  }

  async getOrCreate(businessId: string, userId?: string) {
    const existing = await this.repository.findByBusinessId(businessId);
    if (existing) return existing;

    const actorId = userId ?? "system";
    await this.repository.upsertByBusinessId(businessId, actorId, {});
    const created = await this.repository.findByBusinessId(businessId);
    if (!created) throw new NotFoundException("Business configuration not found");
    return created;
  }

  async getConfiguration(businessId: string, section?: string) {
    const config = await this.getOrCreate(businessId);
    if (!section) return config;

    const key = section as keyof typeof config;
    if (!(key in config)) {
      throw new BadRequestException("Unknown configuration section");
    }

    return { section, value: config[key] };
  }

  async updateConfiguration(businessId: string, userId: string, dto: UpdateBusinessConfigurationDto) {
    const data: Prisma.BusinessConfigurationUncheckedUpdateInput = {
      ...(dto.businessName !== undefined ? { businessName: dto.businessName } : {}),
      ...(dto.gst !== undefined ? { gst: dto.gst } : {}),
      ...(dto.pan !== undefined ? { pan: dto.pan } : {}),
      ...(dto.fssai !== undefined ? { fssai: dto.fssai } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.website !== undefined ? { website: dto.website } : {}),
      ...(dto.invoicePrefix !== undefined ? { invoicePrefix: dto.invoicePrefix } : {}),
      ...(dto.invoiceSeries !== undefined ? { invoiceSeries: dto.invoiceSeries } : {}),
      ...(dto.financialYear !== undefined ? { financialYear: dto.financialYear } : {}),
      ...(dto.taxCgst !== undefined ? { taxCgst: dto.taxCgst } : {}),
      ...(dto.taxSgst !== undefined ? { taxSgst: dto.taxSgst } : {}),
      ...(dto.taxIgst !== undefined ? { taxIgst: dto.taxIgst } : {}),
      ...(dto.taxCess !== undefined ? { taxCess: dto.taxCess } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.language !== undefined ? { language: dto.language } : {}),
      ...(dto.timeZone !== undefined ? { timeZone: dto.timeZone } : {}),
      ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
      ...(dto.dateFormat !== undefined ? { dateFormat: dto.dateFormat } : {}),
      ...(dto.numberFormat !== undefined ? { numberFormat: dto.numberFormat } : {}),
      ...(dto.printerConfiguration !== undefined
        ? { printerConfiguration: this.toJsonValue(dto.printerConfiguration) }
        : {}),
      ...(dto.receiptTemplate !== undefined ? { receiptTemplate: this.toJsonValue(dto.receiptTemplate) } : {}),
      ...(dto.invoiceTemplate !== undefined ? { invoiceTemplate: this.toJsonValue(dto.invoiceTemplate) } : {}),
      ...(dto.barcodeSettings !== undefined ? { barcodeSettings: this.toJsonValue(dto.barcodeSettings) } : {}),
      ...(dto.qrSettings !== undefined ? { qrSettings: this.toJsonValue(dto.qrSettings) } : {}),
      ...(dto.branchManagement !== undefined ? { branchManagement: this.toJsonValue(dto.branchManagement) } : {}),
      ...(dto.branchSettings !== undefined ? { branchSettings: this.toJsonValue(dto.branchSettings) } : {}),
      ...(dto.workingHours !== undefined ? { workingHours: this.toJsonValue(dto.workingHours) } : {}),
      ...(dto.businessStatus !== undefined ? { businessStatus: this.toJsonValue(dto.businessStatus) } : {}),
      ...(dto.subscriptionInformation !== undefined
        ? { subscriptionInformation: this.toJsonValue(dto.subscriptionInformation) }
        : {}),
      ...(dto.storageSettings !== undefined ? { storageSettings: this.toJsonValue(dto.storageSettings) } : {}),
      ...(dto.backupSettings !== undefined ? { backupSettings: this.toJsonValue(dto.backupSettings) } : {}),
      ...(dto.notificationSettings !== undefined
        ? { notificationSettings: this.toJsonValue(dto.notificationSettings) }
        : {}),
      ...(dto.emailSettings !== undefined ? { emailSettings: this.toJsonValue(dto.emailSettings) } : {}),
      ...(dto.smsSettings !== undefined ? { smsSettings: this.toJsonValue(dto.smsSettings) } : {}),
      ...(dto.pushNotificationSettings !== undefined
        ? { pushNotificationSettings: this.toJsonValue(dto.pushNotificationSettings) }
        : {}),
      ...(dto.securitySettings !== undefined ? { securitySettings: this.toJsonValue(dto.securitySettings) } : {}),
      ...(dto.passwordPolicy !== undefined ? { passwordPolicy: this.toJsonValue(dto.passwordPolicy) } : {}),
      ...(dto.sessionTimeoutMinutes !== undefined ? { sessionTimeoutMinutes: dto.sessionTimeoutMinutes } : {}),
      ...(dto.loginPolicy !== undefined ? { loginPolicy: this.toJsonValue(dto.loginPolicy) } : {}),
      ...(dto.featureFlags !== undefined ? { featureFlags: this.toJsonValue(dto.featureFlags) } : {}),
      ...(dto.moduleToggles !== undefined ? { moduleToggles: this.toJsonValue(dto.moduleToggles) } : {}),
      ...(dto.apiKeys !== undefined ? { apiKeys: this.toJsonValue(dto.apiKeys) } : {}),
      ...(dto.thirdPartyIntegrations !== undefined
        ? { thirdPartyIntegrations: this.toJsonValue(dto.thirdPartyIntegrations) }
        : {}),
      ...(dto.fileStorageConfiguration !== undefined
        ? { fileStorageConfiguration: this.toJsonValue(dto.fileStorageConfiguration) }
        : {}),
      ...(dto.businessPreferences !== undefined
        ? { businessPreferences: this.toJsonValue(dto.businessPreferences) }
        : {}),
    };

    const updated = await this.repository.upsertByBusinessId(businessId, userId, data);

    const businessPatch: Prisma.BusinessUncheckedUpdateInput = {
      ...(dto.businessName !== undefined ? { name: dto.businessName } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.gst !== undefined ? { gstNumber: dto.gst } : {}),
      updatedBy: userId,
    };

    if (Object.keys(businessPatch).length > 1) {
      await this.repository.getClient().business.update({
        where: { id: businessId },
        data: businessPatch,
      });
    }

    await this.repository.getClient().auditLog.create({
      data: {
        businessId,
        userId,
        action: "BUSINESS_CONFIGURATION_UPDATED",
        entityType: "BusinessConfiguration",
        entityId: updated.id,
        metadata: dto as unknown as Prisma.InputJsonValue,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return updated;
  }

  async uploadAsset(
    businessId: string,
    userId: string,
    file: Express.Multer.File,
    type: BusinessConfigAssetType,
  ) {
    if (!file) throw new BadRequestException("file is required");

    const configuration = await this.getOrCreate(businessId, userId);

    const extension = extname(file.originalname || "").toLowerCase();
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const relativePath = join("uploads", "business-config", businessId, fileName);
    const absolutePath = join(process.cwd(), relativePath);

    await fs.mkdir(join(process.cwd(), "uploads", "business-config", businessId), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    const asset = await this.repository.getClient().$transaction(async (tx) => {
      const created = await this.repository.createAsset(tx, {
        businessId,
        configurationId: configuration.id,
        type,
        fileName: file.originalname,
        mimeType: file.mimetype,
        extension,
        sizeBytes: file.size,
        storagePath: relativePath.replace(/\\/g, "/"),
        createdBy: userId,
        updatedBy: userId,
      });

      if (type === BusinessConfigAssetType.LOGO) {
        await this.repository.setLogoAsset(tx, businessId, created.id, userId);
      }

      await tx.auditLog.create({
        data: {
          businessId,
          userId,
          action: "BUSINESS_CONFIGURATION_ASSET_UPLOADED",
          entityType: "BusinessConfigAsset",
          entityId: created.id,
          metadata: {
            type,
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          },
          createdBy: userId,
          updatedBy: userId,
        },
      });

      return created;
    });

    return asset;
  }

  listAssets(businessId: string, type?: string) {
    return this.repository.listAssets(businessId, type);
  }

  async updateFeatureFlag(businessId: string, userId: string, key: string, isEnabled: boolean) {
    const config = await this.getOrCreate(businessId, userId);
    const current = (config.featureFlags as Record<string, unknown> | null) ?? {};
    const featureFlags = { ...current, [key]: isEnabled };
    return this.repository.upsertByBusinessId(businessId, userId, {
      featureFlags: featureFlags as unknown as Prisma.InputJsonValue,
    });
  }

  async updateModuleToggle(businessId: string, userId: string, module: string, isEnabled: boolean) {
    const config = await this.getOrCreate(businessId, userId);
    const current = (config.moduleToggles as Record<string, unknown> | null) ?? {};
    const moduleToggles = { ...current, [module]: isEnabled };
    return this.repository.upsertByBusinessId(businessId, userId, {
      moduleToggles: moduleToggles as unknown as Prisma.InputJsonValue,
    });
  }

  async getTaxConfiguration(businessId: string) {
    const config = await this.getOrCreate(businessId);
    const taxPercent = config.taxCgst + config.taxSgst + config.taxIgst + config.taxCess;
    return {
      cgst: config.taxCgst,
      sgst: config.taxSgst,
      igst: config.taxIgst,
      cess: config.taxCess,
      defaultTaxPercent: taxPercent,
    };
  }

  async getInvoiceConfiguration(businessId: string) {
    const config = await this.getOrCreate(businessId);
    return {
      company: {
        businessName: config.businessName,
        gst: config.gst,
        pan: config.pan,
        fssai: config.fssai,
        address: config.address,
        phone: config.phone,
        email: config.email,
        website: config.website,
      },
      invoice: {
        prefix: config.invoicePrefix,
        series: config.invoiceSeries,
        financialYear: config.financialYear,
      },
      logo: config.logoAsset,
      template: config.invoiceTemplate,
    };
  }

  async getReportConfiguration(businessId: string) {
    const config = await this.getOrCreate(businessId);
    return {
      logo: config.logoAsset,
      theme: config.theme,
      dateFormat: config.dateFormat,
      numberFormat: config.numberFormat,
    };
  }

  async getPrinterConfiguration(businessId: string) {
    const config = await this.getOrCreate(businessId);
    return config.printerConfiguration;
  }
}
