import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AttendanceStatus,
  EmployeeLifecycleStatus,
  HrDocumentType,
  LeaveRequestStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AttendanceCorrectionDto,
  AttendanceShiftDto,
  ClockActionDto,
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateEmployeeProfileDto,
  CustomRoleDto,
  CustomRolePermissionDto,
  EmployeeKpiDto,
  EmployeeRoleAssignmentDto,
  EmployeeSalaryComponentDto,
  HolidayDto,
  HrNotificationDto,
  LeaveBalanceUpsertDto,
  LeaveRequestDto,
  LeaveTypeDto,
  PageQueryDto,
  PayrollItemDto,
  PayrollRunDto,
  PayrollStatusDto,
  ReviewAttendanceCorrectionDto,
  ReviewLeaveRequestDto,
  RoleTemplateDto,
  SalaryComponentDto,
  SessionQueryDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateEmployeeProfileDto,
  WeeklyOffDto,
} from "./dto/hrms.dto";
import { HrmsRepository } from "./hrms.repository";

@Injectable()
export class HrmsService {
  constructor(
    private readonly repo: HrmsRepository,
    private readonly prisma: PrismaService,
  ) {}

  private buildPageResult<T>(count: number, rows: T[], page: number, limit: number) {
    return {
      items: rows,
      meta: {
        count,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  private dateOnly(d?: string) {
    if (!d) return undefined;
    const x = new Date(d);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
  }

  async createDepartment(businessId: string, userId: string, dto: CreateDepartmentDto) {
    return this.repo.createDepartment({
      businessId,
      branchId: dto.branchId,
      name: dto.name,
      code: dto.code,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listDepartments(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.DepartmentWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [count, rows] = await this.repo.listDepartments(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async updateDepartment(id: string, userId: string, dto: UpdateDepartmentDto) {
    return this.repo.updateDepartment(id, { ...dto, updatedBy: userId });
  }

  async createDesignation(businessId: string, userId: string, dto: CreateDesignationDto) {
    return this.repo.createDesignation({
      businessId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      name: dto.name,
      code: dto.code,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listDesignations(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.DesignationWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [count, rows] = await this.repo.listDesignations(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async updateDesignation(id: string, userId: string, dto: UpdateDesignationDto) {
    return this.repo.updateDesignation(id, { ...dto, updatedBy: userId });
  }

  async createEmployeeProfile(businessId: string, userId: string, dto: CreateEmployeeProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      const employeeNo = await this.repo.nextEmployeeNo(businessId);
      const profile = await tx.employee.create({
        data: {
          businessId,
          userId: dto.userId,
          employeeNo,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          designationId: dto.designationId,
          managerEmployeeId: dto.managerEmployeeId,
          employmentType: dto.employmentType,
          salaryBase: dto.salaryBase,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          designation: dto.designation,
          lifecycleStatus: EmployeeLifecycleStatus.ACTIVE,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          user: true,
          branch: true,
          department: true,
          designationRef: true,
          manager: { include: { user: true } },
        },
      });

      if (dto.emergencyContacts?.length) {
        await tx.employeeEmergencyContact.createMany({
          data: dto.emergencyContacts.map((c) => ({
            businessId,
            employeeId: profile.id,
            name: c.name,
            relationship: c.relationship,
            phone: c.phone,
            email: c.email,
            address: c.address,
            isPrimary: c.isPrimary ?? false,
            createdBy: userId,
            updatedBy: userId,
          })),
        });
      }

      return profile;
    });
  }

  async listEmployeeProfiles(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.EmployeeWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.search
        ? {
            OR: [
              { employeeNo: { contains: query.search, mode: "insensitive" } },
              { user: { name: { contains: query.search, mode: "insensitive" } } },
              { user: { email: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [count, rows] = await this.repo.listEmployeeProfiles(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async updateEmployeeProfile(businessId: string, id: string, userId: string, dto: UpdateEmployeeProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.employee.update({
        where: { id },
        data: {
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          designationId: dto.designationId,
          managerEmployeeId: dto.managerEmployeeId,
          employmentType: dto.employmentType,
          salaryBase: dto.salaryBase,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
          resignationDate: dto.resignationDate ? new Date(dto.resignationDate) : undefined,
          terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
          designation: dto.designation,
          updatedBy: userId,
          lifecycleStatus: dto.terminationDate
            ? EmployeeLifecycleStatus.TERMINATED
            : dto.resignationDate
              ? EmployeeLifecycleStatus.RESIGNED
              : undefined,
        },
        include: {
          user: true,
          branch: true,
          department: true,
          designationRef: true,
          manager: { include: { user: true } },
        },
      });

      if (dto.emergencyContacts) {
        await tx.employeeEmergencyContact.updateMany({
          where: { businessId, employeeId: id, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId },
        });
        if (dto.emergencyContacts.length) {
          await tx.employeeEmergencyContact.createMany({
            data: dto.emergencyContacts.map((c) => ({
              businessId,
              employeeId: id,
              name: c.name,
              relationship: c.relationship,
              phone: c.phone,
              email: c.email,
              address: c.address,
              isPrimary: c.isPrimary ?? false,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      return profile;
    });
  }

  async createAttendanceShift(businessId: string, userId: string, dto: AttendanceShiftDto) {
    return this.repo.createAttendanceShift({
      businessId,
      branchId: dto.branchId,
      name: dto.name,
      code: dto.code,
      startTime: dto.startTime,
      endTime: dto.endTime,
      breakMinutes: dto.breakMinutes ?? 0,
      graceMinutes: dto.graceMinutes ?? 0,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listAttendanceShifts(businessId: string, query: PageQueryDto) {
    return this.repo.listAttendanceShifts({
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    });
  }

  async clockIn(businessId: string, userId: string, dto: ClockActionDto) {
    const today = this.dateOnly(new Date().toISOString())!;
    const existing = await this.repo.findTodayAttendance(businessId, dto.employeeId, today);
    if (existing?.clockInAt && !existing.clockOutAt) {
      throw new BadRequestException("Employee already clocked in today");
    }

    if (existing?.clockOutAt) {
      throw new BadRequestException("Attendance already completed for today");
    }

    return this.repo.createAttendance({
      businessId,
      employeeId: dto.employeeId,
      branchId: undefined,
      shiftId: dto.shiftId,
      attendanceDate: today,
      clockInAt: new Date(),
      status: AttendanceStatus.PRESENT,
      geoMeta: dto.geoMeta as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async startBreak(businessId: string, userId: string, dto: ClockActionDto) {
    const today = this.dateOnly(new Date().toISOString())!;
    const attendance = await this.repo.findTodayAttendance(businessId, dto.employeeId, today);
    if (!attendance || !attendance.clockInAt || attendance.clockOutAt) {
      throw new BadRequestException("No active attendance found for break start");
    }

    return this.repo.createAttendanceBreak({
      businessId,
      attendanceRecordId: attendance.id,
      employeeId: dto.employeeId,
      breakStartAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async endBreak(businessId: string, userId: string, dto: ClockActionDto) {
    const today = this.dateOnly(new Date().toISOString())!;
    const attendance = await this.repo.findTodayAttendance(businessId, dto.employeeId, today);
    if (!attendance || attendance.clockOutAt) {
      throw new BadRequestException("No active attendance found for break end");
    }

    const openBreak = await this.prisma.attendanceBreak.findFirst({
      where: {
        businessId,
        attendanceRecordId: attendance.id,
        employeeId: dto.employeeId,
        breakEndAt: null,
        deletedAt: null,
      },
      orderBy: { breakStartAt: "desc" },
    });

    if (!openBreak) {
      throw new BadRequestException("No open break found");
    }

    const breakEndAt = new Date();
    const duration = Math.max(0, Math.round((breakEndAt.getTime() - openBreak.breakStartAt.getTime()) / 60000));

    await this.prisma.attendanceBreak.update({
      where: { id: openBreak.id },
      data: { breakEndAt, durationMinutes: duration, updatedBy: userId },
    });

    const breakTotal = await this.prisma.attendanceBreak.aggregate({
      where: { businessId, attendanceRecordId: attendance.id, deletedAt: null },
      _sum: { durationMinutes: true },
    });

    return this.repo.updateAttendance(attendance.id, {
      breakMinutes: breakTotal._sum.durationMinutes ?? 0,
      updatedBy: userId,
    });
  }

  async clockOut(businessId: string, userId: string, dto: ClockActionDto) {
    const today = this.dateOnly(new Date().toISOString())!;
    const attendance = await this.repo.findTodayAttendance(businessId, dto.employeeId, today);
    if (!attendance || !attendance.clockInAt || attendance.clockOutAt) {
      throw new BadRequestException("No active attendance found for clock out");
    }

    const clockOutAt = new Date();
    const shift = attendance.shiftId
      ? await this.prisma.attendanceShift.findUnique({ where: { id: attendance.shiftId } })
      : null;

    const timeData = this.repo.clockOutRecalculate({
      id: attendance.id,
      clockInAt: attendance.clockInAt,
      clockOutAt,
      breakMinutes: attendance.breakMinutes,
    });
    const lateEarly = this.repo.markLateEarly({ clockInAt: attendance.clockInAt, clockOutAt, shift });
    const status = this.repo.attendanceStatusFromTimes(attendance.clockInAt, clockOutAt);

    return this.repo.updateAttendance(attendance.id, {
      clockOutAt,
      status,
      geoMeta: dto.geoMeta as Prisma.JsonObject,
      workingMinutes: timeData.workingMinutes,
      overtimeMinutes: timeData.overtimeMinutes,
      lateByMinutes: lateEarly.lateByMinutes,
      earlyExitMinutes: lateEarly.earlyExitMinutes,
      updatedBy: userId,
    });
  }

  async listAttendance(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.AttendanceRecordWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            attendanceDate: {
              ...(query.fromDate ? { gte: this.dateOnly(query.fromDate) } : {}),
              ...(query.toDate ? { lte: this.dateOnly(query.toDate) } : {}),
            },
          }
        : {}),
    };
    const [count, rows] = await this.repo.listAttendance(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async requestAttendanceCorrection(businessId: string, userId: string, dto: AttendanceCorrectionDto) {
    const attendance = await this.prisma.attendanceRecord.findUnique({ where: { id: dto.attendanceRecordId } });
    if (!attendance || attendance.businessId !== businessId || attendance.deletedAt) {
      throw new NotFoundException("Attendance record not found");
    }

    return this.repo.createAttendanceCorrection({
      businessId,
      attendanceRecordId: dto.attendanceRecordId,
      employeeId: attendance.employeeId,
      requestedById: attendance.employeeId,
      reason: dto.reason,
      requestPayload: dto.requestPayload as Prisma.JsonObject,
      status: "PENDING",
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async reviewAttendanceCorrection(businessId: string, userId: string, reviewerEmployeeId: string | null, dto: ReviewAttendanceCorrectionDto) {
    const correction = await this.prisma.attendanceCorrection.findUnique({ where: { id: dto.correctionId } });
    if (!correction || correction.businessId !== businessId || correction.deletedAt) {
      throw new NotFoundException("Attendance correction not found");
    }

    return this.repo.reviewAttendanceCorrection(dto.correctionId, dto.status, reviewerEmployeeId, userId);
  }

  async createLeaveType(businessId: string, userId: string, dto: LeaveTypeDto) {
    return this.repo.createLeaveType({
      businessId,
      name: dto.name,
      code: dto.code,
      maxDaysPerYear: dto.maxDaysPerYear,
      isPaid: dto.isPaid ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listLeaveTypes(businessId: string) {
    return this.repo.listLeaveTypes({ businessId, deletedAt: null });
  }

  async upsertLeaveBalance(businessId: string, userId: string, dto: LeaveBalanceUpsertDto) {
    return this.repo.upsertLeaveBalance(
      {
        businessId,
        branchId: dto.branchId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        allocatedDays: dto.allocatedDays,
        usedDays: 0,
        carryForwardDays: dto.carryForwardDays ?? 0,
        createdBy: userId,
        updatedBy: userId,
      },
      userId,
    );
  }

  async createLeaveRequest(businessId: string, userId: string, dto: LeaveRequestDto) {
    if (new Date(dto.fromDate) > new Date(dto.toDate)) {
      throw new BadRequestException("fromDate cannot be later than toDate");
    }

    const year = new Date(dto.fromDate).getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        businessId_employeeId_leaveTypeId_year: {
          businessId,
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year,
        },
      },
    });

    if (!balance) {
      throw new BadRequestException("Leave balance not configured for this employee and leave type");
    }

    const available = balance.allocatedDays + balance.carryForwardDays - balance.usedDays;
    if (available < dto.totalDays) {
      throw new BadRequestException("Insufficient leave balance");
    }

    return this.repo.createLeaveRequest({
      businessId,
      branchId: dto.branchId,
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      fromDate: new Date(dto.fromDate),
      toDate: new Date(dto.toDate),
      totalDays: dto.totalDays,
      reason: dto.reason,
      status: LeaveRequestStatus.PENDING,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async reviewLeaveRequest(businessId: string, userId: string, approverEmployeeId: string | null, requestId: string, dto: ReviewLeaveRequestDto) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request || request.businessId !== businessId || request.deletedAt) {
      throw new NotFoundException("Leave request not found");
    }

    const result = await this.repo.reviewLeaveRequest(
      requestId,
      dto.status,
      approverEmployeeId,
      userId,
      dto.rejectionReason,
    );

    if (dto.status === LeaveRequestStatus.APPROVED) {
      const year = request.fromDate.getFullYear();
      await this.prisma.leaveBalance.update({
        where: {
          businessId_employeeId_leaveTypeId_year: {
            businessId,
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        data: { usedDays: { increment: request.totalDays }, updatedBy: userId },
      });
    }

    return result;
  }

  async listLeaveRequests(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.LeaveRequestWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            fromDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };
    const [count, rows] = await this.repo.listLeaveRequests(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async createHoliday(businessId: string, userId: string, dto: HolidayDto) {
    return this.repo.createHoliday({
      businessId,
      branchId: dto.branchId,
      holidayDate: this.dateOnly(dto.holidayDate)!,
      name: dto.name,
      description: dto.description,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listHolidays(businessId: string, query: PageQueryDto) {
    return this.repo.listHolidays({
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            holidayDate: {
              ...(query.fromDate ? { gte: this.dateOnly(query.fromDate) } : {}),
              ...(query.toDate ? { lte: this.dateOnly(query.toDate) } : {}),
            },
          }
        : {}),
    });
  }

  async upsertWeeklyOff(businessId: string, userId: string, dto: WeeklyOffDto) {
    return this.repo.upsertWeeklyOff(
      {
        businessId,
        branchId: dto.branchId,
        weekday: dto.weekday,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
      userId,
    );
  }

  async createSalaryComponent(businessId: string, userId: string, dto: SalaryComponentDto) {
    return this.repo.createSalaryComponent({
      businessId,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      amountType: dto.amountType,
      defaultValue: dto.defaultValue,
      isTaxable: dto.isTaxable ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listSalaryComponents(businessId: string) {
    return this.repo.listSalaryComponents({ businessId, deletedAt: null });
  }

  async createEmployeeSalaryComponent(businessId: string, userId: string, dto: EmployeeSalaryComponentDto) {
    return this.repo.createEmployeeSalaryComponent({
      businessId,
      branchId: dto.branchId,
      employeeId: dto.employeeId,
      salaryComponentId: dto.salaryComponentId,
      value: dto.value,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listEmployeeSalaryComponents(businessId: string, query: PageQueryDto) {
    return this.repo.listEmployeeSalaryComponents({
      businessId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    });
  }

  async createPayrollRun(businessId: string, userId: string, dto: PayrollRunDto) {
    return this.repo.createPayrollRun({
      businessId,
      branchId: dto.branchId,
      periodYear: dto.periodYear,
      periodMonth: dto.periodMonth,
      status: PayrollRunStatus.DRAFT,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listPayrollRuns(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.PayrollRunWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { periodYear: { equals: Number(query.search) || undefined } },
              { periodMonth: { equals: Number(query.search) || undefined } },
            ],
          }
        : {}),
    };
    const [count, rows] = await this.repo.listPayrollRuns(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async updatePayrollStatus(businessId: string, userId: string, payrollRunId: string, dto: PayrollStatusDto) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
    if (!run || run.businessId !== businessId || run.deletedAt) {
      throw new NotFoundException("Payroll run not found");
    }

    return this.repo.updatePayrollRunStatus(payrollRunId, dto.status, userId);
  }

  async createPayrollItem(businessId: string, userId: string, payrollRunId: string, dto: PayrollItemDto) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
    if (!run || run.businessId !== businessId || run.deletedAt) {
      throw new NotFoundException("Payroll run not found");
    }

    if (run.status === PayrollRunStatus.PAID) {
      throw new BadRequestException("Cannot add items to completed payroll run");
    }

    return this.repo.createPayrollItem({
      businessId,
      payrollRunId,
      branchId: dto.branchId,
      employeeId: dto.employeeId,
      salaryComponentId: dto.salaryComponentId,
      componentType: dto.componentType,
      amount: dto.amount,
      remarks: dto.remarks,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listPayrollItems(businessId: string, payrollRunId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.PayrollItemWhereInput = {
      businessId,
      payrollRunId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };
    const [count, rows] = await this.repo.listPayrollItems(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async createRoleTemplate(businessId: string, userId: string, dto: RoleTemplateDto) {
    return this.repo.createRoleTemplate({
      businessId,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      permissions: (dto.permissions ?? {}) as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listRoleTemplates(businessId: string) {
    return this.repo.listRoleTemplates({ businessId, deletedAt: null });
  }

  async createCustomRole(businessId: string, userId: string, dto: CustomRoleDto) {
    return this.repo.createCustomRole({
      businessId,
      roleTemplateId: dto.roleTemplateId,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listCustomRoles(businessId: string) {
    return this.repo.listCustomRoles({ businessId, deletedAt: null });
  }

  async createCustomRolePermission(businessId: string, userId: string, dto: CustomRolePermissionDto) {
    return this.repo.createCustomRolePermission({
      businessId,
      customRoleId: dto.customRoleId,
      permission: dto.permission,
      scopeType: dto.scopeType,
      scopeValue: dto.scopeValue,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listCustomRolePermissions(businessId: string, customRoleId?: string) {
    return this.repo.listCustomRolePermissions({
      businessId,
      deletedAt: null,
      ...(customRoleId ? { customRoleId } : {}),
    });
  }

  async assignEmployeeRole(businessId: string, userId: string, dto: EmployeeRoleAssignmentDto) {
    return this.repo.createEmployeeRoleAssignment({
      businessId,
      employeeId: dto.employeeId,
      customRoleId: dto.customRoleId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      featurePermissions: (dto.featurePermissions ?? {}) as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listEmployeeRoleAssignments(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.EmployeeRoleAssignmentWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    };
    const [count, rows] = await this.repo.listEmployeeRoleAssignments(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async createEmployeeKpi(businessId: string, userId: string, dto: EmployeeKpiDto) {
    const totalScore =
      dto.totalScore ??
      ((dto.salesAmount ?? 0) * 0.5 + (dto.attendanceScore ?? 0) * 0.25 + (dto.leaveScore ?? 0) * 0.25);

    return this.repo.createEmployeeKpi({
      businessId,
      branchId: dto.branchId,
      employeeId: dto.employeeId,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      salesAmount: dto.salesAmount,
      attendanceScore: dto.attendanceScore,
      leaveScore: dto.leaveScore,
      totalScore,
      metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listEmployeeKpis(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.EmployeeKpiWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            periodStart: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };
    const [count, rows] = await this.repo.listEmployeeKpis(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async createHrNotification(businessId: string, userId: string, senderEmployeeId: string | null, dto: HrNotificationDto) {
    return this.repo.createHrNotification({
      businessId,
      employeeId: dto.employeeId,
      senderEmployeeId,
      branchId: dto.branchId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      payload: (dto.payload ?? {}) as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listHrNotifications(businessId: string, query: PageQueryDto, currentEmployeeId?: string) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.HrNotificationWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(!query.employeeId && currentEmployeeId ? { OR: [{ employeeId: currentEmployeeId }, { employeeId: null }] } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };
    const [count, rows] = await this.repo.listHrNotifications(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async markNotificationRead(businessId: string, userId: string, id: string) {
    const notification = await this.prisma.hrNotification.findUnique({ where: { id } });
    if (!notification || notification.businessId !== businessId || notification.deletedAt) {
      throw new NotFoundException("Notification not found");
    }

    return this.repo.markHrNotificationRead(id, userId);
  }

  async uploadEmployeePhoto(businessId: string, userId: string, employeeId: string, file: Express.Multer.File) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.businessId !== businessId || employee.deletedAt) {
      throw new NotFoundException("Employee not found");
    }

    return this.repo.createEmployeeDocument({
      businessId,
      employeeId,
      type: HrDocumentType.PHOTO,
      title: "Profile Photo",
      fileName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async uploadEmployeeDocument(
    businessId: string,
    userId: string,
    employeeId: string,
    type: HrDocumentType,
    title: string,
    file: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.businessId !== businessId || employee.deletedAt) {
      throw new NotFoundException("Employee not found");
    }

    return this.repo.createEmployeeDocument({
      businessId,
      employeeId,
      type,
      title,
      fileName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listEmployeeDocuments(businessId: string, query: PageQueryDto & { type?: HrDocumentType }) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.EmployeeDocumentWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [count, rows] = await this.repo.listEmployeeDocuments(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async listSecuritySessions(businessId: string, query: SessionQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.SessionWhereInput = {
      businessId,
      ...(query.employeeId
        ? { user: { employee: { id: query.employeeId, businessId } } }
        : {}),
      ...(query.activeOnly ? { revokedAt: null, expiresAt: { gt: new Date() } } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [count, rows] = await this.repo.listSessions(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  async revokeSession(businessId: string, id: string) {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session || session.businessId !== businessId) {
      throw new NotFoundException("Session not found");
    }
    return this.repo.revokeSession(id);
  }

  async listAuditLogs(businessId: string, query: PageQueryDto) {
    const { skip, page, limit } = this.repo.paginate(query);
    const where: Prisma.AuditLogWhereInput = {
      businessId,
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: "insensitive" } },
              { entityType: { contains: query.search, mode: "insensitive" } },
              { entityId: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [count, rows] = await this.repo.listAuditLogs(where, skip, limit);
    return this.buildPageResult(count, rows, page, limit);
  }

  attendanceStatusSnapshot(businessId: string, query: PageQueryDto) {
    return this.repo.attendanceReport(businessId, query);
  }

  leaveStatusSnapshot(businessId: string, query: PageQueryDto) {
    return this.repo.leaveReport(businessId, query);
  }

  payrollStatusSnapshot(businessId: string, query: PageQueryDto) {
    return this.repo.payrollReport(businessId, query);
  }

  salesPerformanceSnapshot(businessId: string, query: PageQueryDto) {
    return this.repo.salesPerformanceReport(businessId, query);
  }
}
