import { IsOptional, IsString } from "class-validator";

export class CreateEmployeeDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  employeeNo: string;

  @IsOptional()
  @IsString()
  designation?: string;
}
