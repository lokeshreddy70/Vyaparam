import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterBusinessDto } from "./dto/register-business.dto";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Req() req: any, @Body() dto: LoginDto) {
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
    const userAgent = req.headers["user-agent"] || null;
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  refresh(@Req() req: any) {
    const authorization = req.headers.authorization as string;
    const refreshToken = authorization?.replace("Bearer ", "") ?? "";
    return this.authService.refresh(req.user.id, refreshToken, req.user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "MANAGER")
  @Post("staff")
  createStaff(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.authService.createStaff(user.businessId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
