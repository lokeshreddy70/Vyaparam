-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "customerTypeId" TEXT,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "tinNumber" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "panNumber" TEXT,
ADD COLUMN     "supplierTypeId" TEXT,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "tinNumber" TEXT;

-- CreateTable
CREATE TABLE "customer_types" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_types" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_addresses" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "label" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postalCode" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_ledgers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_ledgers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_types_businessId_deletedAt_idx" ON "customer_types"("businessId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_types_businessId_name_key" ON "customer_types"("businessId", "name");

-- CreateIndex
CREATE INDEX "supplier_types_businessId_deletedAt_idx" ON "supplier_types"("businessId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_types_businessId_name_key" ON "supplier_types"("businessId", "name");

-- CreateIndex
CREATE INDEX "customer_contacts_businessId_customerId_deletedAt_idx" ON "customer_contacts"("businessId", "customerId", "deletedAt");

-- CreateIndex
CREATE INDEX "supplier_contacts_businessId_supplierId_deletedAt_idx" ON "supplier_contacts"("businessId", "supplierId", "deletedAt");

-- CreateIndex
CREATE INDEX "customer_addresses_businessId_customerId_deletedAt_idx" ON "customer_addresses"("businessId", "customerId", "deletedAt");

-- CreateIndex
CREATE INDEX "supplier_addresses_businessId_supplierId_deletedAt_idx" ON "supplier_addresses"("businessId", "supplierId", "deletedAt");

-- CreateIndex
CREATE INDEX "customer_ledgers_businessId_customerId_createdAt_idx" ON "customer_ledgers"("businessId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_ledgers_businessId_branchId_createdAt_idx" ON "customer_ledgers"("businessId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "supplier_ledgers_businessId_supplierId_createdAt_idx" ON "supplier_ledgers"("businessId", "supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "supplier_ledgers_businessId_branchId_createdAt_idx" ON "supplier_ledgers"("businessId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "customers_businessId_email_idx" ON "customers"("businessId", "email");

-- CreateIndex
CREATE INDEX "customers_businessId_name_deletedAt_idx" ON "customers"("businessId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "suppliers_businessId_email_idx" ON "suppliers"("businessId", "email");

-- CreateIndex
CREATE INDEX "suppliers_businessId_name_deletedAt_idx" ON "suppliers"("businessId", "name", "deletedAt");

-- AddForeignKey
ALTER TABLE "customer_types" ADD CONSTRAINT "customer_types_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_customerTypeId_fkey" FOREIGN KEY ("customerTypeId") REFERENCES "customer_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_types" ADD CONSTRAINT "supplier_types_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_supplierTypeId_fkey" FOREIGN KEY ("supplierTypeId") REFERENCES "supplier_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledgers" ADD CONSTRAINT "customer_ledgers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledgers" ADD CONSTRAINT "customer_ledgers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_ledgers" ADD CONSTRAINT "customer_ledgers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ledgers" ADD CONSTRAINT "supplier_ledgers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ledgers" ADD CONSTRAINT "supplier_ledgers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ledgers" ADD CONSTRAINT "supplier_ledgers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
