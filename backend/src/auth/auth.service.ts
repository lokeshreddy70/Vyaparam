import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto,
  RegisterBusinessDto,
  CreateStaffDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

interface JwtPayload {
  sub: string;
  businessId: string;
  role: string;
  email: string;
}

// In-memory OTP store. Phase 2: move to Redis with TTL so OTPs survive restarts
// and work across multiple backend instances.
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async signTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRY ?? '7d',
    });
    return { accessToken, refreshToken };
  }

  async registerBusiness(dto: RegisterBusinessDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const business = await this.prisma.business.create({
      data: {
        name: dto.businessName,
        type: dto.businessType,
        users: {
          create: {
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const owner = business.users[0];
    const tokens = await this.signTokens({
      sub: owner.id,
      businessId: business.id,
      role: owner.role,
      email: owner.email,
    });
    await this.storeRefreshToken(owner.id, tokens.refreshToken);

    return { business: { id: business.id, name: business.name, type: business.type }, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
      email: user.email,
    });
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    await this.prisma.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
      },
    });

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, businessId: user.businessId },
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException();

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException();

    const tokens = await this.signTokens({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
      email: user.email,
    });
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }

  async createStaff(businessId: string, dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { businessId, name: dto.name, email: dto.email, passwordHash, role: dto.role },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always return success to avoid leaking whether an email is registered.
    if (!user) return { success: true };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(dto.email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    // Phase 2: wire to an SMS/email provider. For now the OTP is logged
    // server-side so the flow is testable end-to-end without a live provider.
    // eslint-disable-next-line no-console
    console.log(`[OTP] Password reset code for ${dto.email}: ${otp}`);

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = otpStore.get(dto.email);
    if (!record || record.otp !== dto.otp || record.expiresAt < Date.now()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { email: dto.email },
      data: { passwordHash, refreshTokenHash: null },
    });
    otpStore.delete(dto.email);

    return { success: true };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
  }
}
