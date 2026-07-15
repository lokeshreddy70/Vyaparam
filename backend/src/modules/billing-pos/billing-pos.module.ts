import { Module } from "@nestjs/common";
import { BillingPosController } from "./billing-pos.controller";
import { BillingPosService } from "./billing-pos.service";
import { BillingPosRepository } from "./billing-pos.repository";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [SettingsModule],
  controllers: [BillingPosController],
  providers: [BillingPosService, BillingPosRepository],
  exports: [BillingPosService],
})
export class BillingPosModule {}
