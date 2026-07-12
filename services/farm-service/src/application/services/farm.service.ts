import { Injectable, NotFoundException } from '@nestjs/common';
import { FarmRepository, FieldRepository } from '../../domain/repositories/farm.repository';
import { FarmEventService } from '../../infrastructure/messaging/farm.event.service';

@Injectable()
export class FarmApplicationService {
  constructor(
    private readonly farmRepo: FarmRepository,
    private readonly fieldRepo: FieldRepository,
    private readonly eventService: FarmEventService,
  ) {}

  async createFarm(data: {
    organizationId: string;
    name: string;
    farmType: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    size?: number;
  }) {
    const farm = await this.farmRepo.create({
      ...data,
      location: data.location || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      size: data.size || 0,
      status: 'active',
    });
    await this.eventService.emitFarmCreatedEvent(farm);
    return farm;
  }

  async getFarmById(id: string) {
    const farm = await this.farmRepo.findById(id);
    if (!farm) throw new NotFoundException(`Farm with ID ${id} not found`);
    return farm;
  }

  async getAllFarms(options: {
    organizationId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) {
    const { organizationId, ...opts } = options;
    if (organizationId) {
      return this.farmRepo.findByOrganizationId(organizationId, opts);
    }
    return this.farmRepo.findAll(opts);
  }

  async updateFarm(id: string, data: Partial<{
    name: string;
    farmType: string;
    location: string;
    latitude: number;
    longitude: number;
    size: number;
    status: string;
  }>) {
    await this.getFarmById(id);
    const updatedFarm = await this.farmRepo.update(id, data);
    await this.eventService.emitFarmUpdatedEvent(updatedFarm);
    return updatedFarm;
  }

  async deleteFarm(id: string) {
    await this.getFarmById(id);
    await this.eventService.emitFarmDeletedEvent(id);
    return this.farmRepo.delete(id);
  }

  async createField(data: { farmId: string; name: string; size: number }) {
    await this.getFarmById(data.farmId);
    const field = await this.fieldRepo.create(data);
    return field;
  }

  async getFieldById(id: string) {
    const field = await this.fieldRepo.findById(id);
    if (!field) throw new NotFoundException(`Field with ID ${id} not found`);
    return field;
  }

  async getAllFields(farmId: string) {
    return this.fieldRepo.findByFarmId(farmId);
  }

  async updateField(id: string, data: Partial<{ name: string; size: number }>) {
    await this.getFieldById(id);
    return this.fieldRepo.update(id, data);
  }

  async deleteField(id: string) {
    await this.getFieldById(id);
    return this.fieldRepo.delete(id);
  }
}
