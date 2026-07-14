import { Injectable, NotFoundException } from "@nestjs/common";
import { BusinessesRepository } from "./businesses.repository";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Injectable()
export class BusinessesService {
  constructor(private readonly repository: BusinessesRepository) {}

  create(dto: CreateBusinessDto) {
    return this.repository.create(dto);
  }

  findAll(businessId: string) {
    return this.repository.findAll(businessId);
  }

  async findOne(businessId: string, id: string) {
    const business = await this.repository.findOne(businessId, id);
    if (!business) throw new NotFoundException("Business not found");
    return business;
  }

  async update(businessId: string, id: string, dto: UpdateBusinessDto) {
    await this.findOne(businessId, id);
    return this.repository.update(businessId, id, dto);
  }
}
