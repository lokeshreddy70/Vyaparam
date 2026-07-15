import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateSubCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
