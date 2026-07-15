-- CreateEnum
CREATE TYPE "BillingDocumentType" AS ENUM ('SALES_INVOICE', 'PURCHASE_INVOICE', 'QUOTATION', 'ESTIMATE', 'SALES_ORDER', 'PURCHASE_ORDER', 'DELIVERY_CHALLAN', 'GOODS_RECEIPT_NOTE', 'SALES_RETURN', 'PURCHASE_RETURN', 'CREDIT_NOTE', 'DEBIT_NOTE', 'EXPENSE_ENTRY', 'INCOME_ENTRY', 'POS_BILL');

-- CreateEnum
CREATE TYPE "BillingDocumentStatus" AS ENUM ('DRAFT', 'HOLD', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'NET_BANKING';
ALTER TYPE "PaymentMethod" ADD VALUE 'GIFT_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'STORE_CREDIT';
ALTER TYPE "PaymentMethod" ADD VALUE 'MIXED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "billingDocumentId" TEXT,
ADD COLUMN     "paymentMeta" JSONB;

-- CreateTable
CREATE TABLE "billing_documents" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "shiftId" TEXT,
    "terminalId" TEXT,
    "type" "BillingDocumentType" NOT NULL,
    "status" "BillingDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "documentNo" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundOff" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "offerCode" TEXT,
    "isInclusiveTax" BOOLEAN NOT NULL DEFAULT false,
    "isHold" BOOLEAN NOT NULL DEFAULT false,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_document_items" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "billingDocumentId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "stockImpactQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_shifts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "registerId" TEXT NOT NULL,
    "openingUserId" TEXT NOT NULL,
    "closingUserId" TEXT,
    "openingBalance" DOUBLE PRECISION NOT NULL,
    "closingBalance" DOUBLE PRECISION,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "remarks" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_terminals" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "shiftId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_documents_businessId_branchId_type_status_createdAt_idx" ON "billing_documents"("businessId", "branchId", "type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "billing_documents_businessId_customerId_createdAt_idx" ON "billing_documents"("businessId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_documents_businessId_supplierId_createdAt_idx" ON "billing_documents"("businessId", "supplierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_documents_businessId_documentNo_key" ON "billing_documents"("businessId", "documentNo");

-- CreateIndex
CREATE INDEX "billing_document_items_businessId_billingDocumentId_deleted_idx" ON "billing_document_items"("businessId", "billingDocumentId", "deletedAt");

-- CreateIndex
CREATE INDEX "billing_document_items_businessId_productId_createdAt_idx" ON "billing_document_items"("businessId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_registers_businessId_branchId_isActive_deletedAt_idx" ON "cash_registers"("businessId", "branchId", "isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_businessId_code_key" ON "cash_registers"("businessId", "code");

-- CreateIndex
CREATE INDEX "cash_shifts_businessId_branchId_status_openedAt_idx" ON "cash_shifts"("businessId", "branchId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "cash_shifts_businessId_registerId_openedAt_idx" ON "cash_shifts"("businessId", "registerId", "openedAt");

-- CreateIndex
CREATE INDEX "pos_terminals_businessId_branchId_shiftId_isActive_deletedA_idx" ON "pos_terminals"("businessId", "branchId", "shiftId", "isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pos_terminals_businessId_code_key" ON "pos_terminals"("businessId", "code");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_billingDocumentId_fkey" FOREIGN KEY ("billingDocumentId") REFERENCES "billing_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "cash_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_documents" ADD CONSTRAINT "billing_documents_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_document_items" ADD CONSTRAINT "billing_document_items_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_document_items" ADD CONSTRAINT "billing_document_items_billingDocumentId_fkey" FOREIGN KEY ("billingDocumentId") REFERENCES "billing_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_document_items" ADD CONSTRAINT "billing_document_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_terminals" ADD CONSTRAINT "pos_terminals_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "cash_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
