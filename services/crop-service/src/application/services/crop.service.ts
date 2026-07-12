import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CropRepository, CropCycleRepository } from '../../domain/repositories/crop.repository';
import { CropEventService } from '../../infrastructure/messaging/crop.event.service';

@Injectable()
export class CropApplicationService {
  constructor(
    private readonly cropRepo: CropRepository,
    private readonly cropCycleRepo: CropCycleRepository,
    private readonly eventService: CropEventService,
  ) {}

  async createCrop(data: { name: string }) {
    const crop = await this.cropRepo.create({ name: data.name });
    await this.eventService.emitCropCreatedEvent(crop);
    return crop;
  }

  async getCropById(id: string) {
    const crop = await this.cropRepo.findById(id);
    if (!crop) throw new NotFoundException(`Crop with ID ${id} not found`);
    return crop;
  }

  async getAllCrops(options: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { name?: string };
  } = {}) {
    return this.cropRepo.findAll(options);
  }

  async updateCrop(id: string, data: { name: string }) {
    await this.getCropById(id);
    const updatedCrop = await this.cropRepo.update(id, { name: data.name });
    await this.eventService.emitCropUpdatedEvent(updatedCrop);
    return updatedCrop;
  }

  async deleteCrop(id: string) {
    await this.getCropById(id);
    await this.eventService.emitCropDeletedEvent(id);
    return this.cropRepo.delete(id);
  }

  async createCropCycle(data: {
    fieldId: string;
    cropId: string;
    plantingDate: Date | string;
    harvestDate?: Date | string | null;
    status?: string;
  }) {
    await this.getCropById(data.cropId);

    const plantingDate = typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate;
    const harvestDate = data.harvestDate
      ? typeof data.harvestDate === 'string'
        ? new Date(data.harvestDate)
        : data.harvestDate
      : null;

    const cycle = await this.cropCycleRepo.create({
      fieldId: data.fieldId,
      cropId: data.cropId,
      plantingDate,
      harvestDate,
      status: data.status || 'active',
    });

    await this.eventService.emitCropCycleCreatedEvent(cycle);
    return cycle;
  }

  async getCropCycleById(id: string) {
    const cycle = await this.cropCycleRepo.findById(id);
    if (!cycle) throw new NotFoundException(`Crop cycle with ID ${id} not found`);
    return cycle;
  }

  async getAllCropCycles(options: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { fieldId?: string; cropId?: string; status?: string };
  } = {}) {
    return this.cropCycleRepo.findAll(options);
  }

  async updateCropCycle(id: string, data: Partial<{
    fieldId: string;
    cropId: string;
    plantingDate: Date | string;
    harvestDate: Date | string | null;
    status: string;
  }>) {
    await this.getCropCycleById(id);

    if (data.cropId) {
      await this.getCropById(data.cropId);
    }

    const updateData: any = {};
    if (data.fieldId) updateData.fieldId = data.fieldId;
    if (data.cropId) updateData.cropId = data.cropId;
    if (data.status) updateData.status = data.status;
    if (data.plantingDate) {
      updateData.plantingDate = typeof data.plantingDate === 'string' ? new Date(data.plantingDate) : data.plantingDate;
    }
    if (data.harvestDate !== undefined) {
      updateData.harvestDate = data.harvestDate === null
        ? null
        : typeof data.harvestDate === 'string'
          ? new Date(data.harvestDate)
          : data.harvestDate;
    }

    const updatedCycle = await this.cropCycleRepo.update(id, updateData);
    await this.eventService.emitCropCycleUpdatedEvent(updatedCycle);
    return updatedCycle;
  }

  async deleteCropCycle(id: string) {
    await this.getCropCycleById(id);
    await this.eventService.emitCropCycleDeletedEvent(id);
    return this.cropCycleRepo.delete(id);
  }
}
