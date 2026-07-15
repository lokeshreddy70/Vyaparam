import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    let database = { ok: true };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = { ok: true };
    } catch {
      database = { ok: false };
    }

    return {
      status: database.ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      environment: process.env.NODE_ENV ?? "development",
      memory: process.memoryUsage(),
      database,
    };
  }
}
