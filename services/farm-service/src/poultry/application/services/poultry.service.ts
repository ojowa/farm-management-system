import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  PoultryAggregateRepository,
  PoultryHouseFilter,
  PenFilter,
  BreedFilter,
  FlockFilter,
  FeedingRecordFilter,
  VaccinationRecordFilter,
  MortalityRecordFilter,
  MedicationFilter,
  PaginatedResult,
  PaginationParams,
} from '../../domain/repositories/poultry.repository';
import { emitPoultryEvent } from '@farm/utils';
import {
  PoultryHouse,
  Pen,
  Breed,
  Flock,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
} from '../../domain/entities/poultry.entity';

@Injectable()
export class PoultryApplicationService {
  constructor(@Inject('PoultryRepository') private readonly repo: PoultryAggregateRepository) {}

  // ── PoultryHouse ──
  async createPoultryHouse(data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse> {
    const house = await this.repo.createPoultryHouse(data);
    await emitPoultryEvent('created', house);
    return house;
  }

  async getPoultryHouseById(id: string): Promise<PoultryHouse> {
    const house = await this.repo.findPoultryHouseById(id);
    if (!house) throw new NotFoundException(`PoultryHouse with ID ${id} not found`);
    return house;
  }

  async getAllPoultryHouses(filter: PoultryHouseFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<PoultryHouse>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllPoultryHouses(filter, sortBy, sortOrder, page, limit);
  }

  async updatePoultryHouse(id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse> {
    await this.getPoultryHouseById(id);
    const house = await this.repo.updatePoultryHouse(id, data);
    await emitPoultryEvent('updated', house);
    return house;
  }

  async deletePoultryHouse(id: string): Promise<{ deleted: boolean }> {
    await this.getPoultryHouseById(id);
    await this.repo.deletePoultryHouse(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── Pen ──
  async createPen(data: Omit<Pen, 'id'>): Promise<Pen> {
    await this.getPoultryHouseById(data.poultryHouseId);
    const pen = await this.repo.createPen(data);
    await emitPoultryEvent('created', pen);
    return pen;
  }

  async getPenById(id: string): Promise<Pen> {
    const pen = await this.repo.findPenById(id);
    if (!pen) throw new NotFoundException(`Pen with ID ${id} not found`);
    return pen;
  }

  async getAllPens(filter: PenFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<Pen>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllPens(filter, sortBy, sortOrder, page, limit);
  }

  async updatePen(id: string, data: Partial<Pen>): Promise<Pen> {
    await this.getPenById(id);
    if (data.poultryHouseId) await this.getPoultryHouseById(data.poultryHouseId);
    const pen = await this.repo.updatePen(id, data);
    await emitPoultryEvent('updated', pen);
    return pen;
  }

  async deletePen(id: string): Promise<{ deleted: boolean }> {
    await this.getPenById(id);
    await this.repo.deletePen(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── Breed ──
  async createBreed(data: Omit<Breed, 'id'>): Promise<Breed> {
    const breed = await this.repo.createBreed(data);
    await emitPoultryEvent('created', breed);
    return breed;
  }

  async getBreedById(id: string): Promise<Breed> {
    const breed = await this.repo.findBreedById(id);
    if (!breed) throw new NotFoundException(`Breed with ID ${id} not found`);
    return breed;
  }

  async getAllBreeds(filter: BreedFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<Breed>> {
    const { sortBy = 'name', sortOrder = 'asc', page = 1, limit = 20 } = params;
    return this.repo.findAllBreeds(filter, sortBy, sortOrder, page, limit);
  }

  async updateBreed(id: string, data: Partial<Breed>): Promise<Breed> {
    await this.getBreedById(id);
    const breed = await this.repo.updateBreed(id, data);
    await emitPoultryEvent('updated', breed);
    return breed;
  }

  async deleteBreed(id: string): Promise<{ deleted: boolean }> {
    await this.getBreedById(id);
    await this.repo.deleteBreed(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── Flock ──
  async createFlock(data: Omit<Flock, 'id' | 'createdAt' | 'updatedAt'> & { arrivalDate: Date | string }): Promise<Flock> {
    await this.getPenById(data.penId);
    await this.getBreedById(data.breedId);
    const arrivalDate = typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate;
    const flock = await this.repo.createFlock({ ...data, arrivalDate });
    await emitPoultryEvent('created', flock);
    return flock;
  }

  async getFlockById(id: string): Promise<Flock> {
    const flock = await this.repo.findFlockById(id);
    if (!flock) throw new NotFoundException(`Flock with ID ${id} not found`);
    return flock;
  }

  async getAllFlocks(filter: FlockFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<Flock>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllFlocks(filter, sortBy, sortOrder, page, limit);
  }

  async updateFlock(id: string, data: Partial<Flock> & { arrivalDate?: Date | string }): Promise<Flock> {
    await this.getFlockById(id);
    if (data.penId) await this.getPenById(data.penId);
    if (data.breedId) await this.getBreedById(data.breedId);
    const arrivalDate = data.arrivalDate ? (typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate) : undefined;
    const flock = await this.repo.updateFlock(id, { ...data, arrivalDate });
    await emitPoultryEvent('updated', flock);
    return flock;
  }

  async deleteFlock(id: string): Promise<{ deleted: boolean }> {
    await this.getFlockById(id);
    await this.repo.deleteFlock(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── FeedingRecord ──
  async createFeedingRecord(data: Omit<FeedingRecord, 'id' | 'createdAt'> & { date: Date | string }): Promise<FeedingRecord> {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repo.createFeedingRecord({ ...data, date });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getFeedingRecordById(id: string): Promise<FeedingRecord> {
    const record = await this.repo.findFeedingRecordById(id);
    if (!record) throw new NotFoundException(`Feeding record with ID ${id} not found`);
    return record;
  }

  async getAllFeedingRecords(filter: FeedingRecordFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<FeedingRecord>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllFeedingRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateFeedingRecord(id: string, data: Partial<FeedingRecord> & { date?: Date | string }): Promise<FeedingRecord> {
    await this.getFeedingRecordById(id);
    if (data.flockId) await this.getFlockById(data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repo.updateFeedingRecord(id, { ...data, date });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteFeedingRecord(id: string): Promise<{ deleted: boolean }> {
    await this.getFeedingRecordById(id);
    await this.repo.deleteFeedingRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── VaccinationRecord ──
  async createVaccinationRecord(data: Omit<VaccinationRecord, 'id' | 'createdAt'> & { date: Date | string }): Promise<VaccinationRecord> {
    await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repo.createVaccinationRecord({ ...data, date });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getVaccinationRecordById(id: string): Promise<VaccinationRecord> {
    const record = await this.repo.findVaccinationRecordById(id);
    if (!record) throw new NotFoundException(`Vaccination record with ID ${id} not found`);
    return record;
  }

  async getAllVaccinationRecords(filter: VaccinationRecordFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<VaccinationRecord>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllVaccinationRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateVaccinationRecord(id: string, data: Partial<VaccinationRecord> & { date?: Date | string }): Promise<VaccinationRecord> {
    await this.getVaccinationRecordById(id);
    if (data.flockId) await this.getFlockById(data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repo.updateVaccinationRecord(id, { ...data, date });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteVaccinationRecord(id: string): Promise<{ deleted: boolean }> {
    await this.getVaccinationRecordById(id);
    await this.repo.deleteVaccinationRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── MortalityRecord ──
  async createMortalityRecord(data: Omit<MortalityRecord, 'id' | 'createdAt'> & { date: Date | string; count: number }): Promise<MortalityRecord> {
    const flock = await this.getFlockById(data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    if (data.count > flock.currentCount) {
      throw new BadRequestException(`Mortality count (${data.count}) cannot exceed current flock bird count (${flock.currentCount})`);
    }
    const record = await this.repo.createMortalityRecord({ ...data, date });
    await this.repo.updateFlock(flock.id, { currentCount: flock.currentCount - data.count });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getMortalityRecordById(id: string): Promise<MortalityRecord> {
    const record = await this.repo.findMortalityRecordById(id);
    if (!record) throw new NotFoundException(`Mortality record with ID ${id} not found`);
    return record;
  }

  async getAllMortalityRecords(filter: MortalityRecordFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<MortalityRecord>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllMortalityRecords(filter, sortBy, sortOrder, page, limit);
  }

  async updateMortalityRecord(id: string, data: Partial<MortalityRecord> & { date?: Date | string }): Promise<MortalityRecord> {
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
    const record = await this.repo.updateMortalityRecord(id, { ...data, date });
    if (countDiff !== 0) {
      await this.repo.updateFlock(flock.id, { currentCount: flock.currentCount - countDiff });
    }
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteMortalityRecord(id: string): Promise<{ deleted: boolean }> {
    const record = await this.getMortalityRecordById(id);
    const flock = await this.getFlockById(record.flockId);
    await this.repo.updateFlock(flock.id, { currentCount: flock.currentCount + record.count });
    await this.repo.deleteMortalityRecord(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }

  // ── Medication ──
  async createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { startDate: Date | string; endDate?: Date | string | null }): Promise<Medication> {
    await this.getFlockById(data.flockId);
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null;
    const record = await this.repo.createMedication({ ...data, startDate, endDate });
    await emitPoultryEvent('created', record);
    return record;
  }

  async getMedicationById(id: string): Promise<Medication> {
    const record = await this.repo.findMedicationById(id);
    if (!record) throw new NotFoundException(`Medication with ID ${id} not found`);
    return record;
  }

  async getAllMedications(filter: MedicationFilter = {}, params: PaginationParams = {}): Promise<PaginatedResult<Medication>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllMedications(filter, sortBy, sortOrder, page, limit);
  }

  async updateMedication(id: string, data: Partial<Medication> & { startDate?: Date | string; endDate?: Date | string | null }): Promise<Medication> {
    await this.getMedicationById(id);
    if (data.flockId) await this.getFlockById(data.flockId);
    const startDate = data.startDate ? (typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate) : undefined;
    const endDate = data.endDate !== undefined ? (data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null) : undefined;
    const record = await this.repo.updateMedication(id, { ...data, startDate, endDate });
    await emitPoultryEvent('updated', record);
    return record;
  }

  async deleteMedication(id: string): Promise<{ deleted: boolean }> {
    await this.getMedicationById(id);
    await this.repo.deleteMedication(id);
    await emitPoultryEvent('deleted', { id });
    return { deleted: true };
  }
}
