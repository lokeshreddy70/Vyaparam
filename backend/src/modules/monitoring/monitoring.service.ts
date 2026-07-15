import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  BackgroundJobPriority,
  BackgroundJobStatus,
  BackgroundJobType,
  Prisma,
} from "@prisma/client";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { cpus, loadavg, totalmem, freemem, uptime } from "node:os";
import { NotificationsService } from "../notifications/notifications.service";
import { DocumentsService } from "../documents/documents.service";
import { JobQueryDto, MonitorPageQueryDto, EnqueueJobDto, ProcessJobsDto } from "./dto/monitoring.dto";
import { MonitoringRepository } from "./monitoring.repository";

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private schedulerTimer: NodeJS.Timeout | null = null;
  private processorTimer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly repository: MonitoringRepository,
    private readonly notificationsService: NotificationsService,
    private readonly documentsService: DocumentsService,
  ) {}

  onModuleInit() {
    void this.repository
      .getClient()
      .backgroundJob.updateMany({
        where: { status: BackgroundJobStatus.RUNNING, deletedAt: null },
        data: {
          status: BackgroundJobStatus.RETRY,
          nextRetryAt: new Date(),
          lastError: "Recovered after process restart",
          updatedBy: "system",
        },
      })
      .catch(() => undefined);

    this.schedulerTimer = setInterval(() => {
      void this.enqueueScheduledJobsForAllBusinesses();
    }, 60 * 1000);

    this.processorTimer = setInterval(() => {
      void this.processJobsForAllBusinesses();
    }, 15 * 1000);
  }

  onModuleDestroy() {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    if (this.processorTimer) clearInterval(this.processorTimer);
    this.schedulerTimer = null;
    this.processorTimer = null;
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

  async enqueueJob(businessId: string, userId: string, dto: EnqueueJobDto) {
    return this.repository.createBackgroundJob({
      businessId,
      branchId: dto.branchId,
      type: dto.type,
      name: dto.name,
      status: BackgroundJobStatus.QUEUED,
      priority: dto.priority ?? BackgroundJobPriority.MEDIUM,
      payload: (dto.payload ?? {}) as Prisma.JsonObject,
      maxRetries: dto.maxRetries ?? 3,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async listJobs(businessId: string, query: JobQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const [count, items] = await this.repository.listJobs(this.repository.buildJobWhere(businessId, query), skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async listJobRuns(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.BackgroundJobRunWhereInput = {
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
            OR: [
              { errorMessage: { contains: query.search, mode: "insensitive" } },
              { job: { name: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repository.listJobRuns(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  private async runJob(job: {
    id: string;
    businessId: string;
    type: BackgroundJobType;
    payload: Prisma.JsonValue | null;
    createdBy: string | null;
  }) {
    if (job.type === BackgroundJobType.CLEANUP) {
      const result = await this.documentsService.cleanup(job.businessId, job.createdBy ?? "system", {
        purgeDeletedOlderThanDays: 30,
      });
      return { type: job.type, ...result };
    }

    if (job.type === BackgroundJobType.BACKUP) {
      const backup = await this.documentsService.exportBackup(job.businessId);
      return {
        type: job.type,
        files: backup.files.length,
        versions: backup.versions.length,
        attachments: backup.attachments.length,
      };
    }

    if (job.type === BackgroundJobType.NOTIFICATION) {
      const result = await this.notificationsService.processQueue(job.businessId, job.createdBy ?? "system");
      return { type: job.type, ...result };
    }

    if (job.type === BackgroundJobType.AUDIT_ROLLUP) {
      const perf = await this.repository.summarizePerformance(job.businessId);
      const failedLogins = await this.repository.countFailedLogins(job.businessId);
      await this.repository.getClient().activityLog.create({
        data: {
          businessId: job.businessId,
          activity: "AUDIT_ROLLUP",
          metadata: {
            totalRequests: perf._count._all,
            avgDurationMs: perf._avg.durationMs,
            maxDurationMs: perf._max.durationMs,
            failedLogins,
          },
          createdBy: "system",
          updatedBy: "system",
        },
      });
      return {
        type: job.type,
        totalRequests: perf._count._all,
        failedLogins,
      };
    }

    const payload = (job.payload as Record<string, unknown> | null) ?? {};
    await this.repository.getClient().activityLog.create({
      data: {
        businessId: job.businessId,
        activity: "CUSTOM_JOB_EXECUTED",
        metadata: payload as Prisma.InputJsonValue,
        createdBy: job.createdBy ?? "system",
        updatedBy: job.createdBy ?? "system",
      },
    });

    return {
      type: job.type,
      executed: true,
      payload,
    };
  }

  async processJobs(businessId: string, actorUserId: string, take = 100) {
    const jobs = await this.repository.pullDueJobs(businessId, take);

    let processed = 0;
    let success = 0;
    let failed = 0;
    let retry = 0;

    for (const job of jobs) {
      processed += 1;
      await this.repository.updateBackgroundJob(job.id, {
        status: BackgroundJobStatus.RUNNING,
        startedAt: new Date(),
        updatedBy: actorUserId,
      });

      const started = Date.now();
      const run = await this.repository.createBackgroundJobRun({
        businessId,
        jobId: job.id,
        status: BackgroundJobStatus.RUNNING,
        startedAt: new Date(),
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });

      try {
        const result = await this.runJob({
          id: job.id,
          businessId,
          type: job.type,
          payload: job.payload,
          createdBy: job.createdBy,
        });

        await this.repository.updateBackgroundJob(job.id, {
          status: BackgroundJobStatus.SUCCESS,
          result: result as Prisma.JsonObject,
          finishedAt: new Date(),
          lastError: null,
          updatedBy: actorUserId,
        });

        await this.repository.updateBackgroundJobRun(run.id, {
          status: BackgroundJobStatus.SUCCESS,
          result: result as Prisma.JsonObject,
          durationMs: Date.now() - started,
          finishedAt: new Date(),
          updatedBy: actorUserId,
        });

        success += 1;
      } catch (error: any) {
        const canRetry = job.retryCount + 1 < job.maxRetries;
        const retryDelaySeconds = Math.min(300, 15 * Math.max(1, job.retryCount + 1));
        const nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1000);
        const message = String(error?.message ?? "job failed");

        await this.repository.updateBackgroundJob(job.id, {
          status: canRetry ? BackgroundJobStatus.RETRY : BackgroundJobStatus.FAILED,
          retryCount: { increment: 1 },
          nextRetryAt: canRetry ? nextRetryAt : null,
          finishedAt: new Date(),
          lastError: message,
          updatedBy: actorUserId,
        });

        await this.repository.updateBackgroundJobRun(run.id, {
          status: canRetry ? BackgroundJobStatus.RETRY : BackgroundJobStatus.FAILED,
          durationMs: Date.now() - started,
          finishedAt: new Date(),
          errorMessage: message,
          updatedBy: actorUserId,
        });

        if (!canRetry) {
          await this.repository.getClient().activityLog.create({
            data: {
              businessId,
              branchId: job.branchId,
              userId: actorUserId,
              activity: "DEAD_LETTER_READY",
              metadata: {
                jobId: job.id,
                type: job.type,
                error: message,
              },
              createdBy: actorUserId,
              updatedBy: actorUserId,
            },
          });
        }

        if (canRetry) retry += 1;
        else failed += 1;
      }
    }

    return { processed, success, failed, retry };
  }

  private async enqueueScheduledJobsForAllBusinesses() {
    if (this.processing) return;
    this.processing = true;
    try {
      const businesses = await this.repository.listBusinesses();
      for (const business of businesses) {
        await this.repository.enqueueIfMissingScheduledJob(
          business.id,
          BackgroundJobType.NOTIFICATION,
          "notification-scheduler",
          1,
        );
        await this.repository.enqueueIfMissingScheduledJob(
          business.id,
          BackgroundJobType.CLEANUP,
          "automatic-cleanup",
          60,
        );
        await this.repository.enqueueIfMissingScheduledJob(
          business.id,
          BackgroundJobType.BACKUP,
          "backup-scheduler",
          720,
        );
        await this.repository.enqueueIfMissingScheduledJob(
          business.id,
          BackgroundJobType.AUDIT_ROLLUP,
          "audit-rollup",
          15,
        );
      }
    } finally {
      this.processing = false;
    }
  }

  private async processJobsForAllBusinesses() {
    if (this.processing) return;
    this.processing = true;
    try {
      const businesses = await this.repository.listBusinesses();
      for (const business of businesses) {
        await this.processJobs(business.id, "system", 100);
      }
    } finally {
      this.processing = false;
    }
  }

  async triggerProcessor(businessId: string, actorUserId: string, dto: ProcessJobsDto) {
    return this.processJobs(businessId, actorUserId, dto.take ?? 100);
  }

  async getHealth(businessId: string) {
    const dbStart = Date.now();
    let database = { ok: true, latencyMs: 0 };
    try {
      await this.repository.getClient().$queryRaw`SELECT 1`;
      database = { ok: true, latencyMs: Date.now() - dbStart };
    } catch {
      database = { ok: false, latencyMs: Date.now() - dbStart };
    }

    let storage = { ok: true };
    try {
      const testPath = join(process.cwd(), "uploads", "healthcheck.tmp");
      await fs.mkdir(join(process.cwd(), "uploads"), { recursive: true });
      await fs.writeFile(testPath, String(Date.now()));
      await fs.unlink(testPath);
      storage = { ok: true };
    } catch {
      storage = { ok: false };
    }

    const cfg = await this.repository.getClient().businessConfiguration.findUnique({ where: { businessId } });
    const redisConfig = (cfg?.securitySettings as Record<string, unknown> | null) ?? {};
    const cache = {
      ok: redisConfig.cacheEnabled !== false,
      configured: redisConfig.cacheEnabled === true,
    };

    return {
      status: database.ok && storage.ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      database,
      storage,
      cache,
    };
  }

  async getSystemMetrics(businessId: string, query: MonitorPageQueryDto) {
    const perf = await this.repository.summarizePerformance(businessId, query.fromDate, query.toDate);
    const failedLogins = await this.repository.countFailedLogins(businessId, query.fromDate, query.toDate);

    const memTotal = totalmem();
    const memFree = freemem();
    const memUsed = memTotal - memFree;
    const cpuCount = cpus().length;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: uptime(),
      memory: {
        total: memTotal,
        free: memFree,
        used: memUsed,
        usedPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 10000) / 100 : 0,
        process: process.memoryUsage(),
      },
      cpu: {
        cores: cpuCount,
        loadAvg: loadavg(),
        processCpuUsage: process.cpuUsage(),
      },
      performance: {
        totalRequests: perf._count._all,
        avgDurationMs: perf._avg.durationMs ?? 0,
        maxDurationMs: perf._max.durationMs ?? 0,
      },
      security: {
        failedLogins,
      },
    };
  }

  async getJobDashboard(businessId: string) {
    const [queued, running, success, failed, retry] = await Promise.all([
      this.repository.getClient().backgroundJob.count({ where: { businessId, status: BackgroundJobStatus.QUEUED, deletedAt: null } }),
      this.repository.getClient().backgroundJob.count({ where: { businessId, status: BackgroundJobStatus.RUNNING, deletedAt: null } }),
      this.repository.getClient().backgroundJob.count({ where: { businessId, status: BackgroundJobStatus.SUCCESS, deletedAt: null } }),
      this.repository.getClient().backgroundJob.count({ where: { businessId, status: BackgroundJobStatus.FAILED, deletedAt: null } }),
      this.repository.getClient().backgroundJob.count({ where: { businessId, status: BackgroundJobStatus.RETRY, deletedAt: null } }),
    ]);

    const recentRuns = await this.repository.getClient().backgroundJobRun.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { job: true },
    });

    return {
      summary: { queued, running, success, failed, retry },
      recentRuns,
    };
  }

  async getApiRequestLogs(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.ApiRequestLogWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
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
              { path: { contains: query.search, mode: "insensitive" } },
              { method: { contains: query.search, mode: "insensitive" } },
              { correlationId: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repository.listApiRequestLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getApiErrorLogs(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.ApiErrorLogWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
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
              { path: { contains: query.search, mode: "insensitive" } },
              { message: { contains: query.search, mode: "insensitive" } },
              { correlationId: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repository.listApiErrorLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getAuditLogs(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.AuditLogWhereInput = {
      businessId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
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
    const [count, items] = await this.repository.listAuditLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getActivityLogs(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.ActivityLogWhereInput = {
      businessId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            createdAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.search ? { activity: { contains: query.search, mode: "insensitive" } } : {}),
    };
    const [count, items] = await this.repository.listActivityLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getLoginHistory(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.SessionWhereInput = {
      businessId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
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
              { ipAddress: { contains: query.search, mode: "insensitive" } },
              { userAgent: { contains: query.search, mode: "insensitive" } },
              { user: { email: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repository.listSessions(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getFailedLoginHistory(businessId: string, query: MonitorPageQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.AuditLogWhereInput = {
      businessId,
      action: "LOGIN_FAILED",
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
              { entityType: { contains: query.search, mode: "insensitive" } },
              { user: { email: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [count, items] = await this.repository.listAuditLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }
}
