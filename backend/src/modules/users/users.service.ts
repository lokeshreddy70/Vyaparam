import { Injectable, NotFoundException } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(businessId: string) {
    return this.usersRepository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const user = await this.usersRepository.findOne(businessId, id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async update(businessId: string, id: string, dto: UpdateUserDto) {
    await this.findOne(businessId, id);
    return this.usersRepository.update(businessId, id, dto);
  }

  async updateStatus(businessId: string, id: string, isActive: boolean) {
    await this.findOne(businessId, id);
    return this.usersRepository.updateStatus(businessId, id, isActive);
  }

  async changePassword(businessId: string, id: string, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("New password must be different");
    }

    const result = await this.usersRepository.changePassword(
      businessId,
      id,
      dto.currentPassword,
      dto.newPassword,
    );

    if (result === null) throw new NotFoundException("User not found");
    if (result === false) throw new BadRequestException("Current password is invalid");

    return { success: true };
  }
}
