import { StartupValidationService } from "./startup-validation.service";

describe("StartupValidationService", () => {
  const oldAccess = process.env.JWT_ACCESS_SECRET;
  const oldRefresh = process.env.JWT_REFRESH_SECRET;

  afterEach(() => {
    process.env.JWT_ACCESS_SECRET = oldAccess;
    process.env.JWT_REFRESH_SECRET = oldRefresh;
  });

  it("fails when required secrets are missing", async () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    const service = new StartupValidationService({ $queryRaw: jest.fn() } as any);
    await expect(service.onModuleInit()).rejects.toThrow("Missing required secrets");
  });

  it("passes with secrets and db check", async () => {
    process.env.JWT_ACCESS_SECRET = "access";
    process.env.JWT_REFRESH_SECRET = "refresh";

    const service = new StartupValidationService({ $queryRaw: jest.fn().mockResolvedValue(1) } as any);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
