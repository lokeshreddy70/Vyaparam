import { BadRequestException } from "@nestjs/common";
import { BillingPosService } from "./billing-pos.service";

describe("BillingPosService", () => {
  const prisma: any = {
    $transaction: jest.fn(),
  };
  const repository: any = {
    nextDocumentNo: jest.fn(),
    findDocument: jest.fn(),
    listDocuments: jest.fn(),
  };
  const settingsService: any = {
    getTaxConfiguration: jest.fn().mockResolvedValue({ cgst: 9, sgst: 9, igst: 0, cess: 0, defaultTaxPercent: 18 }),
    getInvoiceConfiguration: jest.fn().mockResolvedValue({ invoice: {} }),
    getReportConfiguration: jest.fn().mockResolvedValue({}),
    getPrinterConfiguration: jest.fn().mockResolvedValue({}),
  };

  let service: BillingPosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BillingPosService(prisma, repository, settingsService);
  });

  it("validates items required", async () => {
    await expect(
      service.createDocument("b1", "u1", {
        type: "POS_BILL",
        items: [],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it("maps transaction failure to bad request", async () => {
    prisma.$transaction.mockRejectedValue(new Error("tx failure"));

    await expect(
      service.createDocument("b1", "u1", {
        type: "POS_BILL",
        items: [{ quantity: 1, unitPrice: 10, description: "item" }],
      } as any),
    ).rejects.toThrow("tx failure");
  });
});
