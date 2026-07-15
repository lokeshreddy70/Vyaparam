import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { NotificationEventType } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  BroadcastNotificationDto,
  CreateAnnouncementDto,
  CreateReminderDto,
  CreateTemplateDto,
  DispatchNotificationDto,
  MarkReadDto,
  NotificationPageQueryDto,
  RequestOtpDto,
  TriggerAlertDto,
  UpdateTemplateDto,
  UpsertPreferenceDto,
  VerifyOtpDto,
} from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("communication-engine")
@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post("templates")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.template.create")
  createTemplate(@CurrentUser() user: any, @Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(user.businessId, user.id, dto);
  }

  @Patch("templates/:id")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.template.update")
  updateTemplate(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(user.businessId, user.id, id, dto);
  }

  @Get("templates")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.template.read")
  listTemplates(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.listTemplates(user.businessId, query);
  }

  @Post("preferences")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.preference.manage")
  upsertPreference(@CurrentUser() user: any, @Body() dto: UpsertPreferenceDto) {
    return this.service.upsertPreference(user.businessId, user.id, dto);
  }

  @Get("preferences")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.preference.read")
  listPreferences(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.listPreferences(user.businessId, query);
  }

  @Post("dispatch")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.dispatch")
  dispatchOne(@CurrentUser() user: any, @Body() dto: DispatchNotificationDto) {
    return this.service.dispatchOne(user.businessId, user.id, dto);
  }

  @Post("broadcast")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.broadcast")
  dispatchBroadcast(@CurrentUser() user: any, @Body() dto: BroadcastNotificationDto) {
    return this.service.dispatchBroadcast(user.businessId, user.id, dto);
  }

  @Post("announcements")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.announcement.create")
  createAnnouncement(@CurrentUser() user: any, @Body() dto: CreateAnnouncementDto) {
    return this.service.createAnnouncement(user.businessId, user.id, dto);
  }

  @Get("announcements")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.announcement.read")
  listAnnouncements(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.listAnnouncements(user.businessId, query);
  }

  @Post("reminders")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.reminder.create")
  createReminder(@CurrentUser() user: any, @Body() dto: CreateReminderDto) {
    return this.service.createReminder(user.businessId, user.id, dto);
  }

  @Get("reminders")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.reminder.read")
  listReminders(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.listReminders(user.businessId, query);
  }

  @Post("otp/request")
  @Roles("OWNER", "MANAGER", "STAFF", "CASHIER")
  @Permissions("notification.otp.request")
  requestOtp(@CurrentUser() user: any, @Body() dto: RequestOtpDto) {
    return this.service.requestOtp(user.businessId, user.id, dto);
  }

  @Post("otp/verify")
  @Roles("OWNER", "MANAGER", "STAFF", "CASHIER")
  @Permissions("notification.otp.verify")
  verifyOtp(@CurrentUser() user: any, @Body() dto: VerifyOtpDto) {
    return this.service.verifyOtp(user.businessId, user.id, dto);
  }

  @Get("inbox")
  @Roles("OWNER", "MANAGER", "STAFF", "CASHIER")
  @Permissions("notification.inbox.read")
  getInbox(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.getInbox(user.businessId, { ...query, userId: query.userId ?? user.id });
  }

  @Patch("inbox/:id/read")
  @Roles("OWNER", "MANAGER", "STAFF", "CASHIER")
  @Permissions("notification.inbox.read")
  markRead(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: MarkReadDto) {
    return this.service.markRead(user.businessId, user.id, id, dto);
  }

  @Get("queue")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.queue.read")
  getQueue(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.getQueue(user.businessId, query);
  }

  @Post("queue/process")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.queue.process")
  processQueue(@CurrentUser() user: any) {
    return this.service.processQueue(user.businessId, user.id);
  }

  @Get("history/deliveries")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.history.read")
  getDeliveries(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.getDeliveries(user.businessId, query);
  }

  @Get("history/audit-logs")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.audit.read")
  getAuditLogs(@CurrentUser() user: any, @Query() query: NotificationPageQueryDto) {
    return this.service.getAuditLogs(user.businessId, query);
  }

  @Post("alerts/:eventType")
  @Roles("OWNER", "MANAGER")
  @Permissions("notification.alert.dispatch")
  triggerAlert(
    @CurrentUser() user: any,
    @Param("eventType", new ParseEnumPipe(NotificationEventType)) eventType: NotificationEventType,
    @Body() dto: TriggerAlertDto,
  ) {
    return this.service.triggerAlert(user.businessId, user.id, eventType, dto);
  }
}
