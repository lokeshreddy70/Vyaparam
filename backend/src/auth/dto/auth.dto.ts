import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role, BusinessType } from '@prisma/client';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class RegisterBusinessDto {
  @IsString()
  businessName: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @IsString()
  ownerName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  otp: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsOptional()
  @IsString()
  reserved?: string;
}
