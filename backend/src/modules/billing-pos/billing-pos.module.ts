import { Module } from "@nestjs/common";
import { BillingPosController } from "./billing-pos.controller";
import { BillingPosService } from "./billing-pos.service";
import { BillingPosRepository } from "./billing-pos.repository";

@Module({
  controllers: [BillingPosController],
  providers: [BillingPosService, BillingPosRepository],
  exports: [BillingPosService],
})
export class BillingPosModule {}
