import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { BillingDocumentStatus, PaymentMethod } from "@prisma/client";

export enum ExportFormat {
  PDF = "PDF",
  EXCEL = "EXCEL",
  CSV = "CSV",
  PRINT = "PRINT",
}

export enum ChartType {
  LINE = "LINE",
  BAR = "BAR",
  PIE = "PIE",
  AREA = "AREA",
}

export class ReportFiltersDto {
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(BillingDocumentStatus)
  invoiceStatus?: BillingDocumentStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class ExportReportDto extends ReportFiltersDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;
}

export class ChartQueryDto extends ReportFiltersDto {
  @IsOptional()
  @IsEnum(ChartType)
  chartType?: ChartType;
}
