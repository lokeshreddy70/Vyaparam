import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok when db check succeeds", async () => {
    const prisma: any = { $queryRaw: jest.fn().mockResolvedValue(1) };
    const service = new HealthService(prisma);
    const res = await service.check();
    expect(res.status).toBe("ok");
  });

  it("returns degraded when db fails", async () => {
    const prisma: any = { $queryRaw: jest.fn().mockRejectedValue(new Error("db down")) };
    const service = new HealthService(prisma);
    const res = await service.check();
    expect(res.status).toBe("degraded");
  });
});
