import { Injectable } from "@nestjs/common";
import { FileStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { FileQueryDto } from "./dto/documents.dto";

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  paginate(query: FileQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  getClient() {
    return this.prisma;
  }

  getBusinessConfiguration(businessId: string) {
    return this.prisma.businessConfiguration.findUnique({ where: { businessId } });
  }

  createFileObject(data: Prisma.FileObjectUncheckedCreateInput) {
    return this.prisma.fileObject.create({ data });
  }

  updateFileObject(id: string, data: Prisma.FileObjectUncheckedUpdateInput) {
    return this.prisma.fileObject.update({ where: { id }, data });
  }

  findFileObject(id: string) {
    return this.prisma.fileObject.findUnique({
      where: { id },
      include: {
        versions: { where: { deletedAt: null }, orderBy: { versionNo: "desc" }, take: 1 },
      },
    });
  }

  getLatestVersion(fileId: string) {
    return this.prisma.fileVersion.findFirst({
      where: { fileId, deletedAt: null },
      orderBy: { versionNo: "desc" },
    });
  }

  createFileVersion(data: Prisma.FileVersionUncheckedCreateInput) {
    return this.prisma.fileVersion.create({ data });
  }

  listFiles(where: Prisma.FileObjectWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.fileObject.count({ where }),
      this.prisma.fileObject.findMany({
        where,
        include: {
          versions: { where: { deletedAt: null }, orderBy: { versionNo: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createAttachment(data: Prisma.FileAttachmentUncheckedCreateInput) {
    return this.prisma.fileAttachment.create({ data, include: { file: true } });
  }

  listAttachments(where: Prisma.FileAttachmentWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.fileAttachment.count({ where }),
      this.prisma.fileAttachment.findMany({
        where,
        include: { file: { include: { versions: { where: { deletedAt: null }, orderBy: { versionNo: "desc" }, take: 1 } } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
  }

  createSignedUrl(data: Prisma.FileSignedUrlUncheckedCreateInput) {
    return this.prisma.fileSignedUrl.create({ data });
  }

  findSignedUrlByHash(tokenHash: string) {
    return this.prisma.fileSignedUrl.findUnique({
      where: { tokenHash },
      include: {
        file: {
          include: {
            versions: { where: { deletedAt: null }, orderBy: { versionNo: "desc" }, take: 1 },
          },
        },
      },
    });
  }

  updateSignedUrl(id: string, data: Prisma.FileSignedUrlUncheckedUpdateInput) {
    return this.prisma.fileSignedUrl.update({ where: { id }, data });
  }

  createAuditLog(data: Prisma.FileAuditLogUncheckedCreateInput) {
    return this.prisma.fileAuditLog.create({ data });
  }

  listAuditLogs(where: Prisma.FileAuditLogWhereInput, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.fileAuditLog.count({ where }),
      this.prisma.fileAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);
  }

  listVersions(fileId: string) {
    return this.prisma.fileVersion.findMany({
      where: { fileId, deletedAt: null },
      orderBy: { versionNo: "desc" },
    });
  }

  cleanupDeletedFiles(businessId: string, purgeBefore: Date) {
    return this.prisma.fileObject.findMany({
      where: {
        businessId,
        status: FileStatus.DELETED,
        updatedAt: { lte: purgeBefore },
        deletedAt: { not: null },
      },
      include: {
        versions: { where: { deletedAt: null } },
      },
    });
  }

  softDeleteFile(fileId: string, userId: string) {
    return this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        status: FileStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: userId,
        updatedBy: userId,
      },
    });
  }

  hardDeleteFile(fileId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.fileSignedUrl.deleteMany({ where: { fileId } });
      await tx.fileAttachment.deleteMany({ where: { fileId } });
      await tx.fileAuditLog.deleteMany({ where: { fileId } });
      await tx.fileVersion.deleteMany({ where: { fileId } });
      await tx.fileObject.delete({ where: { id: fileId } });
      return true;
    });
  }

  listBusinesses() {
    return this.prisma.business.findMany({ where: { deletedAt: null }, select: { id: true } });
  }

  getBackupSnapshot(businessId: string) {
    return this.prisma.$transaction([
      this.prisma.fileObject.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } }),
      this.prisma.fileVersion.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } }),
      this.prisma.fileAttachment.findMany({ where: { businessId }, orderBy: { createdAt: "asc" } }),
    ]);
  }

  async restoreBackup(
    businessId: string,
    userId: string,
    files: Prisma.FileObjectUncheckedCreateInput[],
    versions: Prisma.FileVersionUncheckedCreateInput[],
    attachments: Prisma.FileAttachmentUncheckedCreateInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      for (const f of files) {
        await tx.fileObject.upsert({
          where: { id: f.id },
          create: { ...f, businessId, createdBy: userId, updatedBy: userId },
          update: { ...f, businessId, updatedBy: userId },
        });
      }
      for (const v of versions) {
        await tx.fileVersion.upsert({
          where: { id: v.id },
          create: { ...v, businessId, createdBy: userId, updatedBy: userId },
          update: { ...v, businessId, updatedBy: userId },
        });
      }
      for (const a of attachments) {
        await tx.fileAttachment.upsert({
          where: { id: a.id },
          create: { ...a, businessId, createdBy: userId, updatedBy: userId },
          update: { ...a, businessId, updatedBy: userId },
        });
      }
      return true;
    });
  }

  fileWhere(businessId: string, query: FileQueryDto): Prisma.FileObjectWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
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
            versions: {
              some: {
                OR: [
                  { fileName: { contains: query.search, mode: "insensitive" } },
                  { mimeType: { contains: query.search, mode: "insensitive" } },
                ],
              },
            },
          }
        : {}),
    };
  }
}
