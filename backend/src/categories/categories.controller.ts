import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class CategoryDto {
  @IsString()
  name: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CategoryDto) {
    return this.categoriesService.create(user.businessId, dto.name);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.findAll(user.businessId);
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CategoryDto) {
    return this.categoriesService.update(user.businessId, id, dto.name);
  }

  @Roles('OWNER', 'MANAGER')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.businessId, id);
  }
}
