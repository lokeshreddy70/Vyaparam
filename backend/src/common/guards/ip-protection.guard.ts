import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

@Injectable()
export class IpProtectionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers["x-forwarded-for"] || "";
    const blockedIps = (process.env.BLOCKED_IPS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (blockedIps.includes(String(ip))) {
      throw new ForbiddenException("IP blocked");
    }

    return true;
  }
}
