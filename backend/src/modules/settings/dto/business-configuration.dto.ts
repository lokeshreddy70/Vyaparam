import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

class WorkingHoursDayDto {
  @IsString()
  day: string;

  @IsString()
  open: string;

  @IsString()
  close: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  breaks?: string[];
}

class PrinterConfigurationDto {
  @IsOptional()
  @IsObject()
  thermal58mm?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  thermal80mm?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bluetooth?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  usb?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  lan?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  wifi?: Record<string, unknown>;
}

export class UpdateBusinessConfigurationDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  gst?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  fssai?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  invoiceSeries?: string;

  @IsOptional()
  @IsString()
  financialYear?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxCgst?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxSgst?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxIgst?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxCess?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  numberFormat?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrinterConfigurationDto)
  printerConfiguration?: PrinterConfigurationDto;

  @IsOptional()
  @IsObject()
  receiptTemplate?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  invoiceTemplate?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  barcodeSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  qrSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  branchManagement?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  branchSettings?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDayDto)
  @IsArray()
  workingHours?: WorkingHoursDayDto[];

  @IsOptional()
  @IsObject()
  businessStatus?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  subscriptionInformation?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  storageSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  backupSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  emailSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  smsSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  pushNotificationSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  securitySettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  passwordPolicy?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  @IsOptional()
  @IsObject()
  loginPolicy?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  featureFlags?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  moduleToggles?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  apiKeys?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  thirdPartyIntegrations?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  fileStorageConfiguration?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  businessPreferences?: Record<string, unknown>;
}

export class BusinessConfigurationQueryDto {
  @IsOptional()
  @IsString()
  section?: string;
}

export class UpdateFeatureFlagDto {
  @IsString()
  key: string;

  @Type(() => Boolean)
  @IsBoolean()
  isEnabled: boolean;
}

export class UpdateModuleToggleDto {
  @IsString()
  module: string;

  @Type(() => Boolean)
  @IsBoolean()
  isEnabled: boolean;
}
