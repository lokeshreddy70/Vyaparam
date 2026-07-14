import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsInt, Min, IsEnum } from 'class-validator';
import { TableStatus } from '@prisma/client';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class CreateTableDto {
  @IsString()
  label: string;

  @IsInt()
  @Min(1)
  capacity: number;
}

class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status: TableStatus;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTableDto) {
    return this.tablesService.create(user.businessId, dto.label, dto.capacity);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.findAll(user.businessId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateStatus(user.businessId, id, dto.status);
  }
}
