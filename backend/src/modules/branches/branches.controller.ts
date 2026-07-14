import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Controller("branches")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Post("")
  @Roles("OWNER", "MANAGER")
  @Permissions("branch.manage")
  create(@CurrentUser() user: any, @Body() dto: CreateBranchDto) {
    return this.service.create(user.businessId, dto);
  }

  @Get("")
  @Permissions("branch.read")
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.businessId);
  }

  @Get(":id")
  @Permissions("branch.read")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.service.findOne(user.businessId, id);
  }

  @Patch(":id")
  @Roles("OWNER", "MANAGER")
  @Permissions("branch.manage")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateBranchDto) {
    return this.service.update(user.businessId, id, dto);
  }
}
