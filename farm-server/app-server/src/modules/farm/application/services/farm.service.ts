import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FarmRepository, FieldRepository } from '../../domain/repositories/farm.repository';
import { FarmEventService } from '../../infrastructure/messaging/farm.event.service';

/**
 * All organization scoping is derived from the CALLER (the controller passes
 * the JWT's organizationId). Client-supplied ids are never trusted as scope,
 * and reads of another tenant's rows surface as NotFound, not as data.
 */
@Injectable()
export class FarmApplicationService {
  constructor(@Inject('FarmRepository') private readonly farmRepo: FarmRepository, @Inject('FieldRepository') private readonly fieldRepo: FieldRepository,
    private readonly eventService: FarmEventService) {}

  async createFarm(data: {
    organizationId: string;
    name: string;
    farmType: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    size?: number;
  }) {
    if (!data.organizationId) {
      throw new ForbiddenException('No organization associated with caller');
    }
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

  async getFarmById(id: string, organizationId: string) {
    const farm = await this.farmRepo.findById(id, organizationId);
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async getAllFarms(organizationId: string, options: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}) {
    // A caller without an organization sees nothing — never fall through to
    // an unscoped (all-tenant) listing.
    if (!organizationId) {
      return { farms: [], total: 0 };
    }
    return this.farmRepo.findByOrganizationId(organizationId, options);
  }

  async updateFarm(id: string, organizationId: string, data: Partial<{
    name: string;
    farmType: string;
    location: string;
    latitude: number;
    longitude: number;
    size: number;
    status: string;
  }>) {
    await this.getFarmById(id, organizationId);
    const updatedFarm = await this.farmRepo.update(id, organizationId, data);
    await this.eventService.emitFarmUpdatedEvent(updatedFarm);
    return updatedFarm;
  }

  async deleteFarm(id: string, organizationId: string) {
    const farm = await this.getFarmById(id, organizationId);
    await this.eventService.emitFarmDeletedEvent(farm.id, farm.organizationId);
    return this.farmRepo.delete(id, organizationId);
  }

  async createField(data: { farmId: string; name: string; size: number }, organizationId: string) {
    // Existence check doubles as ownership check: scoped to the caller's org.
    await this.getFarmById(data.farmId, organizationId);
    const field = await this.fieldRepo.create(data);
    return field;
  }

  async getFieldById(id: string, organizationId: string) {
    const field = await this.fieldRepo.findById(id, organizationId);
    if (!field) throw new NotFoundException('Field not found');
    return field;
  }

  async getAllFields(farmId: string | undefined, organizationId: string) {
    // Prisma strips `undefined` filters, so a missing farmId would otherwise
    // return every tenant's fields.
    if (!farmId) throw new BadRequestException('farmId query parameter is required');
    await this.getFarmById(farmId, organizationId);
    return this.fieldRepo.findByFarmId(farmId, organizationId);
  }

  async updateField(id: string, organizationId: string, data: Partial<{ name: string; size: number }>) {
    await this.getFieldById(id, organizationId);
    return this.fieldRepo.update(id, data);
  }

  async deleteField(id: string, organizationId: string) {
    await this.getFieldById(id, organizationId);
    return this.fieldRepo.delete(id);
  }
}
