import { LivestockRepository } from './livestock.repository';
import { CreateLivestockRequest, UpdateLivestockRequest } from '@farm/types';

export class LivestockService {
  private repository = new LivestockRepository();

  private async assertFarmExists(farmId: string) {
    const farm = await this.repository.getFarmById(farmId);
    if (!farm) {
      throw new Error(`Farm with ID ${farmId} not found`);
    }
    return farm;
  }

  async createLivestock(data: CreateLivestockRequest) {
    await this.assertFarmExists(data.farmId);

    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;

    return this.repository.createLivestock({
      farmId: data.farmId,
      species: data.species,
      breed: data.breed ?? null,
      gender: data.gender,
      birthDate,
      status: data.status,
    });
  }

  async getLivestockById(id: string) {
    const livestock = await this.repository.getLivestockById(id);
    if (!livestock) {
      throw new Error(`Livestock with ID ${id} not found`);
    }
    return livestock;
  }

  async getAllLivestock() {
    return this.repository.getAllLivestock();
  }

  async updateLivestock(id: string, data: UpdateLivestockRequest) {
    await this.getLivestockById(id);

    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }

    const birthDate = data.birthDate
      ? typeof data.birthDate === 'string'
        ? new Date(data.birthDate)
        : data.birthDate
      : undefined;

    return this.repository.updateLivestock(id, {
      ...data,
      birthDate,
    });
  }

  async deleteLivestock(id: string) {
    await this.getLivestockById(id);
    return this.repository.deleteLivestock(id);
  }
}

