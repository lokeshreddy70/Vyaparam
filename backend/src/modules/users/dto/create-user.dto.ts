import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
  password: string;

  @IsString()
  role: Role;

  @IsOptional()
  @IsString()
  phone?: string;
}
