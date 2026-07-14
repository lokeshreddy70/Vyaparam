import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Forbidden");
    }

    if (user.role === "SUPER_ADMIN" || user.role === "OWNER") {
      return true;
    }

    const roleEntity = await this.prisma.roleEntity.findFirst({
      where: {
        name: user.role,
        deletedAt: null,
        OR: [{ businessId: user.businessId }, { businessId: null }],
      },
      include: {
        rolePermissions: {
          where: { deletedAt: null },
          include: { permission: true },
        },
      },
    });

    if (!roleEntity) {
      throw new ForbiddenException("Forbidden");
    }

    const effective = new Set(roleEntity.rolePermissions.map((rp) => rp.permission.name));
    const allowed = requiredPermissions.every((permission) => effective.has(permission));

    if (!allowed) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
