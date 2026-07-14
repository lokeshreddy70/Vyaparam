import { IsOptional, IsString } from "class-validator";

export class CreatePermissionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
