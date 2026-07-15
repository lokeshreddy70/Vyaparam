import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryThresholdMs = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 500);

  constructor() {
    super();

    this.$use(async (params, next) => {
      const startedAt = Date.now();
      try {
        return await next(params);
      } finally {
        const durationMs = Date.now() - startedAt;
        if (durationMs >= this.slowQueryThresholdMs) {
          this.logger.warn(
            JSON.stringify({
              message: "SLOW_QUERY",
              model: params.model,
              action: params.action,
              durationMs,
              thresholdMs: this.slowQueryThresholdMs,
            }),
          );
        }
      }
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn("Prisma connection failed during startup; continuing without a connected database.");
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      this.logger.warn("Prisma disconnect failed during shutdown.");
    }
  }
}
