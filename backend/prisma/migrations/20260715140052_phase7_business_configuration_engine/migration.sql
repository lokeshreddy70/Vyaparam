-- CreateEnum
CREATE TYPE "BusinessConfigAssetType" AS ENUM ('LOGO', 'DOCUMENT', 'IMAGE', 'INVOICE_TEMPLATE', 'RECEIPT_TEMPLATE');

-- CreateTable
CREATE TABLE "business_configurations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessName" TEXT,
    "logoAssetId" TEXT,
    "gst" TEXT,
    "pan" TEXT,
    "fssai" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceSeries" TEXT NOT NULL DEFAULT 'A',
    "financialYear" TEXT,
    "taxCgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxSgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxIgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxCess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "language" TEXT NOT NULL DEFAULT 'en-IN',
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD-MM-YYYY',
    "numberFormat" TEXT NOT NULL DEFAULT 'en-IN',
    "printerConfiguration" JSONB,
    "receiptTemplate" JSONB,
    "invoiceTemplate" JSONB,
    "barcodeSettings" JSONB,
    "qrSettings" JSONB,
    "branchManagement" JSONB,
    "branchSettings" JSONB,
    "workingHours" JSONB,
    "businessStatus" JSONB,
    "subscriptionInformation" JSONB,
    "storageSettings" JSONB,
    "backupSettings" JSONB,
    "notificationSettings" JSONB,
    "emailSettings" JSONB,
    "smsSettings" JSONB,
    "pushNotificationSettings" JSONB,
    "securitySettings" JSONB,
    "passwordPolicy" JSONB,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "loginPolicy" JSONB,
    "featureFlags" JSONB,
    "moduleToggles" JSONB,
    "apiKeys" JSONB,
    "thirdPartyIntegrations" JSONB,
    "fileStorageConfiguration" JSONB,
    "businessPreferences" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_config_assets" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "configurationId" TEXT,
    "type" "BusinessConfigAssetType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_config_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_configurations_businessId_key" ON "business_configurations"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_configurations_logoAssetId_key" ON "business_configurations"("logoAssetId");

-- CreateIndex
CREATE INDEX "business_configurations_businessId_deletedAt_idx" ON "business_configurations"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "business_config_assets_businessId_type_deletedAt_idx" ON "business_config_assets"("businessId", "type", "deletedAt");

-- CreateIndex
CREATE INDEX "business_config_assets_configurationId_deletedAt_idx" ON "business_config_assets"("configurationId", "deletedAt");

-- AddForeignKey
ALTER TABLE "business_configurations" ADD CONSTRAINT "business_configurations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_configurations" ADD CONSTRAINT "business_configurations_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "business_config_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_config_assets" ADD CONSTRAINT "business_config_assets_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_config_assets" ADD CONSTRAINT "business_config_assets_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "business_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
