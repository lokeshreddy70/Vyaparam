import { ReportsAnalyticsService } from "./reports-analytics.service";

describe("ReportsAnalyticsService", () => {
  const repository: any = {
    dashboardSummary: jest.fn(),
    inventoryWhere: jest.fn(),
    getClient: jest.fn(),
    topProducts: jest.fn(),
    topCategories: jest.fn(),
    salesDocWhere: jest.fn(),
  };

  let service: ReportsAnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsAnalyticsService(repository);
  });

  it("uses cache for dashboard", async () => {
    repository.dashboardSummary.mockResolvedValue({ totalSales: 10 });

    const a = await service.dashboard("b1", {} as any);
    const b = await service.dashboard("b1", {} as any);

    expect(a).toEqual({ totalSales: 10 });
    expect(b).toEqual({ totalSales: 10 });
    expect(repository.dashboardSummary).toHaveBeenCalledTimes(1);
  });
});
