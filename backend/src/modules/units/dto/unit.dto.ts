import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;
}

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  symbol?: string;
}
