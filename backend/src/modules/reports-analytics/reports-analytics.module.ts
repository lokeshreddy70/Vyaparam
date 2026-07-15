import { Module } from "@nestjs/common";
import { ReportsAnalyticsController } from "./reports-analytics.controller";
import { ReportsAnalyticsRepository } from "./reports-analytics.repository";
import { ReportsAnalyticsService } from "./reports-analytics.service";

@Module({
  controllers: [ReportsAnalyticsController],
  providers: [ReportsAnalyticsRepository, ReportsAnalyticsService],
  exports: [ReportsAnalyticsService],
})
export class ReportsAnalyticsModule {}
