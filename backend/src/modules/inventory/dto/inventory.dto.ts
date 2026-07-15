import { Type } from "class-transformer";
import { MovementType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpsertInventoryDto {
  @IsString()
  @IsNotEmpty()
  warehouseId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reorderLevel?: number;
}

export class StockMovementDto {
  @IsString()
  @IsNotEmpty()
  inventoryId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class StockAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  inventoryId: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryTransferDto {
  @IsString()
  @IsNotEmpty()
  fromWarehouseId: string;

  @IsString()
  @IsNotEmpty()
  toWarehouseId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InventoryReservationDto {
  @IsString()
  @IsNotEmpty()
  inventoryId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  reservationCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
