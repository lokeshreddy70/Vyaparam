import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { HrDocumentType } from "@prisma/client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { HrmsService } from "./hrms.service";
import {
  AttendanceCorrectionDto,
  AttendanceShiftDto,
  ClockActionDto,
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateEmployeeProfileDto,
  CustomRoleDto,
  CustomRolePermissionDto,
  EmployeeDocumentQueryDto,
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

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller("hrms")
export class HrmsController {
  constructor(private readonly service: HrmsService) {}

  private businessId(req: any): string {
    return req.user?.businessId;
  }

  private userId(req: any): string {
    return req.user?.id;
  }

  private employeeId(req: any): string | null {
    return req.user?.employee?.id ?? null;
  }

  @Post("departments")
  @Permissions("hr.department.create")
  createDepartment(@Req() req: any, @Body() dto: CreateDepartmentDto) {
    return this.service.createDepartment(this.businessId(req), this.userId(req), dto);
  }

  @Get("departments")
  @Permissions("hr.department.read")
  listDepartments(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listDepartments(this.businessId(req), query);
  }

  @Patch("departments/:id")
  @Permissions("hr.department.update")
  updateDepartment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.service.updateDepartment(id, this.userId(req), dto);
  }

  @Post("designations")
  @Permissions("hr.designation.create")
  createDesignation(@Req() req: any, @Body() dto: CreateDesignationDto) {
    return this.service.createDesignation(this.businessId(req), this.userId(req), dto);
  }

  @Get("designations")
  @Permissions("hr.designation.read")
  listDesignations(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listDesignations(this.businessId(req), query);
  }

  @Patch("designations/:id")
  @Permissions("hr.designation.update")
  updateDesignation(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDesignationDto) {
    return this.service.updateDesignation(id, this.userId(req), dto);
  }

  @Post("employees")
  @Permissions("hr.employee.create")
  createEmployeeProfile(@Req() req: any, @Body() dto: CreateEmployeeProfileDto) {
    return this.service.createEmployeeProfile(this.businessId(req), this.userId(req), dto);
  }

  @Get("employees")
  @Permissions("hr.employee.read")
  listEmployeeProfiles(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listEmployeeProfiles(this.businessId(req), query);
  }

  @Patch("employees/:id")
  @Permissions("hr.employee.update")
  updateEmployeeProfile(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateEmployeeProfileDto) {
    return this.service.updateEmployeeProfile(this.businessId(req), id, this.userId(req), dto);
  }

  @Post("attendance/shifts")
  @Permissions("hr.attendance.shift.create")
  createAttendanceShift(@Req() req: any, @Body() dto: AttendanceShiftDto) {
    return this.service.createAttendanceShift(this.businessId(req), this.userId(req), dto);
  }

  @Get("attendance/shifts")
  @Permissions("hr.attendance.shift.read")
  listAttendanceShifts(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listAttendanceShifts(this.businessId(req), query);
  }

  @Post("attendance/clock-in")
  @Permissions("hr.attendance.clockin")
  clockIn(@Req() req: any, @Body() dto: ClockActionDto) {
    return this.service.clockIn(this.businessId(req), this.userId(req), dto);
  }

  @Post("attendance/break/start")
  @Permissions("hr.attendance.break")
  startBreak(@Req() req: any, @Body() dto: ClockActionDto) {
    return this.service.startBreak(this.businessId(req), this.userId(req), dto);
  }

  @Post("attendance/break/end")
  @Permissions("hr.attendance.break")
  endBreak(@Req() req: any, @Body() dto: ClockActionDto) {
    return this.service.endBreak(this.businessId(req), this.userId(req), dto);
  }

  @Post("attendance/clock-out")
  @Permissions("hr.attendance.clockout")
  clockOut(@Req() req: any, @Body() dto: ClockActionDto) {
    return this.service.clockOut(this.businessId(req), this.userId(req), dto);
  }

  @Get("attendance")
  @Permissions("hr.attendance.read")
  listAttendance(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listAttendance(this.businessId(req), query);
  }

  @Post("attendance/corrections")
  @Permissions("hr.attendance.correction.create")
  requestAttendanceCorrection(@Req() req: any, @Body() dto: AttendanceCorrectionDto) {
    return this.service.requestAttendanceCorrection(this.businessId(req), this.userId(req), dto);
  }

  @Patch("attendance/corrections/review")
  @Permissions("hr.attendance.correction.review")
  reviewAttendanceCorrection(@Req() req: any, @Body() dto: ReviewAttendanceCorrectionDto) {
    return this.service.reviewAttendanceCorrection(
      this.businessId(req),
      this.userId(req),
      this.employeeId(req),
      dto,
    );
  }

  @Post("leave/types")
  @Permissions("hr.leave.type.create")
  createLeaveType(@Req() req: any, @Body() dto: LeaveTypeDto) {
    return this.service.createLeaveType(this.businessId(req), this.userId(req), dto);
  }

  @Get("leave/types")
  @Permissions("hr.leave.type.read")
  listLeaveTypes(@Req() req: any) {
    return this.service.listLeaveTypes(this.businessId(req));
  }

  @Post("leave/balances")
  @Permissions("hr.leave.balance.upsert")
  upsertLeaveBalance(@Req() req: any, @Body() dto: LeaveBalanceUpsertDto) {
    return this.service.upsertLeaveBalance(this.businessId(req), this.userId(req), dto);
  }

  @Post("leave/requests")
  @Permissions("hr.leave.request.create")
  createLeaveRequest(@Req() req: any, @Body() dto: LeaveRequestDto) {
    return this.service.createLeaveRequest(this.businessId(req), this.userId(req), dto);
  }

  @Get("leave/requests")
  @Permissions("hr.leave.request.read")
  listLeaveRequests(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listLeaveRequests(this.businessId(req), query);
  }

  @Patch("leave/requests/:id/review")
  @Permissions("hr.leave.request.review")
  reviewLeaveRequest(@Req() req: any, @Param("id") id: string, @Body() dto: ReviewLeaveRequestDto) {
    return this.service.reviewLeaveRequest(
      this.businessId(req),
      this.userId(req),
      this.employeeId(req),
      id,
      dto,
    );
  }

  @Post("calendar/holidays")
  @Permissions("hr.calendar.holiday.create")
  createHoliday(@Req() req: any, @Body() dto: HolidayDto) {
    return this.service.createHoliday(this.businessId(req), this.userId(req), dto);
  }

  @Get("calendar/holidays")
  @Permissions("hr.calendar.holiday.read")
  listHolidays(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listHolidays(this.businessId(req), query);
  }

  @Post("calendar/weekly-off")
  @Permissions("hr.calendar.weeklyoff.upsert")
  upsertWeeklyOff(@Req() req: any, @Body() dto: WeeklyOffDto) {
    return this.service.upsertWeeklyOff(this.businessId(req), this.userId(req), dto);
  }

  @Post("payroll/components")
  @Permissions("hr.payroll.component.create")
  createSalaryComponent(@Req() req: any, @Body() dto: SalaryComponentDto) {
    return this.service.createSalaryComponent(this.businessId(req), this.userId(req), dto);
  }

  @Get("payroll/components")
  @Permissions("hr.payroll.component.read")
  listSalaryComponents(@Req() req: any) {
    return this.service.listSalaryComponents(this.businessId(req));
  }

  @Post("payroll/employee-components")
  @Permissions("hr.payroll.employeecomponent.create")
  createEmployeeSalaryComponent(@Req() req: any, @Body() dto: EmployeeSalaryComponentDto) {
    return this.service.createEmployeeSalaryComponent(this.businessId(req), this.userId(req), dto);
  }

  @Get("payroll/employee-components")
  @Permissions("hr.payroll.employeecomponent.read")
  listEmployeeSalaryComponents(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listEmployeeSalaryComponents(this.businessId(req), query);
  }

  @Post("payroll/runs")
  @Permissions("hr.payroll.run.create")
  createPayrollRun(@Req() req: any, @Body() dto: PayrollRunDto) {
    return this.service.createPayrollRun(this.businessId(req), this.userId(req), dto);
  }

  @Get("payroll/runs")
  @Permissions("hr.payroll.run.read")
  listPayrollRuns(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listPayrollRuns(this.businessId(req), query);
  }

  @Patch("payroll/runs/:id/status")
  @Permissions("hr.payroll.run.update")
  updatePayrollStatus(@Req() req: any, @Param("id") id: string, @Body() dto: PayrollStatusDto) {
    return this.service.updatePayrollStatus(this.businessId(req), this.userId(req), id, dto);
  }

  @Post("payroll/runs/:id/items")
  @Permissions("hr.payroll.item.create")
  createPayrollItem(@Req() req: any, @Param("id") id: string, @Body() dto: PayrollItemDto) {
    return this.service.createPayrollItem(this.businessId(req), this.userId(req), id, dto);
  }

  @Get("payroll/runs/:id/items")
  @Permissions("hr.payroll.item.read")
  listPayrollItems(@Req() req: any, @Param("id") id: string, @Query() query: PageQueryDto) {
    return this.service.listPayrollItems(this.businessId(req), id, query);
  }

  @Post("permissions/role-templates")
  @Permissions("hr.permission.template.create")
  createRoleTemplate(@Req() req: any, @Body() dto: RoleTemplateDto) {
    return this.service.createRoleTemplate(this.businessId(req), this.userId(req), dto);
  }

  @Get("permissions/role-templates")
  @Permissions("hr.permission.template.read")
  listRoleTemplates(@Req() req: any) {
    return this.service.listRoleTemplates(this.businessId(req));
  }

  @Post("permissions/custom-roles")
  @Permissions("hr.permission.customrole.create")
  createCustomRole(@Req() req: any, @Body() dto: CustomRoleDto) {
    return this.service.createCustomRole(this.businessId(req), this.userId(req), dto);
  }

  @Get("permissions/custom-roles")
  @Permissions("hr.permission.customrole.read")
  listCustomRoles(@Req() req: any) {
    return this.service.listCustomRoles(this.businessId(req));
  }

  @Post("permissions/custom-role-permissions")
  @Permissions("hr.permission.assignment.create")
  createCustomRolePermission(@Req() req: any, @Body() dto: CustomRolePermissionDto) {
    return this.service.createCustomRolePermission(this.businessId(req), this.userId(req), dto);
  }

  @Get("permissions/custom-role-permissions")
  @Permissions("hr.permission.assignment.read")
  listCustomRolePermissions(@Req() req: any, @Query("customRoleId") customRoleId?: string) {
    return this.service.listCustomRolePermissions(this.businessId(req), customRoleId);
  }

  @Post("permissions/employee-roles")
  @Permissions("hr.permission.employee.assign")
  assignEmployeeRole(@Req() req: any, @Body() dto: EmployeeRoleAssignmentDto) {
    return this.service.assignEmployeeRole(this.businessId(req), this.userId(req), dto);
  }

  @Get("permissions/employee-roles")
  @Permissions("hr.permission.employee.read")
  listEmployeeRoleAssignments(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listEmployeeRoleAssignments(this.businessId(req), query);
  }

  @Post("performance/kpis")
  @Permissions("hr.performance.kpi.create")
  createEmployeeKpi(@Req() req: any, @Body() dto: EmployeeKpiDto) {
    return this.service.createEmployeeKpi(this.businessId(req), this.userId(req), dto);
  }

  @Get("performance/kpis")
  @Permissions("hr.performance.kpi.read")
  listEmployeeKpis(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listEmployeeKpis(this.businessId(req), query);
  }

  @Post("notifications")
  @Permissions("hr.notification.create")
  createHrNotification(@Req() req: any, @Body() dto: HrNotificationDto) {
    return this.service.createHrNotification(
      this.businessId(req),
      this.userId(req),
      this.employeeId(req),
      dto,
    );
  }

  @Get("notifications")
  @Permissions("hr.notification.read")
  listHrNotifications(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listHrNotifications(this.businessId(req), query, this.employeeId(req) ?? undefined);
  }

  @Patch("notifications/:id/read")
  @Permissions("hr.notification.read")
  markNotificationRead(@Req() req: any, @Param("id") id: string) {
    return this.service.markNotificationRead(this.businessId(req), this.userId(req), id);
  }

  @Post("employees/:employeeId/photo")
  @Permissions("hr.employee.photo.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadEmployeePhoto(@Req() req: any, @Param("employeeId") employeeId: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadEmployeePhoto(this.businessId(req), this.userId(req), employeeId, file);
  }

  @Post("employees/:employeeId/documents")
  @Permissions("hr.employee.document.upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadEmployeeDocument(
    @Req() req: any,
    @Param("employeeId") employeeId: string,
    @Query("type", new ParseEnumPipe(HrDocumentType)) type: HrDocumentType,
    @Query("title") title: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadEmployeeDocument(this.businessId(req), this.userId(req), employeeId, type, title, file);
  }

  @Get("employees/documents")
  @Permissions("hr.employee.document.read")
  listEmployeeDocuments(@Req() req: any, @Query() query: EmployeeDocumentQueryDto) {
    return this.service.listEmployeeDocuments(this.businessId(req), query);
  }

  @Get("security/sessions")
  @Permissions("hr.security.session.read")
  listSecuritySessions(@Req() req: any, @Query() query: SessionQueryDto) {
    return this.service.listSecuritySessions(this.businessId(req), query);
  }

  @Delete("security/sessions/:id")
  @Permissions("hr.security.session.revoke")
  revokeSession(@Req() req: any, @Param("id") id: string) {
    return this.service.revokeSession(this.businessId(req), id);
  }

  @Get("security/audit-logs")
  @Permissions("hr.security.audit.read")
  listAuditLogs(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listAuditLogs(this.businessId(req), query);
  }

  @Get("reports/attendance")
  @Permissions("hr.report.attendance.read")
  attendanceSnapshot(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.attendanceStatusSnapshot(this.businessId(req), query);
  }

  @Get("reports/leave")
  @Permissions("hr.report.leave.read")
  leaveSnapshot(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.leaveStatusSnapshot(this.businessId(req), query);
  }

  @Get("reports/payroll")
  @Permissions("hr.report.payroll.read")
  payrollSnapshot(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.payrollStatusSnapshot(this.businessId(req), query);
  }

  @Get("reports/sales-performance")
  @Permissions("hr.report.performance.read")
  salesPerformanceSnapshot(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.salesPerformanceSnapshot(this.businessId(req), query);
  }
}
