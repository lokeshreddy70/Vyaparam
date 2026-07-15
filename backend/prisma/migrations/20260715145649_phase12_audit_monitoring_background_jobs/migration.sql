-- CreateEnum
CREATE TYPE "BackgroundJobType" AS ENUM ('CLEANUP', 'BACKUP', 'NOTIFICATION', 'AUDIT_ROLLUP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BackgroundJobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "api_request_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "branchId" TEXT,
    "userId" TEXT,
    "correlationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_error_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "branchId" TEXT,
    "userId" TEXT,
    "correlationId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "errorType" TEXT,
    "context" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "BackgroundJobType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "BackgroundJobPriority" NOT NULL DEFAULT 'MEDIUM',
    "payload" JSONB,
    "result" JSONB,
    "correlationId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_job_runs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "result" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_request_logs_businessId_branchId_createdAt_idx" ON "api_request_logs"("businessId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "api_request_logs_correlationId_createdAt_idx" ON "api_request_logs"("correlationId", "createdAt");

-- CreateIndex
CREATE INDEX "api_request_logs_path_method_createdAt_idx" ON "api_request_logs"("path", "method", "createdAt");

-- CreateIndex
CREATE INDEX "api_error_logs_businessId_branchId_createdAt_idx" ON "api_error_logs"("businessId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "api_error_logs_correlationId_createdAt_idx" ON "api_error_logs"("correlationId", "createdAt");

-- CreateIndex
CREATE INDEX "api_error_logs_path_statusCode_createdAt_idx" ON "api_error_logs"("path", "statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "background_jobs_businessId_status_priority_scheduledAt_next_idx" ON "background_jobs"("businessId", "status", "priority", "scheduledAt", "nextRetryAt");

-- CreateIndex
CREATE INDEX "background_jobs_businessId_type_createdAt_idx" ON "background_jobs"("businessId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "background_jobs_correlationId_createdAt_idx" ON "background_jobs"("correlationId", "createdAt");

-- CreateIndex
CREATE INDEX "background_job_runs_businessId_jobId_startedAt_idx" ON "background_job_runs"("businessId", "jobId", "startedAt");

-- CreateIndex
CREATE INDEX "background_job_runs_businessId_status_createdAt_idx" ON "background_job_runs"("businessId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_error_logs" ADD CONSTRAINT "api_error_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_error_logs" ADD CONSTRAINT "api_error_logs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_error_logs" ADD CONSTRAINT "api_error_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_job_runs" ADD CONSTRAINT "background_job_runs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_job_runs" ADD CONSTRAINT "background_job_runs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "background_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
