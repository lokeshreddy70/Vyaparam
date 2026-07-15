import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { EnqueueJobDto, JobQueryDto, MonitorPageQueryDto, ProcessJobsDto } from "./dto/monitoring.dto";
import { MonitoringService } from "./monitoring.service";

@ApiTags("monitoring")
@ApiBearerAuth("bearer")
@Controller("monitoring")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Get("health")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.read")
  getHealth(@CurrentUser() user: any) {
    return this.service.getHealth(user.businessId);
  }

  @Get("metrics")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.read")
  getMetrics(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getSystemMetrics(user.businessId, query);
  }

  @Get("dashboard")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.read")
  getDashboard(@CurrentUser() user: any) {
    return this.service.getJobDashboard(user.businessId);
  }

  @Post("jobs")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.jobs.manage")
  enqueueJob(@CurrentUser() user: any, @Body() dto: EnqueueJobDto) {
    return this.service.enqueueJob(user.businessId, user.id, dto);
  }

  @Post("jobs/process")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.jobs.manage")
  processJobs(@CurrentUser() user: any, @Body() dto: ProcessJobsDto) {
    return this.service.triggerProcessor(user.businessId, user.id, dto);
  }

  @Get("jobs")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.jobs.read")
  listJobs(@CurrentUser() user: any, @Query() query: JobQueryDto) {
    return this.service.listJobs(user.businessId, query);
  }

  @Get("jobs/runs")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.jobs.read")
  listJobRuns(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.listJobRuns(user.businessId, query);
  }

  @Get("logs/audit")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.audit.read")
  getAuditLogs(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getAuditLogs(user.businessId, query);
  }

  @Get("logs/activity")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.audit.read")
  getActivityLogs(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getActivityLogs(user.businessId, query);
  }

  @Get("logs/api-requests")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.audit.read")
  getApiRequests(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getApiRequestLogs(user.businessId, query);
  }

  @Get("logs/api-errors")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.audit.read")
  getApiErrors(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getApiErrorLogs(user.businessId, query);
  }

  @Get("logs/login-history")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.audit.read")
  getLoginHistory(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getLoginHistory(user.businessId, query);
  }

  @Get("logs/failed-logins")
  @Roles("OWNER", "MANAGER")
  @Permissions("monitoring.audit.read")
  getFailedLogins(@CurrentUser() user: any, @Query() query: MonitorPageQueryDto) {
    return this.service.getFailedLoginHistory(user.businessId, query);
  }
}
