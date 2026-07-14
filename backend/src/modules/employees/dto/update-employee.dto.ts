import { IsOptional, IsString } from "class-validator";

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  designation?: string;
}
