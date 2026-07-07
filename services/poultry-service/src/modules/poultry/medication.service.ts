import { Injectable, NotFoundException } from '@nestjs/common';
import { MedicationRepository } from './medication.repository';
import { PoultryService } from './poultry.service';
import { emitPoultryEvent } from '@farm/utils';

@Injectable()
export class MedicationService {
  constructor(
    private readonly repository: MedicationRepository,
    private readonly poultryService: PoultryService,
  ) {}

  async create(data: any) {
    await this.poultryService.getFlockById(data.flockId);
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = data.endDate
      ? typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
      : null;
    const medication = await this.repository.create({ ...data, startDate, endDate });
    await emitPoultryEvent('created', medication);
    return medication;
  }

  async getById(id: string) {
    const medication = await this.repository.getById(id);
    if (!medication) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }
    return medication;
  }

  async getAll(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    flockId?: string;
    status?: string;
    search?: string;
  }) {
    return this.repository.getAll(params);
  }

  async update(id: string, data: any) {
    await this.getById(id);
    if (data.flockId) {
      await this.poultryService.getFlockById(data.flockId);
    }
    const startDate = data.startDate ? (typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate) : undefined;
    const endDate = data.endDate !== undefined
      ? (data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null)
      : undefined;
    const medication = await this.repository.update(id, { ...data, startDate, endDate });
    await emitPoultryEvent('updated', medication);
    return medication;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.repository.delete(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }
}
