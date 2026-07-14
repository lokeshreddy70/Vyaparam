import { IsEmail, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  otp: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
