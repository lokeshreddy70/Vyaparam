import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { BusinessType, Role } from "@prisma/client";

export class RegisterBusinessDto {
  @IsString()
  businessName: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  ownerName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
