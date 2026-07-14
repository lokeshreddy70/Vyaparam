import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto, RecordPaymentDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Roles('CASHIER', 'MANAGER', 'OWNER')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvoiceDto) {
    return this.billingService.createFromOrder(user.businessId, user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.billingService.findAll(user.businessId, from, to);
  }

  @Get('reports/daily')
  dailySummary(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    const target = date ?? new Date().toISOString().slice(0, 10);
    return this.billingService.dailySummary(user.businessId, target);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.billingService.findOne(user.businessId, id);
  }

  @Roles('CASHIER', 'MANAGER', 'OWNER')
  @Post(':id/payments')
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.billingService.recordPayment(user.businessId, id, dto);
  }
}
