import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InventoryService } from "./inventory.service";

describe("InventoryService", () => {
  const prisma: any = {
    inventory: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn({})),
  };
  const repository: any = {
    findInventoryById: jest.fn(),
    findInventory: jest.fn(),
    lowStock: jest.fn(),
    applyMovement: jest.fn(),
    transfer: jest.fn(),
    movements: jest.fn(),
  };

  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventoryService(prisma, repository);
  });

  it("throws for same source and destination warehouse", async () => {
    await expect(
      service.transfer("b1", "u1", null, {
        fromWarehouseId: "w1",
        toWarehouseId: "w1",
        productId: "p1",
        quantity: 1,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws not found on missing inventory", async () => {
    repository.findInventoryById.mockResolvedValue(null);
    await expect(service.findOne("b1", "inv1")).rejects.toThrow(NotFoundException);
  });
});
