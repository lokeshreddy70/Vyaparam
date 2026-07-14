import { IsString, IsOptional } from "class-validator";

export class CreateBranchDto {
  @IsOptional()
  @IsString()
  businessId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
