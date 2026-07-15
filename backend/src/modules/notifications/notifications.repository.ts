import { Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  NotificationPriority,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationPageQueryDto } from "./dto/notifications.dto";

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  paginate(query: NotificationPageQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  listActiveBusinesses(take = 200) {
    return this.prisma.business.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take,
    });
  }

  getBusinessConfiguration(businessId: string) {
    return this.prisma.businessConfiguration.findUnique({ where: { businessId } });
  }

  createTemplate(data: Prisma.NotificationTemplateUncheckedCreateInput) {
    return this.prisma.notificationTemplate.create({ data });
  }

  updateTemplate(id: string, data: Prisma.NotificationTemplateUncheckedUpdateInput) {
    return this.prisma.notificationTemplate.update({ where: { id }, data });
  }

  findTemplateByCode(businessId: string, code: string) {
    return this.prisma.notificationTemplate.findFirst({ where: { businessId, code, deletedAt: null } });
  }

  listTemplates(where: Prisma.NotificationTemplateWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.notificationTemplate.count({ where }),
      this.prisma.notificationTemplate.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  upsertPreference(data: Prisma.NotificationPreferenceUncheckedCreateInput, userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: {
        businessId_userId_eventType: {
          businessId: data.businessId,
          userId: data.userId,
          eventType: data.eventType,
        },
      },
      create: data,
      update: {
        branchId: data.branchId,
        inAppEnabled: data.inAppEnabled,
        pushEnabled: data.pushEnabled,
        emailEnabled: data.emailEnabled,
        smsEnabled: data.smsEnabled,
        whatsappEnabled: data.whatsappEnabled,
        quietHours: data.quietHours,
        updatedBy: userId,
      },
    });
  }

  getPreference(businessId: string, userId: string, eventType: NotificationEventType) {
    return this.prisma.notificationPreference.findUnique({
      where: { businessId_userId_eventType: { businessId, userId, eventType } },
    });
  }

  listPreferences(where: Prisma.NotificationPreferenceWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.notificationPreference.count({ where }),
      this.prisma.notificationPreference.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  createAnnouncement(data: Prisma.AnnouncementUncheckedCreateInput) {
    return this.prisma.announcement.create({ data });
  }

  listAnnouncements(where: Prisma.AnnouncementWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  createReminder(data: Prisma.ReminderUncheckedCreateInput) {
    return this.prisma.reminder.create({ data });
  }

  listReminders(where: Prisma.ReminderWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.reminder.count({ where }),
      this.prisma.reminder.findMany({ where, orderBy: { remindAt: "asc" }, skip, take }),
    ]);
  }

  pullDueReminders(businessId: string, take = 100) {
    return this.prisma.reminder.findMany({
      where: { businessId, isProcessed: false, remindAt: { lte: new Date() }, deletedAt: null },
      orderBy: { remindAt: "asc" },
      take,
    });
  }

  markReminderProcessed(id: string, userId: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { isProcessed: true, processedAt: new Date(), updatedBy: userId },
    });
  }

  createQueueItem(data: Prisma.NotificationQueueUncheckedCreateInput) {
    return this.prisma.notificationQueue.create({ data });
  }

  findQueueItem(id: string) {
    return this.prisma.notificationQueue.findUnique({ where: { id }, include: { template: true } });
  }

  listQueue(where: Prisma.NotificationQueueWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.notificationQueue.count({ where }),
      this.prisma.notificationQueue.findMany({ where, include: { template: true }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], skip, take }),
    ]);
  }

  pullDueQueueItems(businessId: string, take = 100) {
    return this.prisma.notificationQueue.findMany({
      where: {
        businessId,
        deletedAt: null,
        OR: [
          { status: NotificationDeliveryStatus.QUEUED },
          { status: NotificationDeliveryStatus.RETRY },
        ],
        AND: [
          {
            OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
          },
          {
            OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
          },
        ],
      },
      include: { template: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take,
    });
  }

  updateQueueStatus(id: string, data: Prisma.NotificationQueueUncheckedUpdateInput) {
    return this.prisma.notificationQueue.update({ where: { id }, data });
  }

  createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    return this.prisma.notification.create({ data });
  }

  updateNotification(id: string, data: Prisma.NotificationUncheckedUpdateInput) {
    return this.prisma.notification.update({ where: { id }, data });
  }

  listNotifications(where: Prisma.NotificationWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        include: { template: true, queue: true, deliveries: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createDelivery(data: Prisma.NotificationDeliveryUncheckedCreateInput) {
    return this.prisma.notificationDelivery.create({ data });
  }

  updateDelivery(id: string, data: Prisma.NotificationDeliveryUncheckedUpdateInput) {
    return this.prisma.notificationDelivery.update({ where: { id }, data });
  }

  listDeliveries(where: Prisma.NotificationDeliveryWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.notificationDelivery.count({ where }),
      this.prisma.notificationDelivery.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  createAuditLog(data: Prisma.NotificationAuditLogUncheckedCreateInput) {
    return this.prisma.notificationAuditLog.create({ data });
  }

  listAuditLogs(where: Prisma.NotificationAuditLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.notificationAuditLog.count({ where }),
      this.prisma.notificationAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  createOtpRequest(data: Prisma.OtpRequestUncheckedCreateInput) {
    return this.prisma.otpRequest.create({ data });
  }

  findOtpRequest(id: string) {
    return this.prisma.otpRequest.findUnique({ where: { id } });
  }

  updateOtpRequest(id: string, data: Prisma.OtpRequestUncheckedUpdateInput) {
    return this.prisma.otpRequest.update({ where: { id }, data });
  }

  buildQueueWhere(businessId: string, query: NotificationPageQueryDto): Prisma.NotificationQueueWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.status ? { status: query.status } : {}),
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
              { title: { contains: query.search, mode: "insensitive" } },
              { message: { contains: query.search, mode: "insensitive" } },
              { recipient: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  buildNotificationWhere(businessId: string, query: NotificationPageQueryDto): Prisma.NotificationWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.status ? { deliveryStatus: query.status } : {}),
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
              { title: { contains: query.search, mode: "insensitive" } },
              { message: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }

  priorityRank(priority: NotificationPriority) {
    const map: Record<NotificationPriority, number> = {
      [NotificationPriority.LOW]: 1,
      [NotificationPriority.MEDIUM]: 2,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.CRITICAL]: 4,
    };
    return map[priority] ?? 2;
  }

  channelEnabledFromPreference(pref: {
    inAppEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
  } | null, channel: NotificationChannel) {
    if (!pref) return true;
    if (channel === NotificationChannel.IN_APP) return pref.inAppEnabled;
    if (channel === NotificationChannel.PUSH) return pref.pushEnabled;
    if (channel === NotificationChannel.EMAIL) return pref.emailEnabled;
    if (channel === NotificationChannel.SMS) return pref.smsEnabled;
    if (channel === NotificationChannel.WHATSAPP) return pref.whatsappEnabled;
    return true;
  }
}
