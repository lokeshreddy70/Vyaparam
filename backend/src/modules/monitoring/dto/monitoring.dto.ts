import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { BackgroundJobPriority, BackgroundJobStatus, BackgroundJobType } from "@prisma/client";

export class MonitorPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class JobQueryDto extends MonitorPageQueryDto {
  @IsOptional()
  @IsEnum(BackgroundJobType)
  type?: BackgroundJobType;

  @IsOptional()
  @IsEnum(BackgroundJobStatus)
  status?: BackgroundJobStatus;

  @IsOptional()
  @IsEnum(BackgroundJobPriority)
  priority?: BackgroundJobPriority;
}

export class EnqueueJobDto {
  @IsEnum(BackgroundJobType)
  type: BackgroundJobType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(BackgroundJobPriority)
  priority?: BackgroundJobPriority;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  maxRetries?: number;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class ProcessJobsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}
