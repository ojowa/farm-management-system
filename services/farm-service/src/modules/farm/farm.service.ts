import { FarmRepository } from './farm.repository';
import { CreateFarmRequest, UpdateFarmRequest, CreateFieldRequest, UpdateFieldRequest } from '@farm/types';

export class FarmService {
  private repository = new FarmRepository();

  async createFarm(data: CreateFarmRequest) {
    return this.repository.createFarm(data);
  }

  async getFarmById(id: string) {
    const farm = await this.repository.getFarmById(id);
    if (!farm) {
      throw new Error(`Farm with ID ${id} not found`);
    }
    return farm;
  }

  async getAllFarms() {
    return this.repository.getAllFarms();
  }

  async updateFarm(id: string, data: UpdateFarmRequest) {
    await this.getFarmById(id);
    return this.repository.updateFarm(id, data);
  }

  async deleteFarm(id: string) {
    await this.getFarmById(id);
    return this.repository.deleteFarm(id);
  }

  // --- Field Service Methods ---
  async createField(data: CreateFieldRequest) {
    await this.getFarmById(data.farmId);
    return this.repository.createField(data);
  }

  async getFieldById(id: string) {
    const field = await this.repository.getFieldById(id);
    if (!field) {
      throw new Error(`Field with ID ${id} not found`);
    }
    return field;
  }

  async getAllFields() {
    return this.repository.getAllFields();
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

