import { LivestockRepository } from './livestock.repository';
import { CreateLivestockRequest, UpdateLivestockRequest } from '@farm/types';

export class LivestockService {
  private repository = new LivestockRepository();

  async createLivestock(data: CreateLivestockRequest) {
    const birthDate = typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate;

    return this.repository.createLivestock({
      ...data,
      birthDate,
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

    const birthDate = data.birthDate ? (typeof data.birthDate === 'string' ? new Date(data.birthDate) : data.birthDate) : undefined;

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
