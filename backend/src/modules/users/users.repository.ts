import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string) {
    return this.prisma.user.findMany({ where: { businessId, deletedAt: null } });
  }

  findOne(businessId: string, id: string) {
    return this.prisma.user.findFirst({ where: { id, businessId, deletedAt: null } });
  }

  update(businessId: string, id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  updateStatus(businessId: string, id: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  async changePassword(businessId: string, id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({ where: { id, businessId, deletedAt: null } });
    if (!user) return null;

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return false;

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, refreshTokenHash: null },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return true;
  }
}
