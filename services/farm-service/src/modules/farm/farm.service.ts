import { FarmRepository } from './farm.repository';
import { CreateFarmRequest, UpdateFarmRequest, CreateFieldRequest, UpdateFieldRequest } from '@farm/types';
import { FarmEventService } from './farm.event.service';

export class FarmService {
  private repository = new FarmRepository();
  private eventService = FarmEventService.getInstance();

  async createFarm(data: CreateFarmRequest) {
    const farm = await this.repository.createFarm(data);
    await this.eventService.emitFarmCreatedEvent(farm);
    return farm;
  }

  async getFarmById(id: string) {
    const farm = await this.repository.getFarmById(id);
    if (!farm) {
      throw new Error(`Farm with ID ${id} not found`);
    }
    return farm;
  }

  async getAllFarms(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 10) {
    return this.repository.getAllFarms(filter, sortBy, sortOrder, page, limit);
  }

  async updateFarm(id: string, data: UpdateFarmRequest) {
    await this.getFarmById(id);
    const updatedFarm = await this.repository.updateFarm(id, data);
    await this.eventService.emitFarmUpdatedEvent(updatedFarm);
    return updatedFarm;
  }

  async deleteFarm(id: string) {
    await this.getFarmById(id);
    await this.eventService.emitFarmDeletedEvent(id);
    return this.repository.deleteFarm(id);
  }

  // --- Field Service Methods ---
  async createField(data: CreateFieldRequest) {
    await this.getFarmById(data.farmId);
    const field = await this.repository.createField(data);
    await this.eventService.emitFarmUpdatedEvent(field.farm);
    return field;
  }

  async getFieldById(id: string) {
    const field = await this.repository.getFieldById(id);
    if (!field) {
      throw new Error(`Field with ID ${id} not found`);
    }
    return field;
  }

  async getAllFields(filter: any = {}, sortBy: string = 'name', sortOrder: 'asc' | 'desc' = 'asc', page: number = 1, limit: number = 10) {
    return this.repository.getAllFields(filter, sortBy, sortOrder, page, limit);
  }

  async updateField(id: string, data: UpdateFieldRequest) {
    await this.getFieldById(id);
    if (data.farmId) {
      await this.getFarmById(data.farmId);
    }
    return this.repository.updateField(id, data);
  }

  async deleteField(id: string) {
    await this.getFieldById(id);
    return this.repository.deleteField(id);
  }
}

