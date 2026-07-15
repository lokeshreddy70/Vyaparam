import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StartupValidationService implements OnModuleInit {
  private readonly logger = new Logger(StartupValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.validateSecrets();
    await this.validateDatabase();
  }

  private async validateDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log("Startup database validation passed");
    } catch (error) {
      this.logger.warn("Startup database validation failed");
    }
  }

  private async validateSecrets() {
    const required = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required secrets: ${missing.join(", ")}`);
    }
  }
}
