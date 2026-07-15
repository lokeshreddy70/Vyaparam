import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringRepository } from "./monitoring.repository";
import { MonitoringService } from "./monitoring.service";

@Module({
  imports: [NotificationsModule, DocumentsModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringRepository],
  exports: [MonitoringService],
})
export class MonitoringModule {}
