import { Injectable } from "@nestjs/common";
import {
  BackgroundJobPriority,
  BackgroundJobStatus,
  BackgroundJobType,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { JobQueryDto, MonitorPageQueryDto } from "./dto/monitoring.dto";

@Injectable()
export class MonitoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  getClient() {
    return this.prisma;
  }

  paginate(query: MonitorPageQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  createBackgroundJob(data: Prisma.BackgroundJobUncheckedCreateInput) {
    return this.prisma.backgroundJob.create({ data });
  }

  updateBackgroundJob(id: string, data: Prisma.BackgroundJobUncheckedUpdateInput) {
    return this.prisma.backgroundJob.update({ where: { id }, data });
  }

  findBackgroundJob(id: string) {
    return this.prisma.backgroundJob.findUnique({ where: { id } });
  }

  createBackgroundJobRun(data: Prisma.BackgroundJobRunUncheckedCreateInput) {
    return this.prisma.backgroundJobRun.create({ data });
  }

  updateBackgroundJobRun(id: string, data: Prisma.BackgroundJobRunUncheckedUpdateInput) {
    return this.prisma.backgroundJobRun.update({ where: { id }, data });
  }

  listJobs(where: Prisma.BackgroundJobWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.backgroundJob.count({ where }),
      this.prisma.backgroundJob.findMany({ where, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], skip, take }),
    ]);
  }

  listJobRuns(where: Prisma.BackgroundJobRunWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.backgroundJobRun.count({ where }),
      this.prisma.backgroundJobRun.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  pullDueJobs(businessId: string, take = 100) {
    return this.prisma.backgroundJob.findMany({
      where: {
        businessId,
        deletedAt: null,
        OR: [{ status: BackgroundJobStatus.QUEUED }, { status: BackgroundJobStatus.RETRY }],
        AND: [
          { OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
          { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take,
    });
  }

  listBusinesses() {
    return this.prisma.business.findMany({ where: { deletedAt: null }, select: { id: true } });
  }

  listApiRequestLogs(where: Prisma.ApiRequestLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.apiRequestLog.count({ where }),
      this.prisma.apiRequestLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  listApiErrorLogs(where: Prisma.ApiErrorLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.apiErrorLog.count({ where }),
      this.prisma.apiErrorLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  listAuditLogs(where: Prisma.AuditLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  listActivityLogs(where: Prisma.ActivityLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  listSessions(where: Prisma.SessionWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({ where, include: { user: true }, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  summarizePerformance(businessId: string, fromDate?: string, toDate?: string) {
    return this.prisma.apiRequestLog.aggregate({
      where: {
        businessId,
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: new Date(fromDate) } : {}),
                ...(toDate ? { lte: new Date(toDate) } : {}),
              },
            }
          : {}),
      },
      _avg: { durationMs: true },
      _max: { durationMs: true },
      _count: { _all: true },
    });
  }

  countFailedLogins(businessId: string, fromDate?: string, toDate?: string) {
    return this.prisma.auditLog.count({
      where: {
        businessId,
        action: "LOGIN_FAILED",
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: new Date(fromDate) } : {}),
                ...(toDate ? { lte: new Date(toDate) } : {}),
              },
            }
          : {}),
      },
    });
  }

  async enqueueIfMissingScheduledJob(
    businessId: string,
    type: BackgroundJobType,
    name: string,
    scheduleMinutes: number,
  ) {
    const threshold = new Date(Date.now() - scheduleMinutes * 60 * 1000);
    const existing = await this.prisma.backgroundJob.findFirst({
      where: {
        businessId,
        type,
        name,
        status: { in: [BackgroundJobStatus.QUEUED, BackgroundJobStatus.RUNNING, BackgroundJobStatus.RETRY] },
        createdAt: { gte: threshold },
        deletedAt: null,
      },
    });

    if (existing) return existing;

    return this.prisma.backgroundJob.create({
      data: {
        businessId,
        type,
        name,
        status: BackgroundJobStatus.QUEUED,
        priority: BackgroundJobPriority.MEDIUM,
        scheduledAt: new Date(),
        maxRetries: 3,
        payload: {},
        createdBy: "system",
        updatedBy: "system",
      },
    });
  }

  buildJobWhere(businessId: string, query: JobQueryDto): Prisma.BackgroundJobWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
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
              { name: { contains: query.search, mode: "insensitive" } },
              { lastError: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  }
}
