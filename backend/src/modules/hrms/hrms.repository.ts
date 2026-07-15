import { Injectable } from "@nestjs/common";
import {
  AttendanceStatus,
  LeaveRequestStatus,
  PayrollRunStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PageQueryDto } from "./dto/hrms.dto";

@Injectable()
export class HrmsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getClient(): PrismaClient {
    return this.prisma;
  }

  paginate(query: PageQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  async nextEmployeeNo(businessId: string) {
    const count = await this.prisma.employee.count({ where: { businessId } });
    const year = new Date().getFullYear();
    return `EMP-${year}-${String(count + 1).padStart(5, "0")}`;
  }

  createDepartment(data: Prisma.DepartmentUncheckedCreateInput) {
    return this.prisma.department.create({ data });
  }

  listDepartments(where: Prisma.DepartmentWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  updateDepartment(id: string, data: Prisma.DepartmentUncheckedUpdateInput) {
    return this.prisma.department.update({ where: { id }, data });
  }

  createDesignation(data: Prisma.DesignationUncheckedCreateInput) {
    return this.prisma.designation.create({ data });
  }

  listDesignations(where: Prisma.DesignationWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.designation.count({ where }),
      this.prisma.designation.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  updateDesignation(id: string, data: Prisma.DesignationUncheckedUpdateInput) {
    return this.prisma.designation.update({ where: { id }, data });
  }

  createEmployeeProfile(data: Prisma.EmployeeUncheckedCreateInput) {
    return this.prisma.employee.create({
      data,
      include: {
        user: true,
        branch: true,
        department: true,
        designationRef: true,
        manager: { include: { user: true } },
      },
    });
  }

  updateEmployeeProfile(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return this.prisma.employee.update({
      where: { id },
      data,
      include: {
        user: true,
        branch: true,
        department: true,
        designationRef: true,
        manager: { include: { user: true } },
      },
    });
  }

  listEmployeeProfiles(where: Prisma.EmployeeWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        include: {
          user: true,
          branch: true,
          department: true,
          designationRef: true,
          manager: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createAttendanceShift(data: Prisma.AttendanceShiftUncheckedCreateInput) {
    return this.prisma.attendanceShift.create({ data });
  }

  listAttendanceShifts(where: Prisma.AttendanceShiftWhereInput) {
    return this.prisma.attendanceShift.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  findTodayAttendance(businessId: string, employeeId: string, date: Date) {
    return this.prisma.attendanceRecord.findUnique({
      where: { businessId_employeeId_attendanceDate: { businessId, employeeId, attendanceDate: date } },
    });
  }

  createAttendance(data: Prisma.AttendanceRecordUncheckedCreateInput) {
    return this.prisma.attendanceRecord.create({ data });
  }

  updateAttendance(id: string, data: Prisma.AttendanceRecordUncheckedUpdateInput) {
    return this.prisma.attendanceRecord.update({ where: { id }, data });
  }

  createAttendanceBreak(data: Prisma.AttendanceBreakUncheckedCreateInput) {
    return this.prisma.attendanceBreak.create({ data });
  }

  listAttendance(where: Prisma.AttendanceRecordWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.attendanceRecord.count({ where }),
      this.prisma.attendanceRecord.findMany({
        where,
        include: { employee: { include: { user: true } }, shift: true, breaks: true, branch: true },
        orderBy: { attendanceDate: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createAttendanceCorrection(data: Prisma.AttendanceCorrectionUncheckedCreateInput) {
    return this.prisma.attendanceCorrection.create({
      data,
      include: { attendanceRecord: true, employee: { include: { user: true } } },
    });
  }

  reviewAttendanceCorrection(id: string, status: string, approvedById: string | null, userId: string) {
    return this.prisma.attendanceCorrection.update({
      where: { id },
      data: { status, approvedById, reviewedAt: new Date(), updatedBy: userId },
    });
  }

  createLeaveType(data: Prisma.LeaveTypeUncheckedCreateInput) {
    return this.prisma.leaveType.create({ data });
  }

  listLeaveTypes(where: Prisma.LeaveTypeWhereInput) {
    return this.prisma.leaveType.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  upsertLeaveBalance(data: Prisma.LeaveBalanceUncheckedCreateInput, userId: string) {
    return this.prisma.leaveBalance.upsert({
      where: {
        businessId_employeeId_leaveTypeId_year: {
          businessId: data.businessId,
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
      create: data,
      update: {
        allocatedDays: data.allocatedDays,
        carryForwardDays: data.carryForwardDays,
        branchId: data.branchId,
        updatedBy: userId,
      },
    });
  }

  createLeaveRequest(data: Prisma.LeaveRequestUncheckedCreateInput) {
    return this.prisma.leaveRequest.create({
      data,
      include: { employee: { include: { user: true } }, leaveType: true },
    });
  }

  reviewLeaveRequest(id: string, status: LeaveRequestStatus, approvedById: string | null, userId: string, rejectionReason?: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status, approvedById, reviewedAt: new Date(), rejectionReason, updatedBy: userId },
    });
  }

  listLeaveRequests(where: Prisma.LeaveRequestWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.leaveRequest.count({ where }),
      this.prisma.leaveRequest.findMany({
        where,
        include: { employee: { include: { user: true } }, leaveType: true, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createHoliday(data: Prisma.HolidayCalendarUncheckedCreateInput) {
    return this.prisma.holidayCalendar.create({ data });
  }

  listHolidays(where: Prisma.HolidayCalendarWhereInput) {
    return this.prisma.holidayCalendar.findMany({ where, orderBy: { holidayDate: "asc" } });
  }

  async upsertWeeklyOff(data: Prisma.WeeklyOffConfigurationUncheckedCreateInput, userId: string) {
    const existing = await this.prisma.weeklyOffConfiguration.findFirst({
      where: {
        businessId: data.businessId,
        weekday: data.weekday,
        deletedAt: null,
        ...(data.branchId ? { branchId: data.branchId } : { branchId: null }),
      },
    });

    if (existing) {
      return this.prisma.weeklyOffConfiguration.update({
        where: { id: existing.id },
        data: { isActive: data.isActive, updatedBy: userId },
      });
    }

    return this.prisma.weeklyOffConfiguration.create({ data });
  }

  createSalaryComponent(data: Prisma.SalaryComponentUncheckedCreateInput) {
    return this.prisma.salaryComponent.create({ data });
  }

  listSalaryComponents(where: Prisma.SalaryComponentWhereInput) {
    return this.prisma.salaryComponent.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  createEmployeeSalaryComponent(data: Prisma.EmployeeSalaryComponentUncheckedCreateInput) {
    return this.prisma.employeeSalaryComponent.create({ data, include: { employee: true, salaryComponent: true } });
  }

  listEmployeeSalaryComponents(where: Prisma.EmployeeSalaryComponentWhereInput) {
    return this.prisma.employeeSalaryComponent.findMany({
      where,
      include: { employee: { include: { user: true } }, salaryComponent: true, branch: true },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  createPayrollRun(data: Prisma.PayrollRunUncheckedCreateInput) {
    return this.prisma.payrollRun.create({ data });
  }

  listPayrollRuns(where: Prisma.PayrollRunWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.payrollRun.count({ where }),
      this.prisma.payrollRun.findMany({ where, include: { branch: true }, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  updatePayrollRunStatus(id: string, status: PayrollRunStatus, userId: string) {
    return this.prisma.payrollRun.update({
      where: { id },
      data: { status, processedAt: status === PayrollRunStatus.DRAFT ? null : new Date(), updatedBy: userId },
    });
  }

  createPayrollItem(data: Prisma.PayrollItemUncheckedCreateInput) {
    return this.prisma.payrollItem.create({
      data,
      include: { employee: { include: { user: true } }, payrollRun: true, salaryComponent: true },
    });
  }

  listPayrollItems(where: Prisma.PayrollItemWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.payrollItem.count({ where }),
      this.prisma.payrollItem.findMany({
        where,
        include: { employee: { include: { user: true } }, payrollRun: true, salaryComponent: true, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createRoleTemplate(data: Prisma.RoleTemplateUncheckedCreateInput) {
    return this.prisma.roleTemplate.create({ data });
  }

  listRoleTemplates(where: Prisma.RoleTemplateWhereInput) {
    return this.prisma.roleTemplate.findMany({ where, orderBy: { createdAt: "desc" } });
  }

  createCustomRole(data: Prisma.CustomRoleUncheckedCreateInput) {
    return this.prisma.customRole.create({ data, include: { roleTemplate: true } });
  }

  listCustomRoles(where: Prisma.CustomRoleWhereInput) {
    return this.prisma.customRole.findMany({ where, include: { roleTemplate: true }, orderBy: { createdAt: "desc" } });
  }

  createCustomRolePermission(data: Prisma.CustomRolePermissionUncheckedCreateInput) {
    return this.prisma.customRolePermission.create({ data, include: { customRole: true } });
  }

  listCustomRolePermissions(where: Prisma.CustomRolePermissionWhereInput) {
    return this.prisma.customRolePermission.findMany({ where, include: { customRole: true }, orderBy: { createdAt: "desc" } });
  }

  createEmployeeRoleAssignment(data: Prisma.EmployeeRoleAssignmentUncheckedCreateInput) {
    return this.prisma.employeeRoleAssignment.create({
      data,
      include: { employee: { include: { user: true } }, customRole: true, branch: true, department: true },
    });
  }

  listEmployeeRoleAssignments(where: Prisma.EmployeeRoleAssignmentWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.employeeRoleAssignment.count({ where }),
      this.prisma.employeeRoleAssignment.findMany({
        where,
        include: { employee: { include: { user: true } }, customRole: true, branch: true, department: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createEmployeeKpi(data: Prisma.EmployeeKpiUncheckedCreateInput) {
    return this.prisma.employeeKpi.create({ data, include: { employee: { include: { user: true } }, branch: true } });
  }

  listEmployeeKpis(where: Prisma.EmployeeKpiWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.employeeKpi.count({ where }),
      this.prisma.employeeKpi.findMany({
        where,
        include: { employee: { include: { user: true } }, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createHrNotification(data: Prisma.HrNotificationUncheckedCreateInput) {
    return this.prisma.hrNotification.create({
      data,
      include: { employee: { include: { user: true } }, senderEmployee: { include: { user: true } }, branch: true },
    });
  }

  listHrNotifications(where: Prisma.HrNotificationWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.hrNotification.count({ where }),
      this.prisma.hrNotification.findMany({
        where,
        include: { employee: { include: { user: true } }, senderEmployee: { include: { user: true } }, branch: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  markHrNotificationRead(id: string, userId: string) {
    return this.prisma.hrNotification.update({ where: { id }, data: { isRead: true, readAt: new Date(), updatedBy: userId } });
  }

  createEmployeeDocument(data: Prisma.EmployeeDocumentUncheckedCreateInput) {
    return this.prisma.employeeDocument.create({ data });
  }

  listEmployeeDocuments(where: Prisma.EmployeeDocumentWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.employeeDocument.count({ where }),
      this.prisma.employeeDocument.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  listSessions(where: Prisma.SessionWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({ where, include: { user: true, branch: true }, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  revokeSession(id: string) {
    return this.prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  listAuditLogs(where: Prisma.AuditLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  attendanceReport(businessId: string, query: PageQueryDto) {
    const where: Prisma.AttendanceRecordWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            attendanceDate: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };
    return this.prisma.attendanceRecord.groupBy({
      by: ["employeeId", "status"],
      where,
      _count: { _all: true },
      _sum: { overtimeMinutes: true, lateByMinutes: true, earlyExitMinutes: true },
      orderBy: { _count: { employeeId: "desc" } },
    });
  }

  leaveReport(businessId: string, query: PageQueryDto) {
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
    return this.prisma.leaveRequest.groupBy({
      by: ["leaveTypeId", "status"],
      where,
      _count: { _all: true },
      _sum: { totalDays: true },
      orderBy: { _count: { leaveTypeId: "desc" } },
    });
  }

  payrollReport(businessId: string, query: PageQueryDto) {
    const where: Prisma.PayrollItemWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.payrollItem.groupBy({
      by: ["employeeId", "componentType"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    });
  }

  async salesPerformanceReport(businessId: string, query: PageQueryDto) {
    const where: Prisma.BillingDocumentWhereInput = {
      businessId,
      deletedAt: null,
      type: { in: ["POS_BILL", "SALES_INVOICE", "SALES_ORDER"] as any },
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

    return this.prisma.billingDocument.groupBy({
      by: ["createdBy"],
      where,
      _sum: { grandTotal: true },
      _count: { _all: true },
      orderBy: { _sum: { grandTotal: "desc" } },
    });
  }

  clockOutRecalculate(record: {
    id: string;
    clockInAt: Date | null;
    clockOutAt?: Date | null;
    breakMinutes: number;
  }) {
    if (!record.clockInAt || !record.clockOutAt) return { workingMinutes: 0, overtimeMinutes: 0 };
    const worked = Math.max(0, Math.round((record.clockOutAt.getTime() - record.clockInAt.getTime()) / 60000) - (record.breakMinutes ?? 0));
    const overtime = Math.max(0, worked - 8 * 60);
    return { workingMinutes: worked, overtimeMinutes: overtime };
  }

  markLateEarly(record: {
    clockInAt?: Date | null;
    clockOutAt?: Date | null;
    shift?: { startTime: string; endTime: string } | null;
  }) {
    if (!record.shift || !record.clockInAt) return { lateByMinutes: 0, earlyExitMinutes: 0 };
    const [sH, sM] = record.shift.startTime.split(":").map((x) => Number(x));
    const [eH, eM] = record.shift.endTime.split(":").map((x) => Number(x));

    const day = new Date(record.clockInAt);
    const shiftStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sH, sM, 0, 0);
    const shiftEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eH, eM, 0, 0);

    const lateBy = Math.max(0, Math.round((record.clockInAt.getTime() - shiftStart.getTime()) / 60000));
    const early = record.clockOutAt ? Math.max(0, Math.round((shiftEnd.getTime() - record.clockOutAt.getTime()) / 60000)) : 0;
    return { lateByMinutes: lateBy, earlyExitMinutes: early };
  }

  attendanceStatusFromTimes(clockInAt: Date | null, clockOutAt: Date | null): AttendanceStatus {
    if (!clockInAt) return AttendanceStatus.ABSENT;
    if (!clockOutAt) return AttendanceStatus.PRESENT;
    const mins = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000));
    return mins < 4 * 60 ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT;
  }
}
