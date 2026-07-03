import { CropRepository } from './crop.repository';
import { CreateCropRequest, CreateCropCycleRequest, UpdateCropRequest, UpdateCropCycleRequest } from '@farm/types';
import { emitCropEvent } from '@farm/utils';

export class CropService {
  private cropRepository = new CropRepository();

  // Crop Business Logic
  async createCrop(data: CreateCropRequest) {
    const crop = await this.cropRepository.createCrop(data.name);
    await emitCropEvent('created', crop);
    return crop;
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
    const crop = await this.cropRepository.updateCrop(id, data.name);
    await emitCropEvent('updated', crop);
    return crop;
  }

  async deleteCrop(id: string) {
    await this.getCropById(id); // Throws if not found
    await this.cropRepository.deleteCrop(id);
    await emitCropEvent('deleted', { id });
    return { deleted: true };
  }

  // CropCycle Business Logic
  async createCropCycle(data: CreateCropCycleRequest) {
    const plantingDate = typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate;
    const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : null;

    // Check if crop exists
    await this.getCropById(data.cropId);

    const cycle = await this.cropRepository.createCropCycle({
      fieldId: data.fieldId,
      cropId: data.cropId,
      plantingDate,
      harvestDate,
    });
    await emitCropEvent('created', cycle);
    return cycle;
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

    const cycle = await this.cropRepository.updateCropCycle(id, {
      fieldId: data.fieldId,
      cropId: data.cropId,
      plantingDate,
      harvestDate,
    });
    await emitCropEvent('updated', cycle);
    return cycle;
  }

  async deleteCropCycle(id: string) {
    await this.getCropCycleById(id); // Throws if not found
    await this.cropRepository.deleteCropCycle(id);
    await emitCropEvent('deleted', { id });
    return { deleted: true };
  }
}
