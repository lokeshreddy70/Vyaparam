import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
