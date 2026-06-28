import { CropRepository } from './crop.repository';
import { CreateCropRequest, CreateCropCycleRequest, UpdateCropRequest, UpdateCropCycleRequest } from '@farm/types';

export class CropService {
  private cropRepository = new CropRepository();

  // Crop Business Logic
  async createCrop(data: CreateCropRequest) {
    return this.cropRepository.createCrop(data.name);
  }

  async getCropById(id: string) {
    const crop = await this.cropRepository.getCropById(id);
    if (!crop) {
      throw new Error(`Crop with ID ${id} not found`);
    }
    return crop;
  }

  async getAllCrops(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.cropRepository.getAllCrops(filter, sortBy, sortOrder, page, limit);
  }

  async updateCrop(id: string, data: UpdateCropRequest) {
    await this.getCropById(id); // Throws if not found
    if (!data.name) {
      throw new Error('Crop name is required for update');
    }
    return this.cropRepository.updateCrop(id, data.name);
  }

  async deleteCrop(id: string) {
    await this.getCropById(id); // Throws if not found
    return this.cropRepository.deleteCrop(id);
  }

  // CropCycle Business Logic
  async createCropCycle(data: CreateCropCycleRequest) {
    const plantingDate = typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate;
    const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : null;

    // Check if crop exists
    await this.getCropById(data.cropId);

    return this.cropRepository.createCropCycle({
      fieldId: data.fieldId,
      cropId: data.cropId,
      plantingDate,
      harvestDate,
    });
  }

  async getCropCycleById(id: string) {
    const cycle = await this.cropRepository.getCropCycleById(id);
    if (!cycle) {
      throw new Error(`Crop cycle with ID ${id} not found`);
    }
    return cycle;
  }

  async getAllCropCycles(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.cropRepository.getAllCropCycles(filter, sortBy, sortOrder, page, limit);
  }

  async updateCropCycle(id: string, data: UpdateCropCycleRequest) {
    await this.getCropCycleById(id); // Throws if not found

    const plantingDate = data.plantingDate ? (typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate) : undefined;
    const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : (data.harvestDate === null ? null : undefined);

    if (data.cropId) {
      await this.getCropById(data.cropId);
    }

    return this.cropRepository.updateCropCycle(id, {
      fieldId: data.fieldId,
      cropId: data.cropId,
      plantingDate,
      harvestDate,
    });
  }

  async deleteCropCycle(id: string) {
    await this.getCropCycleById(id); // Throws if not found
    return this.cropRepository.deleteCropCycle(id);
  }
}
