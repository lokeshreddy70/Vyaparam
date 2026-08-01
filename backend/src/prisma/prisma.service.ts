import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryThresholdMs = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? 500);

  constructor() {
    super({
      datasources: {
        db: {
          url: PrismaService.buildRuntimeDbUrl(),
        },
      },
    });

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

  private static buildRuntimeDbUrl() {
    const raw = process.env.DATABASE_URL;
    if (!raw) return undefined;

    // Keep serverless instances lean: one DB connection per instance prevents spikes.
    if (process.env.VERCEL === "1") {
      try {
        const url = new URL(raw);
        if (!url.searchParams.has("connection_limit")) {
          url.searchParams.set("connection_limit", "1");
        }
        if (!url.searchParams.has("pool_timeout")) {
          url.searchParams.set("pool_timeout", "30");
        }
        return url.toString();
      } catch {
        return raw;
      }
    }

    return raw;
  }

  async onModuleInit() {
    if (process.env.VERCEL === "1") {
      return;
    }

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
