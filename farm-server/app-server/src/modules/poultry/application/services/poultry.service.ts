import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
  EggProductionFilter,
  PoultrySaleFilter,
  PaginatedResult,
  PaginationParams,
} from '../../domain/repositories/poultry.repository';
import { EventBus } from '../../../realtime/event-bus';
import {
  PoultryHouse,
  Pen,
  Breed,
  Flock,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
  EggProduction,
  PoultrySale,
} from '../../domain/entities/poultry.entity';

/**
 * Every method takes the caller's `organizationId` (from the verified JWT,
 * never from the request body). Reads are org-scoped in the repository;
 * creates validate the parent (farm/house/pen/flock) belongs to the caller
 * and stamp organizationId from the caller, not the payload; updates/deletes
 * perform a scoped lookup first, so a foreign record 404s instead of leaking.
 * Event payloads carry organizationId so realtime broadcasts stay in-org.
 */
@Injectable()
export class PoultryApplicationService {
  constructor(
    @Inject('PoultryRepository') private readonly repo: PoultryAggregateRepository,
    private readonly events: EventBus,
  ) {}

  private requireOrg(organizationId: string): void {
    if (!organizationId) throw new ForbiddenException('No organization context');
  }

  private async assertFarmInOrg(farmId: string, organizationId: string): Promise<void> {
    if (!farmId) throw new BadRequestException('farmId is required');
    if (!(await this.repo.farmExistsInOrg(farmId, organizationId))) {
      throw new BadRequestException('Unknown farm');
    }
  }

  // ── PoultryHouse ──
  async createPoultryHouse(organizationId: string, data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse> {
    this.requireOrg(organizationId);
    await this.assertFarmInOrg(data.farmId, organizationId);
    const house = await this.repo.createPoultryHouse(data);
    this.events.emitDomainEvent('poultry', 'created', { ...house, organizationId });
    return house;
  }

  async getPoultryHouseById(organizationId: string, id: string): Promise<PoultryHouse> {
    const house = await this.repo.findPoultryHouseById(id, organizationId);
    if (!house) throw new NotFoundException(`PoultryHouse with ID ${id} not found`);
    return house;
  }

  async getAllPoultryHouses(organizationId: string, filter: Omit<PoultryHouseFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<PoultryHouse>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllPoultryHouses({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updatePoultryHouse(organizationId: string, id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse> {
    await this.getPoultryHouseById(organizationId, id);
    if (data.farmId !== undefined) await this.assertFarmInOrg(data.farmId, organizationId);
    const house = await this.repo.updatePoultryHouse(id, data);
    this.events.emitDomainEvent('poultry', 'updated', { ...house, organizationId });
    return house;
  }

  async deletePoultryHouse(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getPoultryHouseById(organizationId, id);
    await this.repo.deletePoultryHouse(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── Pen ──
  async createPen(organizationId: string, data: Omit<Pen, 'id'>): Promise<Pen> {
    this.requireOrg(organizationId);
    await this.getPoultryHouseById(organizationId, data.poultryHouseId);
    const pen = await this.repo.createPen(data);
    this.events.emitDomainEvent('poultry', 'created', { ...pen, organizationId });
    return pen;
  }

  async getPenById(organizationId: string, id: string): Promise<Pen> {
    const pen = await this.repo.findPenById(id, organizationId);
    if (!pen) throw new NotFoundException(`Pen with ID ${id} not found`);
    return pen;
  }

  async getAllPens(organizationId: string, filter: Omit<PenFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<Pen>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllPens({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updatePen(organizationId: string, id: string, data: Partial<Pen>): Promise<Pen> {
    await this.getPenById(organizationId, id);
    if (data.poultryHouseId) await this.getPoultryHouseById(organizationId, data.poultryHouseId);
    const pen = await this.repo.updatePen(id, data);
    this.events.emitDomainEvent('poultry', 'updated', { ...pen, organizationId });
    return pen;
  }

  async deletePen(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getPenById(organizationId, id);
    await this.repo.deletePen(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── Breed (shared catalog — intentionally not org-scoped) ──
  async createBreed(data: Omit<Breed, 'id'>): Promise<Breed> {
    const breed = await this.repo.createBreed(data);
    this.events.emitDomainEvent('poultry', 'created', breed);
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
    this.events.emitDomainEvent('poultry', 'updated', breed);
    return breed;
  }

  async deleteBreed(id: string): Promise<{ deleted: boolean }> {
    await this.getBreedById(id);
    await this.repo.deleteBreed(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id });
    return { deleted: true };
  }

  // ── Flock ──
  async createFlock(
    organizationId: string,
    data: Omit<Flock, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'> & { arrivalDate: Date | string },
  ): Promise<Flock> {
    this.requireOrg(organizationId);
    await this.getPenById(organizationId, data.penId);
    await this.getBreedById(data.breedId);
    await this.assertFarmInOrg(data.farmId, organizationId);
    const arrivalDate = typeof data.arrivalDate === 'string' ? new Date(data.arrivalDate) : data.arrivalDate;
    // organizationId always comes from the JWT — never from the body, which
    // the old zod schema required clients to supply (spoofable tenancy).
    const flock = await this.repo.createFlock({ ...data, organizationId, arrivalDate });
    this.events.emitDomainEvent('poultry', 'created', flock);
    return flock;
  }

  async getFlockById(organizationId: string, id: string): Promise<Flock> {
    const flock = await this.repo.findFlockById(id, organizationId);
    if (!flock) throw new NotFoundException(`Flock with ID ${id} not found`);
    return flock;
  }

  async getAllFlocks(organizationId: string, filter: Omit<FlockFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<Flock>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllFlocks({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updateFlock(organizationId: string, id: string, data: Partial<Flock> & { arrivalDate?: Date | string }): Promise<Flock> {
    await this.getFlockById(organizationId, id);
    if (data.penId) await this.getPenById(organizationId, data.penId);
    if (data.breedId) await this.getBreedById(data.breedId);
    if (data.farmId) await this.assertFarmInOrg(data.farmId, organizationId);
    // A flock can never change tenancy — drop any organizationId from input.
    const { organizationId: _ignored, arrivalDate: rawArrivalDate, ...rest } = data;
    const arrivalDate = rawArrivalDate
      ? typeof rawArrivalDate === 'string'
        ? new Date(rawArrivalDate)
        : rawArrivalDate
      : undefined;
    const flock = await this.repo.updateFlock(id, { ...rest, ...(arrivalDate !== undefined ? { arrivalDate } : {}) });
    this.events.emitDomainEvent('poultry', 'updated', { ...flock, organizationId });
    return flock;
  }

  async deleteFlock(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getFlockById(organizationId, id);
    await this.repo.deleteFlock(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── FeedingRecord ──
  async createFeedingRecord(organizationId: string, data: Omit<FeedingRecord, 'id' | 'createdAt'> & { date: Date | string }): Promise<FeedingRecord> {
    this.requireOrg(organizationId);
    await this.getFlockById(organizationId, data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repo.createFeedingRecord({ ...data, date });
    this.events.emitDomainEvent('poultry', 'created', { ...record, organizationId });
    return record;
  }

  async getFeedingRecordById(organizationId: string, id: string): Promise<FeedingRecord> {
    const record = await this.repo.findFeedingRecordById(id, organizationId);
    if (!record) throw new NotFoundException(`Feeding record with ID ${id} not found`);
    return record;
  }

  async getAllFeedingRecords(organizationId: string, filter: Omit<FeedingRecordFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<FeedingRecord>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllFeedingRecords({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updateFeedingRecord(organizationId: string, id: string, data: Partial<FeedingRecord> & { date?: Date | string }): Promise<FeedingRecord> {
    await this.getFeedingRecordById(organizationId, id);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repo.updateFeedingRecord(id, { ...data, date });
    this.events.emitDomainEvent('poultry', 'updated', { ...record, organizationId });
    return record;
  }

  async deleteFeedingRecord(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getFeedingRecordById(organizationId, id);
    await this.repo.deleteFeedingRecord(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── VaccinationRecord ──
  async createVaccinationRecord(organizationId: string, data: Omit<VaccinationRecord, 'id' | 'createdAt'> & { date: Date | string }): Promise<VaccinationRecord> {
    this.requireOrg(organizationId);
    await this.getFlockById(organizationId, data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    const record = await this.repo.createVaccinationRecord({ ...data, date });
    this.events.emitDomainEvent('poultry', 'created', { ...record, organizationId });
    return record;
  }

  async getVaccinationRecordById(organizationId: string, id: string): Promise<VaccinationRecord> {
    const record = await this.repo.findVaccinationRecordById(id, organizationId);
    if (!record) throw new NotFoundException(`Vaccination record with ID ${id} not found`);
    return record;
  }

  async getAllVaccinationRecords(organizationId: string, filter: Omit<VaccinationRecordFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<VaccinationRecord>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllVaccinationRecords({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updateVaccinationRecord(organizationId: string, id: string, data: Partial<VaccinationRecord> & { date?: Date | string }): Promise<VaccinationRecord> {
    await this.getVaccinationRecordById(organizationId, id);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const record = await this.repo.updateVaccinationRecord(id, { ...data, date });
    this.events.emitDomainEvent('poultry', 'updated', { ...record, organizationId });
    return record;
  }

  async deleteVaccinationRecord(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getVaccinationRecordById(organizationId, id);
    await this.repo.deleteVaccinationRecord(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── MortalityRecord ──
  async createMortalityRecord(organizationId: string, data: Omit<MortalityRecord, 'id' | 'createdAt'> & { date: Date | string; count: number }): Promise<MortalityRecord> {
    this.requireOrg(organizationId);
    const flock = await this.getFlockById(organizationId, data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    if (data.count > flock.currentCount) {
      throw new BadRequestException(`Mortality count (${data.count}) cannot exceed current flock bird count (${flock.currentCount})`);
    }
    const record = await this.repo.createMortalityRecord({ ...data, date });
    await this.repo.updateFlock(flock.id, { currentCount: flock.currentCount - data.count });
    this.events.emitDomainEvent('poultry', 'created', { ...record, organizationId });
    return record;
  }

  async getMortalityRecordById(organizationId: string, id: string): Promise<MortalityRecord> {
    const record = await this.repo.findMortalityRecordById(id, organizationId);
    if (!record) throw new NotFoundException(`Mortality record with ID ${id} not found`);
    return record;
  }

  async getAllMortalityRecords(organizationId: string, filter: Omit<MortalityRecordFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<MortalityRecord>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllMortalityRecords({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updateMortalityRecord(organizationId: string, id: string, data: Partial<MortalityRecord> & { date?: Date | string }): Promise<MortalityRecord> {
    const originalRecord = await this.getMortalityRecordById(organizationId, id);
    const flock = await this.getFlockById(organizationId, originalRecord.flockId);
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
    this.events.emitDomainEvent('poultry', 'updated', { ...record, organizationId });
    return record;
  }

  async deleteMortalityRecord(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    const record = await this.getMortalityRecordById(organizationId, id);
    const flock = await this.getFlockById(organizationId, record.flockId);
    await this.repo.updateFlock(flock.id, { currentCount: flock.currentCount + record.count });
    await this.repo.deleteMortalityRecord(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── Medication ──
  async createMedication(organizationId: string, data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> & { startDate: Date | string; endDate?: Date | string | null }): Promise<Medication> {
    this.requireOrg(organizationId);
    await this.getFlockById(organizationId, data.flockId);
    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
    const endDate = data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null;
    const record = await this.repo.createMedication({ ...data, startDate, endDate });
    this.events.emitDomainEvent('poultry', 'created', { ...record, organizationId });
    return record;
  }

  async getMedicationById(organizationId: string, id: string): Promise<Medication> {
    const record = await this.repo.findMedicationById(id, organizationId);
    if (!record) throw new NotFoundException(`Medication with ID ${id} not found`);
    return record;
  }

  async getAllMedications(organizationId: string, filter: Omit<MedicationFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<Medication>> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllMedications({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updateMedication(organizationId: string, id: string, data: Partial<Medication> & { startDate?: Date | string; endDate?: Date | string | null }): Promise<Medication> {
    await this.getMedicationById(organizationId, id);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const startDate = data.startDate ? (typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate) : undefined;
    const endDate = data.endDate !== undefined ? (data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null) : undefined;
    const record = await this.repo.updateMedication(id, { ...data, startDate, endDate });
    this.events.emitDomainEvent('poultry', 'updated', { ...record, organizationId });
    return record;
  }

  async deleteMedication(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getMedicationById(organizationId, id);
    await this.repo.deleteMedication(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── EggProduction ──
  async createEggProduction(organizationId: string, data: Omit<EggProduction, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'> & { date?: Date | string }): Promise<EggProduction> {
    this.requireOrg(organizationId);
    await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : new Date();
    const record = await this.repo.createEggProduction({ ...data, organizationId, date });
    this.events.emitDomainEvent('poultry', 'created', record);
    return record;
  }

  async getEggProductionById(organizationId: string, id: string): Promise<EggProduction> {
    const record = await this.repo.findEggProductionById(id, organizationId);
    if (!record) throw new NotFoundException(`Egg production record with ID ${id} not found`);
    return record;
  }

  async getAllEggProductions(organizationId: string, filter: Omit<EggProductionFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<EggProduction>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllEggProductions({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updateEggProduction(organizationId: string, id: string, data: Partial<EggProduction> & { date?: Date | string }): Promise<EggProduction> {
    await this.getEggProductionById(organizationId, id);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    // Never allow a record to change tenancy.
    const { organizationId: _ignored, ...rest } = data;
    const record = await this.repo.updateEggProduction(id, { ...rest, date });
    this.events.emitDomainEvent('poultry', 'updated', record);
    return record;
  }

  async deleteEggProduction(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getEggProductionById(organizationId, id);
    await this.repo.deleteEggProduction(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }

  // ── PoultrySale ──
  async createPoultrySale(organizationId: string, data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'> & { date?: Date | string }): Promise<PoultrySale> {
    this.requireOrg(organizationId);
    if (data.farmId) await this.assertFarmInOrg(data.farmId, organizationId);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : new Date();
    const record = await this.repo.createPoultrySale({ ...data, organizationId, date });
    this.events.emitDomainEvent('poultry', 'created', record);
    return record;
  }

  async getPoultrySaleById(organizationId: string, id: string): Promise<PoultrySale> {
    const record = await this.repo.findPoultrySaleById(id, organizationId);
    if (!record) throw new NotFoundException(`Poultry sale record with ID ${id} not found`);
    return record;
  }

  async getAllPoultrySales(organizationId: string, filter: Omit<PoultrySaleFilter, 'organizationId'> = {}, params: PaginationParams = {}): Promise<PaginatedResult<PoultrySale>> {
    const { sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = params;
    return this.repo.findAllPoultrySales({ ...filter, organizationId }, sortBy, sortOrder, page, limit);
  }

  async updatePoultrySale(organizationId: string, id: string, data: Partial<PoultrySale> & { date?: Date | string }): Promise<PoultrySale> {
    await this.getPoultrySaleById(organizationId, id);
    if (data.farmId) await this.assertFarmInOrg(data.farmId, organizationId);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const { organizationId: _ignored, ...rest } = data;
    const record = await this.repo.updatePoultrySale(id, { ...rest, date });
    this.events.emitDomainEvent('poultry', 'updated', record);
    return record;
  }

  async deletePoultrySale(organizationId: string, id: string): Promise<{ deleted: boolean }> {
    await this.getPoultrySaleById(organizationId, id);
    await this.repo.deletePoultrySale(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
    return { deleted: true };
  }
}
