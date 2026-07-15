import { NotFoundException } from "@nestjs/common";
import { CustomersService } from "./customers.service";

describe("CustomersService", () => {
  const prisma: any = {
    $transaction: jest.fn(async (fn: any) => fn({ activityLog: { create: jest.fn() }, auditLog: { create: jest.fn() } })),
  };
  const repository: any = {
    findCustomer: jest.fn(),
    listCustomers: jest.fn(),
    createGroup: jest.fn(),
    createType: jest.fn(),
    listGroups: jest.fn(),
    listTypes: jest.fn(),
    createCustomerWithDetails: jest.fn(),
  };

  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersService(prisma, repository);
  });

  it("throws when customer not found", async () => {
    repository.findCustomer.mockResolvedValue(null);
    await expect(service.findOne("b1", "c1")).rejects.toThrow(NotFoundException);
  });

  it("returns paginated list", async () => {
    repository.listCustomers.mockResolvedValue([1, [{ id: "c1" }]]);
    const result = await service.list("b1", { page: 1, limit: 10 } as any);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
