import { MedicationRepository, MedicationPaginationParams } from './medication.repository';
import { PoultryService } from './poultry.service';
import {
  CreateMedicationRequest,
  UpdateMedicationRequest,
} from '@farm/types';

export class MedicationService {
  private repository = new MedicationRepository();
  private poultryService = new PoultryService();

  async create(data: CreateMedicationRequest) {
    await this.poultryService.getFlockById(data.flockId);

    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = data.endDate
      ? typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate
      : null;

    return this.repository.create({
      ...data,
      startDate,
      endDate,
    });
  }

  async getById(id: string) {
    const medication = await this.repository.getById(id);
    if (!medication) {
      throw new Error(`Medication with ID ${id} not found`);
    }
    return medication;
  }

  async getAll(params: MedicationPaginationParams) {
    return this.repository.getAll(params);
  }

  async update(id: string, data: UpdateMedicationRequest) {
    await this.getById(id);

    if (data.flockId) {
      await this.poultryService.getFlockById(data.flockId);
    }

    const startDate = data.startDate ? (typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate) : undefined;
    const endDate = data.endDate !== undefined
      ? (data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null)
      : undefined;

    return this.repository.update(id, {
      ...data,
      startDate,
      endDate,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.repository.delete(id);
  }
}
