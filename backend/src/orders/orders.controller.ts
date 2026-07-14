import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderItemsDto, UpdateKotStatusDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Roles('WAITER', 'MANAGER', 'OWNER', 'CASHIER')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.businessId, user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: OrderStatus) {
    return this.ordersService.findAll(user.businessId, status);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.findOne(user.businessId, id);
  }

  @Roles('WAITER', 'MANAGER', 'OWNER', 'CASHIER')
  @Post(':id/items')
  addItems(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddOrderItemsDto) {
    return this.ordersService.addItems(user.businessId, id, dto);
  }

  @Roles('KITCHEN_STAFF', 'MANAGER', 'OWNER')
  @Patch('items/:orderItemId/kot-status')
  updateKotStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderItemId') orderItemId: string,
    @Body() dto: UpdateKotStatusDto,
  ) {
    return this.ordersService.updateItemKotStatus(user.businessId, orderItemId, dto.status);
  }

  @Roles('WAITER', 'MANAGER', 'OWNER', 'CASHIER')
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(user.businessId, id, dto.status);
  }

  @Roles('MANAGER', 'OWNER')
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.cancel(user.businessId, id);
  }
}
