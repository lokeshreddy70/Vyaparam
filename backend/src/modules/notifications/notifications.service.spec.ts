import { BadRequestException } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const repo: any = {};
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(repo);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it("rejects unsupported OTP channel", async () => {
    await expect(
      service.requestOtp("b1", "u1", {
        channel: NotificationChannel.IN_APP,
        purpose: "LOGIN" as any,
        recipient: "user@test.com",
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects invalid email recipient", async () => {
    await expect(
      service.requestOtp("b1", "u1", {
        channel: NotificationChannel.EMAIL,
        purpose: "LOGIN" as any,
        recipient: "not-an-email",
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
