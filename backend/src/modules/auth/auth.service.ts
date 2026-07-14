import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterBusinessDto } from "./dto/register-business.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CreateUserDto } from "../users/dto/create-user.dto";

@Injectable()
export class AuthService {
  private readonly maxFailedAttempts = 5;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private parseDurationToMs(value: string) {
    const v = value.trim();
    const match = /^(\d+)([smhd])$/.exec(v);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const n = Number(match[1]);
    const unit = match[2];
    if (unit === "s") return n * 1000;
    if (unit === "m") return n * 60 * 1000;
    if (unit === "h") return n * 60 * 60 * 1000;
    return n * 24 * 60 * 60 * 1000;
  }

  private ensureStrongPassword(password: string) {
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
    if (!strong) {
      throw new BadRequestException("Password does not meet policy requirements");
    }
  }

  private signTokens(
    payload: { sub: string; businessId: string; role: string; email: string },
    sessionId: string,
    rememberMe = false,
  ) {
    const accessSecret = this.config.get<string>("jwt.accessSecret") ?? "dev-access-secret-change-me";
    const refreshSecret = this.config.get<string>("jwt.refreshSecret") ?? "dev-refresh-secret-change-me";
    const accessExpiry = this.config.get<string>("jwt.accessExpiry") ?? "15m";
    const refreshExpiry = rememberMe ? "30d" : this.config.get<string>("jwt.refreshExpiry") ?? "7d";

    const accessToken = this.jwt.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiry,
    });
    const refreshToken = this.jwt.sign(
      { ...payload, tokenType: "refresh", sid: sessionId, jti: randomUUID() },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiry,
      },
    );

    const refreshExpiresAt = new Date(Date.now() + this.parseDurationToMs(refreshExpiry));
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async securityLog(businessId: string, userId: string | null, action: string, metadata?: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          businessId,
          userId,
          action,
          entityType: "Auth",
          entityId: userId ?? undefined,
          metadata,
        },
      });
      await this.prisma.activityLog.create({
        data: {
          businessId,
          userId,
          activity: action,
          metadata,
        },
      });
    } catch {
      // keep auth flow non-blocking on logging failures
    }
  }

  async registerBusiness(dto: RegisterBusinessDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    this.ensureStrongPassword(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const business = await this.prisma.business.create({
      data: {
        name: dto.businessName,
        type: dto.businessType,
        address: dto.address,
        phone: dto.phone,
        users: {
          create: {
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
            role: dto.role ?? "OWNER",
          },
        },
      },
      include: { users: true },
    });

    const owner = business.users[0];
    const session = await this.prisma.session.create({
      data: {
        businessId: business.id,
        branchId: owner.branchId,
        userId: owner.id,
        expiresAt: new Date(Date.now() + this.parseDurationToMs("7d")),
      },
    });
    const tokens = this.signTokens(
      { sub: owner.id, businessId: business.id, role: owner.role, email: owner.email },
      session.id,
      false,
    );
    await this.storeRefreshToken(owner, tokens.refreshToken, tokens.refreshExpiresAt);
    await this.securityLog(business.id, owner.id, "REGISTER");
    return { user: owner, business, ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string | null, userAgent?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.isActive) throw new UnauthorizedException("Invalid credentials");
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.securityLog(user.businessId, user.id, "LOGIN_BLOCKED_LOCKED", { lockedUntil: user.lockedUntil });
      throw new UnauthorizedException("Account temporarily locked");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const lockedUntil = attempts >= this.maxFailedAttempts ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil },
      });

      await this.securityLog(user.businessId, user.id, "LOGIN_FAILED", {
        attempts,
        lockedUntil,
        ipAddress,
        userAgent,
      });
      await this.prisma.errorLog.create({
        data: {
          businessId: user.businessId,
          branchId: user.branchId,
          userId: user.id,
          message: "Invalid credentials",
          context: { ipAddress, userAgent },
          level: "WARNING",
        },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const session = await this.prisma.session.create({
      data: {
        businessId: user.businessId,
        branchId: user.branchId,
        userId: user.id,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
        expiresAt: new Date(Date.now() + this.parseDurationToMs(dto.rememberMe ? "30d" : "7d")),
      },
    });

    const tokens = this.signTokens(
      { sub: user.id, businessId: user.businessId, role: user.role, email: user.email },
      session.id,
      dto.rememberMe,
    );

    await this.storeRefreshToken(user, tokens.refreshToken, tokens.refreshExpiresAt);
    await this.securityLog(user.businessId, user.id, "LOGIN", {
      ipAddress,
      userAgent,
      rememberMe: !!dto.rememberMe,
    });
    return { user, ...tokens };
  }

  async refresh(userId: string, refreshToken: string, sessionId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    let matchedTokenId: string | null = null;
    for (const item of activeTokens) {
      const ok = await bcrypt.compare(refreshToken, item.tokenHash);
      if (ok) {
        matchedTokenId = item.id;
        break;
      }
    }

    if (!matchedTokenId) {
      await this.securityLog(user.businessId, user.id, "REFRESH_FAILED");
      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() },
    });

    const sid = sessionId ?? randomUUID();
    if (sessionId) {
      await this.prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: { updatedAt: new Date() },
      });
    }

    const tokens = this.signTokens(
      { sub: user.id, businessId: user.businessId, role: user.role, email: user.email },
      sid,
      false,
    );

    await this.storeRefreshToken(user, tokens.refreshToken, tokens.refreshExpiresAt);
    await this.securityLog(user.businessId, user.id, "REFRESH_SUCCESS");
    return tokens;
  }

  async logout(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.securityLog(user.businessId, user.id, "LOGOUT");
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { success: true };
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.prisma.passwordReset.create({ data: { email: dto.email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordReset.findFirst({ where: { email: dto.email, otp: dto.otp, expiresAt: { gte: new Date() } } });
    if (!record) throw new BadRequestException("Invalid or expired OTP");
    this.ensureStrongPassword(dto.newPassword);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const user = await this.prisma.user.update({ where: { email: dto.email }, data: { passwordHash, refreshTokenHash: null } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.passwordReset.delete({ where: { id: record.id } });
    return { success: true };
  }

  async createStaff(businessId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");
    this.ensureStrongPassword(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        businessId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash,
      },
    });
  }

  private async storeRefreshToken(
    user: { id: string; businessId: string; branchId?: string | null },
    refreshToken: string,
    expiresAt: Date,
  ) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash } });
    await this.prisma.refreshToken.create({
      data: {
        businessId: user.businessId,
        branchId: user.branchId ?? undefined,
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });
  }
}
