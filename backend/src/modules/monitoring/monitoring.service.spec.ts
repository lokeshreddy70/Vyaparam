import { BackgroundJobStatus, BackgroundJobType } from "@prisma/client";
import { MonitoringService } from "./monitoring.service";

describe("MonitoringService", () => {
  const repository: any = {
    getClient: jest.fn(() => ({
      backgroundJob: { updateMany: jest.fn(), count: jest.fn() },
      backgroundJobRun: { findMany: jest.fn() },
      businessConfiguration: { findUnique: jest.fn().mockResolvedValue(null) },
      $queryRaw: jest.fn().mockResolvedValue(1),
      activityLog: { create: jest.fn() },
    })),
    pullDueJobs: jest.fn(),
    updateBackgroundJob: jest.fn(),
    createBackgroundJobRun: jest.fn(),
    updateBackgroundJobRun: jest.fn(),
    listBusinesses: jest.fn().mockResolvedValue([]),
    enqueueIfMissingScheduledJob: jest.fn(),
    summarizePerformance: jest.fn(),
    countFailedLogins: jest.fn(),
  };

  const notificationsService: any = {
    processQueue: jest.fn(),
  };

  const documentsService: any = {
    cleanup: jest.fn(),
    exportBackup: jest.fn(),
  };

  let service: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MonitoringService(repository, notificationsService, documentsService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it("processes queued job successfully", async () => {
    repository.pullDueJobs.mockResolvedValue([
      {
        id: "j1",
        businessId: "b1",
        branchId: null,
        type: BackgroundJobType.NOTIFICATION,
        payload: {},
        createdBy: "u1",
        retryCount: 0,
        maxRetries: 3,
      },
    ]);
    repository.createBackgroundJobRun.mockResolvedValue({ id: "run1" });
    notificationsService.processQueue.mockResolvedValue({ processed: 1 });

    const result = await service.processJobs("b1", "u1", 10);

    expect(result.success).toBe(1);
    expect(repository.updateBackgroundJob).toHaveBeenCalledWith(
      "j1",
      expect.objectContaining({ status: BackgroundJobStatus.SUCCESS }),
    );
  });

  it("marks job failed without retry when max retries reached", async () => {
    repository.pullDueJobs.mockResolvedValue([
      {
        id: "j2",
        businessId: "b1",
        branchId: null,
        type: BackgroundJobType.NOTIFICATION,
        payload: {},
        createdBy: "u1",
        retryCount: 1,
        maxRetries: 2,
      },
    ]);
    repository.createBackgroundJobRun.mockResolvedValue({ id: "run2" });
    notificationsService.processQueue.mockRejectedValue(new Error("queue down"));

    const result = await service.processJobs("b1", "u1", 10);

    expect(result.failed).toBe(1);
    expect(repository.updateBackgroundJob).toHaveBeenCalledWith(
      "j2",
      expect.objectContaining({ status: BackgroundJobStatus.FAILED }),
    );
  });
});
