import { Module } from "@nestjs/common";
import { HrmsController } from "./hrms.controller";
import { HrmsRepository } from "./hrms.repository";
import { HrmsService } from "./hrms.service";

@Module({
  controllers: [HrmsController],
  providers: [HrmsService, HrmsRepository],
  exports: [HrmsService],
})
export class HrmsModule {}
