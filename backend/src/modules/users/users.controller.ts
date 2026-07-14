import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("")
  @Roles("OWNER", "MANAGER")
  @Permissions("user.read")
  findAll(@CurrentUser() user: any) {
    return this.usersService.findAll(user.businessId);
  }

  @Get("me")
  @Permissions("user.read")
  me(@CurrentUser() user: any) {
    return this.usersService.findOne(user.businessId, user.id);
  }

  @Get(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("user.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.usersService.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("user.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.businessId, id, dto);
  }

  @Patch(":id/status")
  @Roles("OWNER", "MANAGER")
  @Permissions("user.manage")
  updateStatus(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(user.businessId, id, dto.isActive);
  }

  @Patch("me/password")
  @Permissions("user.manage")
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.businessId, user.id, dto);
  }
}
