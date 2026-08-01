import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from "class-validator";

const BUSINESS_TYPES = [
  "RESTAURANT",
  "CAFE",
  "BAKERY",
  "GROCERY",
  "SUPERMARKET",
  "MEDICAL",
  "PHARMACY",
  "CEMENT",
  "HARDWARE",
  "PAINT",
  "ELECTRICAL",
  "PESTICIDE",
  "AGRICULTURE",
  "WHOLESALE",
  "RETAIL",
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number];

const ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "KITCHEN_STAFF", "WAITER"] as const;
type Role = (typeof ROLES)[number];

export class RegisterBusinessDto {
  @IsString()
  businessName: string;

  @IsIn(BUSINESS_TYPES)
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
  @IsIn(ROLES)
  role?: Role;
}
