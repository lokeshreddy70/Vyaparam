import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  StreamableFile,
} from "@nestjs/common";
import {
  FileCategory,
  FileStatus,
  FileVisibility,
  Prisma,
  StorageProvider,
} from "@prisma/client";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Jimp } from "jimp";
import {
  AttachFileDto,
  CleanupDto,
  FileQueryDto,
  GenerateCodeDto,
  GeneratePdfDto,
  RestoreBackupDto,
  SignedUrlRequestDto,
  UploadFileMetaDto,
} from "./dto/documents.dto";
import { DocumentsRepository } from "./documents.repository";
import { LocalStorageProvider } from "./storage/local-storage.provider";
import { FileStorageProvider } from "./storage/storage-provider.interface";

const bwipjs = require("bwip-js");

@Injectable()
export class DocumentsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: DocumentsRepository,
    private readonly localStorageProvider: LocalStorageProvider,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      void this.runAutomaticCleanup();
    }, 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
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

  private getStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.map((x) => String(x));
  }

  private getStorageProviderFromConfig(fileStorageConfiguration: unknown): StorageProvider {
    const config = (fileStorageConfiguration as Record<string, unknown> | null) ?? {};
    const providerRaw = String(config.provider ?? "LOCAL").toUpperCase();
    if (providerRaw === "S3") return StorageProvider.S3;
    if (providerRaw === "R2") return StorageProvider.R2;
    if (providerRaw === "AZURE_BLOB") return StorageProvider.AZURE_BLOB;
    if (providerRaw === "GCS") return StorageProvider.GCS;
    return StorageProvider.LOCAL;
  }

  private getMaxFileSize(fileStorageConfiguration: unknown): number {
    const config = (fileStorageConfiguration as Record<string, unknown> | null) ?? {};
    const maxMb = Number(config.maxFileSizeMb ?? 25);
    return Math.max(1, maxMb) * 1024 * 1024;
  }

  private getAllowedMimeTypes(fileStorageConfiguration: unknown): string[] {
    const config = (fileStorageConfiguration as Record<string, unknown> | null) ?? {};
    const defaults = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/json",
      "application/octet-stream",
    ];
    const custom = this.getStringArray(config.allowedMimeTypes);
    return custom.length ? custom : defaults;
  }

  private async resolveStorageProvider(businessId: string): Promise<{
    providerType: StorageProvider;
    provider: FileStorageProvider;
    bucket?: string;
  }> {
    const cfg = await this.repository.getBusinessConfiguration(businessId);
    const providerType = this.getStorageProviderFromConfig(cfg?.fileStorageConfiguration);
    const fsConfig = (cfg?.fileStorageConfiguration as Record<string, unknown> | null) ?? {};

    if (providerType === StorageProvider.LOCAL) {
      return {
        providerType,
        provider: this.localStorageProvider,
      };
    }

    const notReadyProvider: FileStorageProvider = {
      provider: providerType,
      putObject: async () => {
        throw new BadRequestException(`${providerType} storage provider is not configured for runtime in this environment`);
      },
      getObject: async () => {
        throw new BadRequestException(`${providerType} storage provider is not configured for runtime in this environment`);
      },
      deleteObject: async () => {
        throw new BadRequestException(`${providerType} storage provider is not configured for runtime in this environment`);
      },
    };

    return {
      providerType,
      provider: notReadyProvider,
      bucket: typeof fsConfig.bucket === "string" ? fsConfig.bucket : undefined,
    };
  }

  private buildObjectKey(
    businessId: string,
    fileId: string,
    versionNo: number,
    category: FileCategory,
    fileName: string,
    entityType?: string,
    entityId?: string,
  ) {
    const ext = extname(fileName).toLowerCase();
    const cleanEntityType = (entityType ?? "general").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanEntityId = (entityId ?? "general").replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${businessId}/${category}/${cleanEntityType}/${cleanEntityId}/${fileId}/v${versionNo}_${Date.now()}_${randomUUID()}${ext}`;
  }

  private async virusScanReadyCheck(
    businessId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<"CLEAN" | "SKIPPED"> {
    const cfg = await this.repository.getBusinessConfiguration(businessId);
    const fileCfg = (cfg?.fileStorageConfiguration as Record<string, unknown> | null) ?? {};
    const enabled = fileCfg.virusScanEnabled === true;
    const mode = String(fileCfg.virusScanMode ?? "READY").toUpperCase();

    if (!enabled) return "SKIPPED";

    await this.repository.createAuditLog({
      businessId,
      action: "FILE_VIRUS_SCAN_READY_HOOK",
      actorUserId: userId,
      details: {
        mode,
        fileName: file.originalname,
        sizeBytes: file.size,
      } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return "CLEAN";
  }

  private async maybeCompressAndThumb(buffer: Buffer, mimeType: string) {
    if (!mimeType.startsWith("image/")) {
      return {
        uploadBuffer: buffer,
        thumbnail: undefined as Buffer | undefined,
        width: undefined as number | undefined,
        height: undefined as number | undefined,
        isCompressed: false,
      };
    }

    const image = await Jimp.read(buffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    const compressed = image.clone();
    const compressedBuffer = await compressed.getBuffer(mimeType === "image/png" ? "image/png" : "image/jpeg");

    const thumb = image.clone();
    thumb.cover({ w: 256, h: 256 });
    const thumbBuffer = await thumb.getBuffer("image/jpeg");

    return {
      uploadBuffer: compressedBuffer.length < buffer.length ? compressedBuffer : buffer,
      thumbnail: thumbBuffer,
      width,
      height,
      isCompressed: compressedBuffer.length < buffer.length,
    };
  }

  private ensureFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("file is required");
    if (!file.buffer || !file.size) throw new BadRequestException("invalid file payload");
  }

  async uploadFile(businessId: string, userId: string, file: Express.Multer.File, meta: UploadFileMetaDto) {
    this.ensureFile(file);

    const cfg = await this.repository.getBusinessConfiguration(businessId);
    const maxSize = this.getMaxFileSize(cfg?.fileStorageConfiguration);
    const allowedTypes = this.getAllowedMimeTypes(cfg?.fileStorageConfiguration);

    if (file.size > maxSize) {
      throw new BadRequestException(`file too large. max bytes: ${maxSize}`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException("mime type not allowed");
    }

    const scanStatus = await this.virusScanReadyCheck(businessId, file, userId);
    const { providerType, provider, bucket } = await this.resolveStorageProvider(businessId);

    const fileObject = await this.repository.createFileObject({
      businessId,
      branchId: meta.branchId,
      category: meta.category,
      entityType: meta.entityType,
      entityId: meta.entityId,
      visibility: meta.visibility ?? FileVisibility.PRIVATE,
      status: FileStatus.ACTIVE,
      storageProvider: providerType,
      latestVersion: 1,
      metadata: (meta.metadata ?? {}) as Prisma.JsonObject,
      tags: this.getStringArray(meta.tags) as unknown as Prisma.InputJsonValue,
      virusScanStatus: scanStatus,
      createdBy: userId,
      updatedBy: userId,
    });

    const latest = await this.repository.getLatestVersion(fileObject.id);
    const versionNo = latest ? latest.versionNo + 1 : 1;

    const prepared = await this.maybeCompressAndThumb(file.buffer, file.mimetype);
    const objectKey = this.buildObjectKey(
      businessId,
      fileObject.id,
      versionNo,
      meta.category,
      file.originalname,
      meta.entityType,
      meta.entityId,
    );

    const stored = await provider.putObject({
      businessId,
      objectKey,
      buffer: prepared.uploadBuffer,
      contentType: file.mimetype,
    });

    let thumbKey: string | undefined;
    if (prepared.thumbnail) {
      thumbKey = `${objectKey}.thumb.jpg`;
      await provider.putObject({
        businessId,
        objectKey: thumbKey,
        buffer: prepared.thumbnail,
        contentType: "image/jpeg",
      });
    }

    const checksum = createHash("sha256").update(prepared.uploadBuffer).digest("hex");

    const version = await this.repository.createFileVersion({
      fileId: fileObject.id,
      businessId,
      versionNo,
      storageProvider: providerType,
      bucket,
      objectKey: stored.objectKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      extension: extname(file.originalname).toLowerCase(),
      sizeBytes: prepared.uploadBuffer.length,
      checksum,
      width: prepared.width,
      height: prepared.height,
      thumbnailObjectKey: thumbKey,
      isCompressed: prepared.isCompressed,
      createdBy: userId,
      updatedBy: userId,
    });

    const updatedObject = await this.repository.updateFileObject(fileObject.id, {
      latestVersion: versionNo,
      isCompressed: prepared.isCompressed,
      hasThumbnail: Boolean(thumbKey),
      updatedBy: userId,
    });

    await this.repository.createAuditLog({
      businessId,
      fileId: fileObject.id,
      action: "FILE_UPLOADED",
      actorUserId: userId,
      details: {
        category: meta.category,
        fileName: file.originalname,
        sizeBytes: prepared.uploadBuffer.length,
        mimeType: file.mimetype,
        provider: providerType,
      } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return {
      file: updatedObject,
      version,
    };
  }

  async uploadMultiple(businessId: string, userId: string, files: Express.Multer.File[], meta: UploadFileMetaDto) {
    if (!files?.length) throw new BadRequestException("files are required");
    const results: Array<Awaited<ReturnType<DocumentsService["uploadFile"]>>> = [];
    for (const f of files) {
      results.push(await this.uploadFile(businessId, userId, f, meta));
    }
    return { count: results.length, results };
  }

  async getFile(businessId: string, fileId: string) {
    const file = await this.repository.findFileObject(fileId);
    if (!file || file.businessId !== businessId || file.deletedAt) {
      throw new NotFoundException("file not found");
    }
    return file;
  }

  async listFiles(businessId: string, query: FileQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where = this.repository.fileWhere(businessId, query);
    const [count, items] = await this.repository.listFiles(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async getVersions(businessId: string, fileId: string) {
    const file = await this.getFile(businessId, fileId);
    return {
      fileId: file.id,
      versions: await this.repository.listVersions(file.id),
    };
  }

  async createSignedUrl(businessId: string, userId: string, fileId: string, dto: SignedUrlRequestDto) {
    const file = await this.getFile(businessId, fileId);
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + (dto.expiresInMinutes ?? 30) * 60_000);

    await this.repository.createSignedUrl({
      businessId,
      fileId: file.id,
      tokenHash,
      expiresAt,
      maxDownloads: dto.maxDownloads ?? 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.repository.createAuditLog({
      businessId,
      fileId,
      action: "FILE_SIGNED_URL_CREATED",
      actorUserId: userId,
      details: { expiresAt: expiresAt.toISOString() } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return {
      token,
      expiresAt,
      downloadUrl: `/api/v1/documents/public/signed/${token}`,
    };
  }

  private async readByFileObject(file: Awaited<ReturnType<DocumentsService["getFile"]>>) {
    const latest = file.versions[0] ?? (await this.repository.getLatestVersion(file.id));
    if (!latest) throw new NotFoundException("file version not found");

    const { provider } = await this.resolveStorageProvider(file.businessId);
    const data = await provider.getObject({
      businessId: file.businessId,
      objectKey: latest.objectKey,
    });

    return {
      file,
      version: latest,
      buffer: data.buffer,
    };
  }

  async downloadFile(businessId: string, fileId: string) {
    const file = await this.getFile(businessId, fileId);
    const data = await this.readByFileObject(file);
    return {
      fileName: data.version.fileName,
      mimeType: data.version.mimeType,
      stream: new StreamableFile(data.buffer),
    };
  }

  async downloadBySignedToken(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const signed = await this.repository.findSignedUrlByHash(tokenHash);
    if (!signed || signed.deletedAt) throw new NotFoundException("signed url not found");
    if (signed.expiresAt.getTime() < Date.now()) throw new BadRequestException("signed url expired");
    if (signed.downloadCount >= signed.maxDownloads) {
      throw new BadRequestException("signed url download limit exceeded");
    }

    await this.repository.updateSignedUrl(signed.id, {
      downloadCount: { increment: 1 },
      usedAt: new Date(),
    });

    const file = signed.file;
    if (!file || file.deletedAt) throw new NotFoundException("file not found");

    const data = await this.readByFileObject(file as any);
    return {
      fileName: data.version.fileName,
      mimeType: data.version.mimeType,
      stream: new StreamableFile(data.buffer),
    };
  }

  async attachFile(businessId: string, userId: string, dto: AttachFileDto) {
    await this.getFile(businessId, dto.fileId);
    const created = await this.repository.createAttachment({
      businessId,
      branchId: dto.branchId,
      fileId: dto.fileId,
      module: dto.module,
      recordId: dto.recordId,
      label: dto.label,
      metadata: (dto.metadata ?? {}) as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.repository.createAuditLog({
      businessId,
      fileId: dto.fileId,
      action: "FILE_ATTACHED",
      actorUserId: userId,
      details: { module: dto.module, recordId: dto.recordId } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return created;
  }

  async listAttachments(businessId: string, query: FileQueryDto, module?: string, recordId?: string) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.FileAttachmentWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(module ? { module } : {}),
      ...(recordId ? { recordId } : {}),
    };
    const [count, items] = await this.repository.listAttachments(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  private async storeGeneratedBuffer(
    businessId: string,
    userId: string,
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    category: FileCategory,
    branchId?: string,
    entityType?: string,
    entityId?: string,
  ) {
    const file: Express.Multer.File = {
      fieldname: "file",
      originalname: fileName,
      encoding: "7bit",
      mimetype: mimeType,
      size: buffer.length,
      destination: "",
      filename: fileName,
      path: "",
      buffer,
      stream: undefined as any,
    };

    return this.uploadFile(businessId, userId, file, {
      category,
      branchId,
      entityType,
      entityId,
      visibility: FileVisibility.PRIVATE,
      metadata: { generated: true },
    });
  }

  async generatePdf(businessId: string, userId: string, category: FileCategory, dto: GeneratePdfDto) {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (c) => chunks.push(c));

    const payload = dto.payload ?? {};
    doc.fontSize(18).text(dto.title, { align: "left" });
    if (dto.subtitle) {
      doc.moveDown(0.3).fontSize(12).text(dto.subtitle, { align: "left" });
    }
    doc.moveDown(1);
    doc.fontSize(10).text(`Generated At: ${new Date().toISOString()}`);
    doc.moveDown(0.6);

    for (const [k, v] of Object.entries(payload)) {
      doc.fontSize(10).text(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
      doc.moveDown(0.2);
    }

    doc.end();

    const buffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const fileName = `${category.toLowerCase()}_${Date.now()}.pdf`;
    return this.storeGeneratedBuffer(
      businessId,
      userId,
      buffer,
      fileName,
      "application/pdf",
      category,
      dto.branchId,
      dto.entityType,
      dto.entityId,
    );
  }

  async generateBarcode(businessId: string, userId: string, dto: GenerateCodeDto) {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      text: dto.data,
      scale: 3,
      height: Math.max(10, Math.floor((dto.height ?? 256) / 8)),
      includetext: true,
      textxalign: "center",
    });

    const fileName = `barcode_${Date.now()}.png`;
    return this.storeGeneratedBuffer(
      businessId,
      userId,
      png,
      fileName,
      "image/png",
      FileCategory.BARCODE,
      dto.branchId,
      dto.entityType,
      dto.entityId,
    );
  }

  async generateQrCode(businessId: string, userId: string, dto: GenerateCodeDto) {
    const png = await QRCode.toBuffer(dto.data, {
      width: dto.width ?? 512,
      errorCorrectionLevel: "M",
      margin: 1,
    });

    const fileName = `qrcode_${Date.now()}.png`;
    return this.storeGeneratedBuffer(
      businessId,
      userId,
      png,
      fileName,
      "image/png",
      FileCategory.QR_CODE,
      dto.branchId,
      dto.entityType,
      dto.entityId,
    );
  }

  async listAuditLogs(businessId: string, query: FileQueryDto) {
    const { page, limit, skip } = this.repository.paginate(query);
    const where: Prisma.FileAuditLogWhereInput = {
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
      ...(query.search ? { action: { contains: query.search, mode: "insensitive" } } : {}),
    };
    const [count, items] = await this.repository.listAuditLogs(where, skip, limit);
    return this.pageResult(count, items, page, limit);
  }

  async softDeleteFile(businessId: string, userId: string, fileId: string) {
    const file = await this.getFile(businessId, fileId);
    await this.repository.softDeleteFile(file.id, userId);
    await this.repository.createAuditLog({
      businessId,
      fileId,
      action: "FILE_SOFT_DELETED",
      actorUserId: userId,
      details: {} as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });
    return { success: true };
  }

  async cleanup(businessId: string, userId: string, dto: CleanupDto) {
    const days = dto.purgeDeletedOlderThanDays ?? 30;
    const purgeBefore = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const files = await this.repository.cleanupDeletedFiles(businessId, purgeBefore);

    let deleted = 0;
    for (const f of files) {
      const { provider } = await this.resolveStorageProvider(businessId);
      for (const v of f.versions) {
        await provider.deleteObject({ businessId, objectKey: v.objectKey });
        if (v.thumbnailObjectKey) {
          await provider.deleteObject({ businessId, objectKey: v.thumbnailObjectKey });
        }
      }
      await this.repository.hardDeleteFile(f.id);
      deleted += 1;
    }

    await this.repository.getClient().fileSignedUrl.deleteMany({
      where: {
        businessId,
        OR: [{ expiresAt: { lt: new Date() } }, { file: { status: FileStatus.DELETED } }],
      },
    });

    await this.repository.createAuditLog({
      businessId,
      action: "FILE_CLEANUP_COMPLETED",
      actorUserId: userId,
      details: { deleted } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return { deleted };
  }

  async exportBackup(businessId: string) {
    const [files, versions, attachments] = await this.repository.getBackupSnapshot(businessId);
    return {
      generatedAt: new Date().toISOString(),
      businessId,
      files,
      versions,
      attachments,
    };
  }

  async restoreBackup(businessId: string, userId: string, dto: RestoreBackupDto) {
    const files = (dto.files ?? []) as unknown as Prisma.FileObjectUncheckedCreateInput[];
    const versions = (dto.versions ?? []) as unknown as Prisma.FileVersionUncheckedCreateInput[];
    const attachments = (dto.attachments ?? []) as unknown as Prisma.FileAttachmentUncheckedCreateInput[];
    await this.repository.restoreBackup(businessId, userId, files, versions, attachments);

    await this.repository.createAuditLog({
      businessId,
      action: "FILE_BACKUP_RESTORED",
      actorUserId: userId,
      details: { files: files.length, versions: versions.length, attachments: attachments.length } as Prisma.JsonObject,
      createdBy: userId,
      updatedBy: userId,
    });

    return { restored: true, files: files.length, versions: versions.length, attachments: attachments.length };
  }

  private async runAutomaticCleanup() {
    try {
      const businesses = await this.repository.listBusinesses();
      for (const b of businesses) {
        await this.cleanup(b.id, "system", { purgeDeletedOlderThanDays: 30 });
      }
    } catch {
      // keep scheduler resilient
    }
  }
}
