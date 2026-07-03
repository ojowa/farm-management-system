import { LivestockRepository } from './livestock.repository';
import { CreateLivestockRequest, UpdateLivestockRequest } from '@farm/types';
import { emitLivestockEvent } from '@farm/utils';

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

    const livestock = await this.repository.createLivestock({
      farmId: data.farmId,
      species: data.species,
      breed: data.breed ?? null,
      gender: data.gender,
      birthDate,
      status: data.status,
    });
    await emitLivestockEvent('created', livestock);
    return livestock;
  }

  async getLivestockById(id: string) {
    const livestock = await this.repository.getLivestockById(id);
    if (!livestock) {
      throw new Error(`Livestock with ID ${id} not found`);
    }
    return livestock;
  }

  async getAllLivestock(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 10) {
    return this.repository.getAllLivestock(filter, sortBy, sortOrder, page, limit);
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

    const livestock = await this.repository.updateLivestock(id, {
      ...data,
      birthDate,
    });
    await emitLivestockEvent('updated', livestock);
    return livestock;
  }

  async deleteLivestock(id: string) {
    await this.getLivestockById(id);
    await this.repository.deleteLivestock(id);
    await emitLivestockEvent('deleted', { id });
    return { deleted: true };
  }
}

