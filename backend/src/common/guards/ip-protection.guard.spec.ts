import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { IpProtectionGuard } from "./ip-protection.guard";

function contextWithIp(ip: string): ExecutionContext {
  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => ({ ip, headers: {} }),
    }),
  } as unknown as ExecutionContext;
}

describe("IpProtectionGuard", () => {
  const oldBlocked = process.env.BLOCKED_IPS;

  afterEach(() => {
    process.env.BLOCKED_IPS = oldBlocked;
  });

  it("allows non-blocked ip", () => {
    process.env.BLOCKED_IPS = "10.0.0.1";
    const guard = new IpProtectionGuard();
    expect(guard.canActivate(contextWithIp("127.0.0.1"))).toBe(true);
  });

  it("blocks configured ip", () => {
    process.env.BLOCKED_IPS = "127.0.0.1";
    const guard = new IpProtectionGuard();
    expect(() => guard.canActivate(contextWithIp("127.0.0.1"))).toThrow(ForbiddenException);
  });
});
