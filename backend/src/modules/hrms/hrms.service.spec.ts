import { HrmsService } from "./hrms.service";

describe("HrmsService", () => {
  const repo: any = {
    paginate: jest.fn(),
    listDepartments: jest.fn(),
    createDepartment: jest.fn(),
  };
  const prisma: any = { $transaction: jest.fn() };

  let service: HrmsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HrmsService(repo, prisma);
  });

  it("returns paged departments", async () => {
    repo.paginate.mockReturnValue({ skip: 0, page: 1, limit: 10 });
    repo.listDepartments.mockResolvedValue([1, [{ id: "d1", name: "Ops" }]]);

    const result = await service.listDepartments("b1", {} as any);

    expect(result.meta.count).toBe(1);
    expect(result.items[0].name).toBe("Ops");
  });
});
