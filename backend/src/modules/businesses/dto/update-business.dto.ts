import { IsEnum, IsOptional, IsString } from "class-validator";
import { BusinessType } from "@prisma/client";

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;
}
