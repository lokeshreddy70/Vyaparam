import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  BillingDocumentStatus,
  BillingDocumentType,
  LedgerEntryType,
  PaymentMethod,
} from "@prisma/client";

export class BillingItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxPercent?: number;
}

export class CreateBillingDocumentDto {
  @IsEnum(BillingDocumentType)
  type: BillingDocumentType;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsString()
  terminalId?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  offerCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roundOff?: number;

  @IsOptional()
  @IsBoolean()
  isInclusiveTax?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingItemDto)
  items: BillingItemDto[];
}

export class BillingDocumentQueryDto {
  @IsOptional()
  @IsEnum(BillingDocumentType)
  type?: BillingDocumentType;

  @IsOptional()
  @IsEnum(BillingDocumentStatus)
  status?: BillingDocumentStatus;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateDocumentStatusDto {
  @IsEnum(BillingDocumentStatus)
  status: BillingDocumentStatus;
}

export class VoidDocumentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class PaymentLineDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class RecordDocumentPaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  payments: PaymentLineDto[];
}

export class SplitDocumentItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class SplitDocumentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitDocumentItemDto)
  items: SplitDocumentItemDto[];
}

export class MergeDocumentsDto {
  @IsArray()
  @IsString({ each: true })
  documentIds: string[];
}

export class CreateCashRegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class OpenShiftDto {
  @IsString()
  @IsNotEmpty()
  registerId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @Type(() => Number)
  @IsNumber()
  openingBalance: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CloseShiftDto {
  @Type(() => Number)
  @IsNumber()
  closingBalance: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreatePosTerminalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;
}

export class LedgerAdjustDto {
  @IsEnum(LedgerEntryType)
  entryType: LedgerEntryType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
