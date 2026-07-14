import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { KitchenGateway } from './kitchen.gateway';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, KitchenGateway],
  exports: [OrdersService],
})
export class OrdersModule {}
