import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationEventType,
  NotificationPriority,
  NotificationType,
  OtpPurpose,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
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
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private processorTimer: NodeJS.Timeout | null = null;
  private processLock = false;

  constructor(private readonly repo: NotificationsRepository) {}

  onModuleInit() {
    this.processorTimer = setInterval(() => {
      void this.processQueueForAllBusinesses();
    }, 15000);
  }

  onModuleDestroy() {
    if (this.processorTimer) {
      clearInterval(this.processorTimer);
      this.processorTimer = null;
    }
  }

  private pageResult<T>(count: number, items: T[], page: number, limit: number) {
    return {
      items,
      meta: {
        count,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  private applyTemplate(input: string, payload?: Record<string, unknown>) {
    if (!payload) return input;
    return input.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) => {
      const value = payload[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  private normalizeEventTitle(eventType: NotificationEventType) {
    return eventType
      .split("_")
      .map((x) => x.charAt(0) + x.slice(1).toLowerCase())
      .join(" ");
  }

  private async resolveProviderConfig(businessId: string, channel: NotificationChannel) {
    const cfg = await this.repo.getBusinessConfiguration(businessId);
    const notificationSettings = (cfg?.notificationSettings as Record<string, unknown> | null) ?? {};
    const emailSettings = (cfg?.emailSettings as Record<string, unknown> | null) ?? {};
    const smsSettings = (cfg?.smsSettings as Record<string, unknown> | null) ?? {};
    const pushSettings = (cfg?.pushNotificationSettings as Record<string, unknown> | null) ?? {};
    const thirdParty = (cfg?.thirdPartyIntegrations as Record<string, unknown> | null) ?? {};

    if (channel === NotificationChannel.EMAIL) {
      return {
        ...(emailSettings ?? {}),
        retryDelaySeconds: Number(notificationSettings["retryDelaySeconds"] ?? 60),
      };
    }
    if (channel === NotificationChannel.SMS) {
      return {
        ...(smsSettings ?? {}),
        retryDelaySeconds: Number(notificationSettings["retryDelaySeconds"] ?? 60),
      };
    }
    if (channel === NotificationChannel.PUSH) {
      return {
        ...(pushSettings ?? {}),
        retryDelaySeconds: Number(notificationSettings["retryDelaySeconds"] ?? 60),
      };
    }
    if (channel === NotificationChannel.WHATSAPP) {
      return {
        ...((thirdParty["whatsapp"] as Record<string, unknown> | undefined) ?? {}),
        retryDelaySeconds: Number(notificationSettings["retryDelaySeconds"] ?? 60),
      };
    }

    return {
      ...(notificationSettings ?? {}),
      retryDelaySeconds: Number(notificationSettings["retryDelaySeconds"] ?? 60),
    };
  }

  private async providerSend(
    businessId: string,
    channel: NotificationChannel,
    payload: {
      subject?: string | null;
      title: string;
      message: string;
      recipient?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (channel === NotificationChannel.IN_APP) {
      return {
        ok: true,
        provider: "in-app",
        statusCode: "200",
        responseBody: "in-app queued",
      };
    }

    const providerConfig = await this.resolveProviderConfig(businessId, channel);
    const enabled = providerConfig["enabled"] !== false;
    const endpoint = providerConfig["endpoint"] as string | undefined;
    const method = String(providerConfig["method"] ?? "POST").toUpperCase();
    const headersRaw = (providerConfig["headers"] as Record<string, string> | undefined) ?? {};

    if (!enabled) {
      return {
        ok: false,
        provider: String(providerConfig["provider"] ?? channel.toLowerCase()),
        statusCode: "DISABLED",
        responseBody: "provider disabled in business configuration",
      };
    }

    if (!endpoint) {
      return {
        ok: false,
        provider: String(providerConfig["provider"] ?? channel.toLowerCase()),
        statusCode: "NOT_CONFIGURED",
        responseBody: "provider endpoint missing in business configuration",
      };
    }

    try {
      const resp = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headersRaw,
        },
        body: JSON.stringify({
          businessId,
          channel,
          recipient: payload.recipient,
          subject: payload.subject,
          title: payload.title,
          message: payload.message,
          metadata: payload.metadata ?? {},
        }),
      });

      const text = await resp.text();
      return {
        ok: resp.ok,
        provider: String(providerConfig["provider"] ?? channel.toLowerCase()),
        statusCode: String(resp.status),
        responseBody: text.slice(0, 5000),
      };
    } catch (error: any) {
      return {
        ok: false,
        provider: String(providerConfig["provider"] ?? channel.toLowerCase()),
        statusCode: "NETWORK_ERROR",
        responseBody: String(error?.message ?? "delivery failed"),
      };
    }
  }

  private async enqueueCore(
    businessId: string,
    actorUserId: string,
    dto: {
      userId?: string;
      branchId?: string;
      templateCode?: string;
      channel: NotificationChannel;
      eventType: NotificationEventType;
      type?: NotificationType;
      priority?: NotificationPriority;
      subject?: string;
      title: string;
      message: string;
      recipient?: string;
      payload?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      scheduledAt?: string;
    },
  ) {
    const template = dto.templateCode
      ? await this.repo.findTemplateByCode(businessId, dto.templateCode)
      : null;

    if (dto.templateCode && !template) {
      throw new NotFoundException("Notification template not found");
    }

    const payload = dto.payload ?? {};
    const title = template ? this.applyTemplate(template.title, payload) : this.applyTemplate(dto.title, payload);
    const message = template ? this.applyTemplate(template.body, payload) : this.applyTemplate(dto.message, payload);
    const subject = template
      ? this.applyTemplate(template.subject ?? dto.subject ?? title, payload)
      : this.applyTemplate(dto.subject ?? title, payload);

    if (dto.userId) {
      const pref = await this.repo.getPreference(businessId, dto.userId, dto.eventType);
      const channelEnabled = this.repo.channelEnabledFromPreference(pref, dto.channel);
      if (!channelEnabled) {
        const cancelled = await this.repo.createQueueItem({
          businessId,
          branchId: dto.branchId,
          userId: dto.userId,
          templateId: template?.id,
          channel: dto.channel,
          eventType: dto.eventType,
          priority: dto.priority ?? NotificationPriority.MEDIUM,
          status: NotificationDeliveryStatus.CANCELLED,
          subject,
          title,
          message,
          payload: payload as Prisma.JsonObject,
          recipient: dto.recipient,
          metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          processedAt: new Date(),
          lastError: "disabled by user preference",
          createdBy: actorUserId,
          updatedBy: actorUserId,
        });
        await this.repo.createAuditLog({
          businessId,
          queueId: cancelled.id,
          action: "NOTIFICATION_CANCELLED_BY_PREFERENCE",
          actorUserId,
          details: { userId: dto.userId, channel: dto.channel, eventType: dto.eventType } as Prisma.JsonObject,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        });
        return cancelled;
      }
    }

    const queueItem = await this.repo.createQueueItem({
      businessId,
      branchId: dto.branchId,
      userId: dto.userId,
      templateId: template?.id,
      channel: dto.channel,
      eventType: dto.eventType,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      status: NotificationDeliveryStatus.QUEUED,
      subject,
      title,
      message,
      payload: payload as Prisma.JsonObject,
      recipient: dto.recipient,
      metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    await this.repo.createAuditLog({
      businessId,
      queueId: queueItem.id,
      action: "NOTIFICATION_ENQUEUED",
      actorUserId,
      details: {
        channel: dto.channel,
        eventType: dto.eventType,
        userId: dto.userId,
        templateCode: dto.templateCode,
      } as Prisma.JsonObject,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    return queueItem;
  }

  async createTemplate(businessId: string, userId: string, dto: CreateTemplateDto) {
    return this.repo.createTemplate({
      businessId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      channel: dto.channel,
      eventType: dto.eventType,
      subject: dto.subject,
      title: dto.title,
      body: dto.body,
      variables: (dto.variables ?? {}) as Prisma.JsonObject,
      isActive: dto.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async updateTemplate(businessId: string, userId: string, id: string, dto: UpdateTemplateDto) {
    const data: Prisma.NotificationTemplateUncheckedUpdateInput = {
      updatedBy: userId,
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.body !== undefined ? { body: dto.body } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.variables !== undefined ? { variables: dto.variables as Prisma.JsonObject } : {}),
      ...(dto.title || dto.body || dto.subject || dto.variables ? { version: { increment: 1 } } : {}),
    };

    const existing = await this.repo.updateTemplate(id, data);

    if (existing.businessId !== businessId) {
      throw new NotFoundException("Notification template not found");
    }

    return existing;
  }

  async listTemplates(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where: Prisma.NotificationTemplateWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } },
              { title: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repo.listTemplates(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async upsertPreference(businessId: string, userId: string, dto: UpsertPreferenceDto) {
    return this.repo.upsertPreference(
      {
        businessId,
        branchId: dto.branchId,
        userId: dto.userId,
        eventType: dto.eventType,
        inAppEnabled: dto.inAppEnabled ?? true,
        pushEnabled: dto.pushEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? true,
        smsEnabled: dto.smsEnabled ?? false,
        whatsappEnabled: dto.whatsappEnabled ?? false,
        quietHours: (dto.quietHours ?? {}) as Prisma.JsonObject,
        createdBy: userId,
        updatedBy: userId,
      },
      userId,
    );
  }

  async listPreferences(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where: Prisma.NotificationPreferenceWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
    };
    const [count, items] = await this.repo.listPreferences(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async createAnnouncement(businessId: string, userId: string, dto: CreateAnnouncementDto) {
    const item = await this.repo.createAnnouncement({
      businessId,
      branchId: dto.branchId,
      title: dto.title,
      message: dto.message,
      audience: dto.audience ?? "ALL",
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      isActive: dto.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.enqueueCore(businessId, userId, {
      branchId: dto.branchId,
      channel: NotificationChannel.IN_APP,
      eventType: NotificationEventType.ANNOUNCEMENT,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      title: dto.title,
      message: dto.message,
      payload: { announcementId: item.id, audience: item.audience },
      scheduledAt: dto.startsAt,
    });

    return item;
  }

  async listAnnouncements(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where: Prisma.AnnouncementWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { message: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [count, items] = await this.repo.listAnnouncements(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async dispatchOne(businessId: string, userId: string, dto: DispatchNotificationDto) {
    return this.enqueueCore(businessId, userId, dto);
  }

  async dispatchBroadcast(businessId: string, userId: string, dto: BroadcastNotificationDto) {
    const queueItem = await this.enqueueCore(businessId, userId, {
      branchId: dto.branchId,
      templateCode: dto.templateCode,
      channel: dto.channel,
      eventType: NotificationEventType.BROADCAST,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      title: dto.title,
      message: dto.message,
      payload: dto.payload,
      scheduledAt: dto.scheduledAt,
    });

    await this.repo.createAuditLog({
      businessId,
      queueId: queueItem.id,
      action: "BROADCAST_QUEUED",
      actorUserId: userId,
      details: { branchId: dto.branchId } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return queueItem;
  }

  async createReminder(businessId: string, userId: string, dto: CreateReminderDto) {
    return this.repo.createReminder({
      businessId,
      branchId: dto.branchId,
      userId: dto.userId,
      eventType: dto.eventType,
      title: dto.title,
      message: dto.message,
      payload: (dto.payload ?? {}) as Prisma.JsonObject,
      remindAt: new Date(dto.remindAt),
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listReminders(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where: Prisma.ReminderWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.fromDate || query.toDate
        ? {
            remindAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [count, items] = await this.repo.listReminders(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async requestOtp(businessId: string, userId: string, dto: RequestOtpDto) {
    if (dto.channel !== NotificationChannel.EMAIL && dto.channel !== NotificationChannel.SMS && dto.channel !== NotificationChannel.WHATSAPP) {
      throw new BadRequestException("OTP supports EMAIL, SMS, and WHATSAPP channels only");
    }

    if (dto.channel === NotificationChannel.EMAIL) {
      const mail = dto.recipient.includes("@");
      if (!mail) throw new BadRequestException("EMAIL channel requires a valid email recipient");
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otpCode, 10);
    const ttl = dto.ttlMinutes ?? 10;
    const expiresAt = new Date(Date.now() + ttl * 60_000);

    const req = await this.repo.createOtpRequest({
      businessId,
      userId: dto.userId,
      purpose: dto.purpose,
      channel: dto.channel,
      recipient: dto.recipient,
      codeHash: hash,
      expiresAt,
      status: NotificationDeliveryStatus.QUEUED,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.enqueueCore(businessId, userId, {
      userId: dto.userId,
      channel: dto.channel,
      eventType:
        dto.purpose === OtpPurpose.PASSWORD_RESET
          ? NotificationEventType.PASSWORD_RESET
          : NotificationEventType.EMAIL_VERIFICATION,
      priority: NotificationPriority.CRITICAL,
      title:
        dto.purpose === OtpPurpose.PASSWORD_RESET
          ? "Password Reset OTP"
          : dto.purpose === OtpPurpose.EMAIL_VERIFICATION
            ? "Email Verification OTP"
            : "Login OTP",
      message: `Your OTP is ${otpCode}. It expires in ${ttl} minutes.`,
      recipient: dto.recipient,
      payload: { otpRequestId: req.id, purpose: dto.purpose, ttlMinutes: ttl },
      metadata: { otpRequestId: req.id },
    });

    return {
      otpRequestId: req.id,
      expiresAt: req.expiresAt,
      purpose: req.purpose,
      channel: req.channel,
    };
  }

  async verifyOtp(businessId: string, userId: string, dto: VerifyOtpDto) {
    const req = await this.repo.findOtpRequest(dto.otpRequestId);
    if (!req || req.businessId !== businessId || req.deletedAt) {
      throw new NotFoundException("OTP request not found");
    }

    if (req.consumedAt) {
      throw new BadRequestException("OTP already consumed");
    }

    if (req.expiresAt.getTime() < Date.now()) {
      await this.repo.updateOtpRequest(req.id, {
        status: NotificationDeliveryStatus.FAILED,
        updatedBy: userId,
      });
      throw new BadRequestException("OTP expired");
    }

    if (req.attempts >= req.maxAttempts) {
      throw new BadRequestException("Maximum OTP verification attempts reached");
    }

    const valid = await bcrypt.compare(dto.code, req.codeHash);
    if (!valid) {
      await this.repo.updateOtpRequest(req.id, {
        attempts: { increment: 1 },
        updatedBy: userId,
      });
      throw new BadRequestException("Invalid OTP");
    }

    await this.repo.updateOtpRequest(req.id, {
      consumedAt: new Date(),
      status: NotificationDeliveryStatus.SENT,
      updatedBy: userId,
    });

    await this.repo.createAuditLog({
      businessId,
      action: "OTP_VERIFIED",
      actorUserId: userId,
      details: { otpRequestId: req.id, purpose: req.purpose } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return { verified: true, otpRequestId: req.id };
  }

  async getInbox(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where = this.repo.buildNotificationWhere(businessId, query);
    const [count, items] = await this.repo.listNotifications(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async markRead(businessId: string, userId: string, id: string, dto: MarkReadDto) {
    const updated = await this.repo.updateNotification(id, {
      isRead: dto.isRead,
      readAt: dto.isRead ? new Date() : null,
      updatedBy: userId,
    });
    if (updated.businessId !== businessId) {
      throw new NotFoundException("Notification not found");
    }
    return updated;
  }

  async getQueue(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where = this.repo.buildQueueWhere(businessId, query);
    const [count, items] = await this.repo.listQueue(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getDeliveries(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where: Prisma.NotificationDeliveryWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.channel ? { channel: query.channel } : {}),
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
              { provider: { contains: query.search, mode: "insensitive" } },
              { recipient: { contains: query.search, mode: "insensitive" } },
              { responseBody: { contains: query.search, mode: "insensitive" } },
              { errorMessage: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repo.listDeliveries(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getAuditLogs(businessId: string, query: NotificationPageQueryDto) {
    const { page, limit, skip } = this.repo.paginate(query);
    const where: Prisma.NotificationAuditLogWhereInput = {
      businessId,
      deletedAt: null,
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
            action: { contains: query.search, mode: "insensitive" },
          }
        : {}),
    };
    const [count, items] = await this.repo.listAuditLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async triggerAlert(businessId: string, userId: string, eventType: NotificationEventType, dto: TriggerAlertDto) {
    const fallbackTitle = `${this.normalizeEventTitle(eventType)} Alert`;
    const fallbackMessage = `${this.normalizeEventTitle(eventType)} notification`;

    return this.enqueueCore(businessId, userId, {
      userId: dto.userId,
      branchId: dto.branchId,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      eventType,
      priority: dto.priority ?? NotificationPriority.HIGH,
      title: dto.title ?? fallbackTitle,
      message: dto.message ?? fallbackMessage,
      payload: dto.payload,
    });
  }

  async processQueue(businessId: string, actorUserId: string) {
    const queueItems = await this.repo.pullDueQueueItems(businessId, 200);
    queueItems.sort((a, b) => this.repo.priorityRank(b.priority) - this.repo.priorityRank(a.priority));

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let retry = 0;

    for (const item of queueItems) {
      processed += 1;
      await this.repo.updateQueueStatus(item.id, {
        status: NotificationDeliveryStatus.PROCESSING,
        processedAt: new Date(),
        updatedBy: actorUserId,
      });

      const delivery = await this.repo.createDelivery({
        businessId,
        queueId: item.id,
        channel: item.channel,
        recipient: item.recipient,
        status: NotificationDeliveryStatus.PROCESSING,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });

      const providerResponse = await this.providerSend(businessId, item.channel, {
        subject: item.subject,
        title: item.title,
        message: item.message,
        recipient: item.recipient,
        metadata: (item.metadata as Record<string, unknown> | null) ?? undefined,
      });

      if (providerResponse.ok) {
        const notification = await this.repo.createNotification({
          businessId,
          branchId: item.branchId,
          userId: item.userId,
          type: NotificationType.INFO,
          channel: item.channel,
          eventType: item.eventType,
          title: item.title,
          message: item.message,
          priority: item.priority,
          payload: (item.payload as Prisma.JsonObject | null) ?? undefined,
          templateId: item.templateId,
          queueId: item.id,
          deliveryStatus: NotificationDeliveryStatus.SENT,
          scheduledAt: item.scheduledAt,
          deliveredAt: new Date(),
          createdBy: actorUserId,
          updatedBy: actorUserId,
        });

        await this.repo.updateDelivery(delivery.id, {
          notificationId: notification.id,
          provider: providerResponse.provider,
          status: NotificationDeliveryStatus.SENT,
          responseCode: providerResponse.statusCode,
          responseBody: providerResponse.responseBody,
          deliveredAt: new Date(),
          updatedBy: actorUserId,
        });

        await this.repo.updateQueueStatus(item.id, {
          status: NotificationDeliveryStatus.SENT,
          processedAt: new Date(),
          updatedBy: actorUserId,
        });

        await this.repo.createAuditLog({
          businessId,
          queueId: item.id,
          action: "NOTIFICATION_SENT",
          actorUserId,
          details: {
            provider: providerResponse.provider,
            channel: item.channel,
            eventType: item.eventType,
          } as Prisma.JsonObject,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        });

        sent += 1;
      } else {
        const providerConfig = await this.resolveProviderConfig(businessId, item.channel);
        const retryDelaySeconds = Number(providerConfig["retryDelaySeconds"] ?? 60);
        const canRetry = item.retryCount + 1 < item.maxRetries;
        const nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1000);

        await this.repo.updateDelivery(delivery.id, {
          provider: providerResponse.provider,
          status: canRetry ? NotificationDeliveryStatus.RETRY : NotificationDeliveryStatus.FAILED,
          responseCode: providerResponse.statusCode,
          responseBody: providerResponse.responseBody,
          errorMessage: providerResponse.responseBody,
          updatedBy: actorUserId,
        });

        await this.repo.updateQueueStatus(item.id, {
          status: canRetry ? NotificationDeliveryStatus.RETRY : NotificationDeliveryStatus.FAILED,
          retryCount: { increment: 1 },
          nextRetryAt: canRetry ? nextRetryAt : null,
          lastError: providerResponse.responseBody,
          processedAt: new Date(),
          updatedBy: actorUserId,
        });

        await this.repo.createAuditLog({
          businessId,
          queueId: item.id,
          action: canRetry ? "NOTIFICATION_RETRY_SCHEDULED" : "NOTIFICATION_FAILED",
          actorUserId,
          details: {
            provider: providerResponse.provider,
            statusCode: providerResponse.statusCode,
            error: providerResponse.responseBody,
            nextRetryAt: canRetry ? nextRetryAt.toISOString() : null,
          } as Prisma.JsonObject,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        });

        if (canRetry) retry += 1;
        else failed += 1;
      }
    }

    return {
      processed,
      sent,
      failed,
      retry,
    };
  }

  private async processQueueForAllBusinesses() {
    if (this.processLock) return;
    this.processLock = true;

    try {
      const businesses = await this.repo.listActiveBusinesses(200);

      for (const b of businesses) {
        const reminders = await this.repo.pullDueReminders(b.id, 50);
        for (const r of reminders) {
          await this.enqueueCore(b.id, "system", {
            userId: r.userId ?? undefined,
            branchId: r.branchId ?? undefined,
            channel: NotificationChannel.IN_APP,
            eventType: r.eventType,
            priority: NotificationPriority.MEDIUM,
            title: r.title,
            message: r.message,
            payload: (r.payload as Record<string, unknown> | null) ?? undefined,
          });
          await this.repo.markReminderProcessed(r.id, "system");
        }

        const dueQueue = await this.repo.pullDueQueueItems(b.id, 100);
        if (dueQueue.length > 0) {
          await this.processQueue(b.id, "system");
        }
      }
    } catch {
      // ignore background cycle errors to keep server alive
    } finally {
      this.processLock = false;
    }
  }
}
