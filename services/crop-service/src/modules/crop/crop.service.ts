import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CropRepository } from './crop.repository';
import { emitCropEvent } from '@farm/utils';

@Injectable()
export class CropService {
  constructor(private readonly cropRepository: CropRepository) {}

  async createCrop(data: any) {
    const crop = await this.cropRepository.createCrop(data.name);
    await emitCropEvent('created', crop);
    return crop;
  }

  async getCropById(id: string) {
    const crop = await this.cropRepository.getCropById(id);
    if (!crop) throw new NotFoundException(`Crop with ID ${id} not found`);
    return crop;
  }

  async getAllCrops(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.cropRepository.getAllCrops(filter, sortBy, sortOrder, page, limit);
  }

  async updateCrop(id: string, data: any) {
    await this.getCropById(id);
    if (!data.name) throw new BadRequestException('Crop name is required for update');
    const crop = await this.cropRepository.updateCrop(id, data.name);
    await emitCropEvent('updated', crop);
    return crop;
  }

  async deleteCrop(id: string) {
    await this.getCropById(id);
    await this.cropRepository.deleteCrop(id);
    await emitCropEvent('deleted', { id });
    return { deleted: true };
  }

  async createCropCycle(data: any) {
    const plantingDate = typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate;
    const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : null;
    await this.getCropById(data.cropId);
    const cycle = await this.cropRepository.createCropCycle({ fieldId: data.fieldId, cropId: data.cropId, plantingDate, harvestDate });
    await emitCropEvent('created', cycle);
    return cycle;
  }

  async getCropCycleById(id: string) {
    const cycle = await this.cropRepository.getCropCycleById(id);
    if (!cycle) throw new NotFoundException(`Crop cycle with ID ${id} not found`);
    return cycle;
  }

  async getAllCropCycles(filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.cropRepository.getAllCropCycles(filter, sortBy, sortOrder, page, limit);
  }

  async updateCropCycle(id: string, data: any) {
    await this.getCropCycleById(id);
    const plantingDate = data.plantingDate ? (typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate) : undefined;
    const harvestDate = data.harvestDate ? (typeof data.harvestDate === 'string' ? new Date(data.harvestDate) : data.harvestDate) : (data.harvestDate === null ? null : undefined);
    if (data.cropId) await this.getCropById(data.cropId);
    const cycle = await this.cropRepository.updateCropCycle(id, { fieldId: data.fieldId, cropId: data.cropId, plantingDate, harvestDate });
    await emitCropEvent('updated', cycle);
    return cycle;
  }

  async deleteCropCycle(id: string) {
    await this.getCropCycleById(id);
    await this.cropRepository.deleteCropCycle(id);
    await emitCropEvent('deleted', { id });
    return { deleted: true };
  }
}
