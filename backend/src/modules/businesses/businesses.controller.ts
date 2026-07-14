import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Controller("businesses")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BusinessesController {
  constructor(private readonly service: BusinessesService) {}

  @Post("")
  @Roles("SUPER_ADMIN")
  @Permissions("business.manage")
  create(@Body() dto: CreateBusinessDto) {
    return this.service.create(dto);
  }

  @Get("")
  @Permissions("business.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Permissions("business.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("business.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateBusinessDto) {
    return this.service.update(user.businessId, id, dto);
  }
}
