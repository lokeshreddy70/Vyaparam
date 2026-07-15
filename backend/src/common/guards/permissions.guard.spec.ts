import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";

describe("PermissionsGuard", () => {
  const prisma: any = {
    roleEntity: {
      findFirst: jest.fn(),
    },
  };

  const context = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it("allows when metadata is empty", async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, prisma);
    await expect(guard.canActivate(context({ role: "STAFF" }))).resolves.toBe(true);
  });

  it("allows owner", async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["user.read"]) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, prisma);
    await expect(guard.canActivate(context({ role: "OWNER" }))).resolves.toBe(true);
  });

  it("blocks insufficient permissions", async () => {
    prisma.roleEntity.findFirst.mockResolvedValue({
      rolePermissions: [{ permission: { name: "inventory.read" } }],
    });
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["billing.manage"]) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector, prisma);

    await expect(
      guard.canActivate(context({ role: "MANAGER", businessId: "b1" })),
    ).rejects.toThrow(ForbiddenException);
  });
});
