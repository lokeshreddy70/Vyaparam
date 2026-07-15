-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('COMPANY_LOGO', 'PRODUCT_IMAGE', 'EMPLOYEE_PHOTO', 'CUSTOMER_DOCUMENT', 'SUPPLIER_DOCUMENT', 'INVOICE_PDF', 'QUOTATION_PDF', 'PURCHASE_PDF', 'RECEIPT_PDF', 'BARCODE', 'QR_CODE', 'ATTACHMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'R2', 'AZURE_BLOB', 'GCS');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PRIVATE', 'BUSINESS', 'PUBLIC');

-- CreateTable
CREATE TABLE "file_objects" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "category" "FileCategory" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "FileStatus" NOT NULL DEFAULT 'ACTIVE',
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "latestVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "tags" JSONB,
    "virusScanStatus" TEXT DEFAULT 'PENDING',
    "isCompressed" BOOLEAN NOT NULL DEFAULT false,
    "hasThumbnail" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_versions" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "bucket" TEXT,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailObjectKey" TEXT,
    "isCompressed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "fileId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "label" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_signed_urls" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxDownloads" INTEGER NOT NULL DEFAULT 1,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_signed_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_audit_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fileId" TEXT,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "details" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_objects_businessId_category_entityType_entityId_delete_idx" ON "file_objects"("businessId", "category", "entityType", "entityId", "deletedAt");

-- CreateIndex
CREATE INDEX "file_objects_businessId_status_createdAt_idx" ON "file_objects"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "file_objects_businessId_branchId_createdAt_idx" ON "file_objects"("businessId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "file_versions_businessId_fileId_createdAt_idx" ON "file_versions"("businessId", "fileId", "createdAt");

-- CreateIndex
CREATE INDEX "file_versions_businessId_objectKey_idx" ON "file_versions"("businessId", "objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_fileId_versionNo_key" ON "file_versions"("fileId", "versionNo");

-- CreateIndex
CREATE INDEX "file_attachments_businessId_module_recordId_deletedAt_idx" ON "file_attachments"("businessId", "module", "recordId", "deletedAt");

-- CreateIndex
CREATE INDEX "file_attachments_businessId_fileId_deletedAt_idx" ON "file_attachments"("businessId", "fileId", "deletedAt");

-- CreateIndex
CREATE INDEX "file_signed_urls_businessId_fileId_expiresAt_idx" ON "file_signed_urls"("businessId", "fileId", "expiresAt");

-- CreateIndex
CREATE INDEX "file_signed_urls_businessId_expiresAt_usedAt_idx" ON "file_signed_urls"("businessId", "expiresAt", "usedAt");

-- CreateIndex
CREATE UNIQUE INDEX "file_signed_urls_tokenHash_key" ON "file_signed_urls"("tokenHash");

-- CreateIndex
CREATE INDEX "file_audit_logs_businessId_fileId_createdAt_idx" ON "file_audit_logs"("businessId", "fileId", "createdAt");

-- CreateIndex
CREATE INDEX "file_audit_logs_businessId_actorUserId_createdAt_idx" ON "file_audit_logs"("businessId", "actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_signed_urls" ADD CONSTRAINT "file_signed_urls_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_signed_urls" ADD CONSTRAINT "file_signed_urls_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_audit_logs" ADD CONSTRAINT "file_audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_audit_logs" ADD CONSTRAINT "file_audit_logs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
