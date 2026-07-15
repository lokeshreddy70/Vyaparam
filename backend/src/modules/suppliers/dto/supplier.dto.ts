import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { LedgerEntryType } from "@prisma/client";

export class CreateSupplierGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateSupplierTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SupplierContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class SupplierAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @IsNotEmpty()
  address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  supplierGroupId?: string;

  @IsOptional()
  @IsString()
  supplierTypeId?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  panNumber?: string;

  @IsOptional()
  @IsString()
  tinNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierContactDto)
  contacts?: SupplierContactDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierAddressDto)
  addresses?: SupplierAddressDto[];
}

export class UpdateSupplierDto extends CreateSupplierDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SupplierLedgerEntryDto {
  @IsEnum(LedgerEntryType)
  entryType: LedgerEntryType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SupplierListQueryDto {
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

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  supplierGroupId?: string;

  @IsOptional()
  @IsString()
  supplierTypeId?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class BulkImportSuppliersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierDto)
  items: CreateSupplierDto[];
}
