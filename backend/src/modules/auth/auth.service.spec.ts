import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const prisma: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    business: { create: jest.fn() },
    session: { create: jest.fn(), updateMany: jest.fn() },
    refreshToken: { create: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    passwordReset: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn() },
    activityLog: { create: jest.fn() },
    errorLog: { create: jest.fn() },
  };

  const jwt: any = { sign: jest.fn().mockReturnValue("token") };
  const config: any = {
    get: jest.fn((k: string) => {
      if (k === "jwt.accessSecret") return "access";
      if (k === "jwt.refreshSecret") return "refresh";
      if (k === "jwt.accessExpiry") return "15m";
      if (k === "jwt.refreshExpiry") return "7d";
      return undefined;
    }),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwt, config);
  });

  it("rejects weak password during registration", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.registerBusiness({
        businessName: "Biz",
        businessType: "RETAIL" as any,
        ownerName: "Owner",
        email: "owner@test.com",
        password: "weak",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects login for missing user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: "x@test.com", password: "X" } as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects reset password with invalid otp", async () => {
    prisma.passwordReset.findFirst.mockResolvedValue(null);
    await expect(
      service.resetPassword({ email: "x@test.com", otp: "000000", newPassword: "StrongP@ss1!" }),
    ).rejects.toThrow(BadRequestException);
  });
});
