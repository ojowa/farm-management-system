import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PoultryRepository } from '../../infrastructure/persistence/poultry.repository';
import { emitPoultryEvent } from '@farm/utils';

@Injectable()
export class PoultryApplicationService {
  constructor(private readonly repository: PoultryRepository) {}

  // --- PoultryHouse ---
  async createPoultryHouse(data: any) {
    const house = await this.repository.createPoultryHouse(data);
    await emitPoultryEvent('created', house);
    return house;
  }

  async getPoultryHouseById(id: string) {
    const house = await this.repository.getPoultryHouseById(id);
    if (!house) {
      throw new NotFoundException(`PoultryHouse with ID ${id} not found`);
    }
    return house;
  }

  async getAllPoultryHouses(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllPoultryHouses(filter, sortBy, sortOrder, page, limit);
  }

  async updatePoultryHouse(id: string, data: any) {
    await this.getPoultryHouseById(id);
    const house = await this.repository.updatePoultryHouse(id, data);
    await emitPoultryEvent('updated', house);
    return house;
  }

  async deletePoultryHouse(id: string) {
    await this.getPoultryHouseById(id);
    await this.repository.deletePoultryHouse(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Pen ---
  async createPen(data: any) {
    await this.getPoultryHouseById(data.poultryHouseId);
    const pen = await this.repository.createPen(data);
    await emitPoultryEvent('created', pen);
    return pen;
  }

  async getPenById(id: string) {
    const pen = await this.repository.getPenById(id);
    if (!pen) {
      throw new NotFoundException(`Pen with ID ${id} not found`);
    }
    return pen;
  }

  async getAllPens(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllPens(filter, sortBy, sortOrder, page, limit);
  }

  async updatePen(id: string, data: any) {
    await this.getPenById(id);
    if (data.poultryHouseId) {
      await this.getPoultryHouseById(data.poultryHouseId);
    }
    const pen = await this.repository.updatePen(id, data);
    await emitPoultryEvent('updated', pen);
    return pen;
  }

  async deletePen(id: string) {
    await this.getPenById(id);
    await this.repository.deletePen(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Breed ---
  async createBreed(data: any) {
    const breed = await this.repository.createBreed(data);
    await emitPoultryEvent('created', breed);
    return breed;
  }

  async getBreedById(id: string) {
    const breed = await this.repository.getBreedById(id);
    if (!breed) {
      throw new NotFoundException(`Breed with ID ${id} not found`);
    }
    return breed;
  }

  async getAllBreeds(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'name', sortOrder = 'asc', page = 1, limit = 20 } = params;
    return this.repository.getAllBreeds(filter, sortBy, sortOrder, page, limit);
  }

  async updateBreed(id: string, data: any) {
    await this.getBreedById(id);
    const breed = await this.repository.updateBreed(id, data);
    await emitPoultryEvent('updated', breed);
    return breed;
  }

  async deleteBreed(id: string) {
    await this.getBreedById(id);
    await this.repository.deleteBreed(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Flock ---
  async createFlock(data: any) {
    await this.getPenById(data.penId);
    await this.getBreedById(data.breedId);
    const arrivalDate = typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate;
    const flock = await this.repository.createFlock({ ...data, arrivalDate });
    await emitPoultryEvent('created', flock);
    return flock;
  }

  async getFlockById(id: string) {
    const flock = await this.repository.getFlockById(id);
    if (!flock) {
      throw new NotFoundException(`Flock with ID ${id} not found`);
    }
    return flock;
  }

  async getAllFlocks(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllFlocks(filter, sortBy, sortOrder, page, limit);
  }

  async updateFlock(id: string, data: any) {
    await this.getFlockById(id);
    if (data.penId) await this.getPenById(data.penId);
    if (data.breedId) await this.getBreedById(data.breedId);
    const arrivalDate = data.arrivalDate ? (typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate) : undefined;
    const flock = await this.repository.updateFlock(id, { ...data, arrivalDate });
    await emitPoultryEvent('updated', flock);
    return flock;
  }

  async deleteFlock(id: string) {
    await this.getFlockById(id);
    await this.repository.deleteFlock(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- FeedingRecord ---
  async createFeedingRecord(data: any) {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repository.createFeedingRecord({ ...data, date });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getFeedingRecordById(id: string) {
    const record = await this.repository.getFeedingRecordById(id);
    if (!record) {
      throw new NotFoundException(`Feeding record with ID ${id} not found`);
    }
    return record;
  }

  async getAllFeedingRecords(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllFeedingRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateFeedingRecord(id: string, data: any) {
    await this.getFeedingRecordById(id);
    if (data.flockId) await this.getFlockById(data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repository.updateFeedingRecord(id, { ...data, date });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteFeedingRecord(id: string) {
    await this.getFeedingRecordById(id);
    await this.repository.deleteFeedingRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- VaccinationRecord ---
  async createVaccinationRecord(data: any) {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repository.createVaccinationRecord({ ...data, date });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getVaccinationRecordById(id: string) {
    const record = await this.repository.getVaccinationRecordById(id);
    if (!record) {
      throw new NotFoundException(`Vaccination record with ID ${id} not found`);
    }
    return record;
  }

  async getAllVaccinationRecords(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllVaccinationRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateVaccinationRecord(id: string, data: any) {
    await this.getVaccinationRecordById(id);
    if (data.flockId) await this.getFlockById(data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repository.updateVaccinationRecord(id, { ...data, date });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteVaccinationRecord(id: string) {
    await this.getVaccinationRecordById(id);
    await this.repository.deleteVaccinationRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- MortalityRecord ---
  async createMortalityRecord(data: any) {
    const flock = await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    if (data.count > flock.currentCount) {
      throw new BadRequestException(`Mortality count (${data.count}) cannot exceed current flock bird count (${flock.currentCount})`);
    }
    const record = await this.repository.createMortalityRecord({ ...data, date });
    const updatedCount = flock.currentCount - data.count;
    await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getMortalityRecordById(id: string) {
    const record = await this.repository.getMortalityRecordById(id);
    if (!record) {
      throw new NotFoundException(`Mortality record with ID ${id} not found`);
    }
    return record;
  }

  async getAllMortalityRecords(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllMortalityRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateMortalityRecord(id: string, data: any) {
    const originalRecord = await this.getMortalityRecordById(id);
    const flock = await this.getFlockById(originalRecord.flockId);
    let countDiff = 0;
    if (data.count !== undefined) {
      countDiff = data.count - originalRecord.count;
      if (countDiff > flock.currentCount) {
        throw new BadRequestException(`Updated mortality count exceeds available flock count by ${countDiff - flock.currentCount}`);
      }
    }
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repository.updateMortalityRecord(id, { ...data, date });
    if (countDiff !== 0) {
      const updatedCount = flock.currentCount - countDiff;
      await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
    }
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteMortalityRecord(id: string) {
    const record = await this.getMortalityRecordById(id);
    const flock = await this.getFlockById(record.flockId);
    const updatedCount = flock.currentCount + record.count;
    await this.repository.updateFlock(flock.id, { currentCount: updatedCount });
    await this.repository.deleteMortalityRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Medication (delegated to MedicationService) ---
  async createMedication(data: any) {
    await this.getFlockById(data.flockId);
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null;
    const record = await this.repository.createMedication({ ...data, startDate, endDate });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getMedicationById(id: string) {
    const record = await this.repository.getMedicationById(id);
    if (!record) {
      throw new NotFoundException(`Medication with ID ${id} not found`);
    }
    return record;
  }

  async getAllMedications(filter: any = {}, params: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repository.getAllMedications(filter, sortBy, sortOrder, page, limit);
  }

  async updateMedication(id: string, data: any) {
    await this.getMedicationById(id);
    if (data.flockId) await this.getFlockById(data.flockId);
    const startDate = data.startDate ? (typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate) : undefined;
    const endDate = data.endDate !== undefined ? (data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null) : undefined;
    const record = await this.repository.updateMedication(id, { ...data, startDate, endDate });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteMedication(id: string) {
    await this.getMedicationById(id);
    await this.repository.deleteMedication(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }
}
