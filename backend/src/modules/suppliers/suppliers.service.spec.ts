import { NotFoundException } from "@nestjs/common";
import { SuppliersService } from "./suppliers.service";

describe("SuppliersService", () => {
  const prisma: any = {
    $transaction: jest.fn(async (fn: any) => fn({ activityLog: { create: jest.fn() }, auditLog: { create: jest.fn() } })),
  };
  const repository: any = {
    findSupplier: jest.fn(),
    listSuppliers: jest.fn(),
    createGroup: jest.fn(),
    createType: jest.fn(),
    listGroups: jest.fn(),
    listTypes: jest.fn(),
    createSupplierWithDetails: jest.fn(),
  };

  let service: SuppliersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SuppliersService(prisma, repository);
  });

  it("throws when supplier not found", async () => {
    repository.findSupplier.mockResolvedValue(null);
    await expect(service.findOne("b1", "s1")).rejects.toThrow(NotFoundException);
  });

  it("returns paginated list", async () => {
    repository.listSuppliers.mockResolvedValue([1, [{ id: "s1" }]]);
    const result = await service.list("b1", { page: 1, limit: 10 } as any);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
