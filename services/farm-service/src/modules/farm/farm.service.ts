import { FarmRepository } from './farm.repository';
import { CreateFarmRequest, UpdateFarmRequest } from '@farm/types';

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
}
