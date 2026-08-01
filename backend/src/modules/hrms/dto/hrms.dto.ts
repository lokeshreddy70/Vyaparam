import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  AttendanceStatus,
  EmploymentType,
  HrDocumentType,
  HrNotificationType,
  LeaveRequestStatus,
  PayrollRunStatus,
} from "@prisma/client";

export class PageQueryDto {
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
  branchId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  designationId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class UpdateDesignationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateEmployeeProfileDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  designationId?: string;

  @IsOptional()
  @IsString()
  managerEmployeeId?: string;

  @IsOptional()
  @IsString()
  employmentType?: EmploymentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryBase?: number;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  @IsArray()
  emergencyContacts?: EmergencyContactDto[];
}

export class UpdateEmployeeProfileDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  designationId?: string;

  @IsOptional()
  @IsString()
  managerEmployeeId?: string;

  @IsOptional()
  @IsString()
  employmentType?: EmploymentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryBase?: number;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsDateString()
  resignationDate?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactDto)
  @IsArray()
  emergencyContacts?: EmergencyContactDto[];
}

export class AttendanceShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  graceMinutes?: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class ClockActionDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsString()
  shiftId?: string;

  @IsOptional()
  @IsObject()
  geoMeta?: Record<string, unknown>;
}

export class AttendanceCorrectionDto {
  @IsString()
  @IsNotEmpty()
  attendanceRecordId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsObject()
  requestPayload?: Record<string, unknown>;
}

export class ReviewAttendanceCorrectionDto {
  @IsString()
  @IsNotEmpty()
  correctionId: string;

  @IsString()
  @IsNotEmpty()
  status: string;
}

export class LeaveTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @Type(() => Number)
  @IsNumber()
  maxDaysPerYear: number;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class LeaveBalanceUpsertDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  leaveTypeId: string;

  @Type(() => Number)
  @IsInt()
  year: number;

  @Type(() => Number)
  @IsNumber()
  allocatedDays: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carryForwardDays?: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class LeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  leaveTypeId: string;

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;

  @Type(() => Number)
  @IsNumber()
  totalDays: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class ReviewLeaveRequestDto {
  @IsString()
  status: LeaveRequestStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class HolidayDto {
  @IsDateString()
  holidayDate: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class WeeklyOffDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class SalaryComponentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  amountType: string;

  @Type(() => Number)
  @IsNumber()
  defaultValue: number;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;
}

export class EmployeeSalaryComponentDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  salaryComponentId: string;

  @Type(() => Number)
  @IsNumber()
  value: number;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class PayrollRunDto {
  @Type(() => Number)
  @IsInt()
  periodYear: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class PayrollItemDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsString()
  salaryComponentId?: string;

  @IsString()
  @IsNotEmpty()
  componentType: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class RoleTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, unknown>;
}

export class CustomRoleDto {
  @IsOptional()
  @IsString()
  roleTemplateId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CustomRolePermissionDto {
  @IsString()
  @IsNotEmpty()
  customRoleId: string;

  @IsString()
  @IsNotEmpty()
  permission: string;

  @IsOptional()
  @IsString()
  scopeType?: string;

  @IsOptional()
  @IsString()
  scopeValue?: string;
}

export class EmployeeRoleAssignmentDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  customRoleId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsObject()
  featurePermissions?: Record<string, unknown>;
}

export class EmployeeKpiDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salesAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  attendanceScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  leaveScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalScore?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class HrNotificationDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  type: HrNotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class EmployeeDocumentQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  type?: HrDocumentType;
}

export class SessionQueryDto extends PageQueryDto {
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}

export class PayrollStatusDto {
  @IsString()
  status: PayrollRunStatus;
}

export class AttendanceStatusDto {
  @IsString()
  status: AttendanceStatus;
}
