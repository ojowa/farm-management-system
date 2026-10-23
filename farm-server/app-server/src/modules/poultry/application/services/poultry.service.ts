import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
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

  async deletePoultryHouse(organizationId: string, id: string): Promise<void> {
    await this.getPoultryHouseById(organizationId, id);
    await this.repo.deletePoultryHouse(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
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

  async deletePen(organizationId: string, id: string): Promise<void> {
    await this.getPenById(organizationId, id);
    await this.repo.deletePen(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
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

  async deleteBreed(id: string): Promise<void> {
    await this.getBreedById(id);
    await this.repo.deleteBreed(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id });
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
    // P6: batch codes are unique per organization. The DB enforces it with a
    // partial unique index; check first so a duplicate returns a clear 409
    // instead of a raw P2002 leaking through as a 500.
    if (data.batchCode) {
      const existing = await this.repo.findFlockByBatchCode(organizationId, data.batchCode);
      if (existing) {
        throw new ConflictException(
          `A flock with batch code "${data.batchCode}" already exists in your organization`,
        );
      }
    }
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
    // P6: re-check batchCode uniqueness when it changes.
    if (rest.batchCode) {
      const clash = await this.repo.findFlockByBatchCode(organizationId, rest.batchCode, id);
      if (clash) {
        throw new ConflictException(
          `A flock with batch code "${rest.batchCode}" already exists in your organization`,
        );
      }
    }
    const arrivalDate = rawArrivalDate
      ? typeof rawArrivalDate === 'string'
        ? new Date(rawArrivalDate)
        : rawArrivalDate
      : undefined;
    const flock = await this.repo.updateFlock(id, { ...rest, ...(arrivalDate !== undefined ? { arrivalDate } : {}) });
    this.events.emitDomainEvent('poultry', 'updated', { ...flock, organizationId });
    return flock;
  }

  async deleteFlock(organizationId: string, id: string): Promise<void> {
    await this.getFlockById(organizationId, id);
    await this.repo.deleteFlock(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
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

  async deleteFeedingRecord(organizationId: string, id: string): Promise<void> {
    await this.getFeedingRecordById(organizationId, id);
    await this.repo.deleteFeedingRecord(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
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
    // Validate the flock belongs to the caller's org before the transaction.
    await this.getFlockById(organizationId, data.flockId);
    const date = typeof data.date === 'string' ? new Date(data.date) : data.date;
    // P3: the record insert and the flock decrement now happen in ONE
    // transaction — a crash between the two writes used to leave the flock
    // count permanently wrong (birds recorded dead, still counted alive).
    // The availability check also moved inside the transaction so a concurrent
    // write can't race past it.
    const record = await this.repo.createMortalityRecordWithFlockAdjust({ ...data, date }, data.count);
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
    // Validate any NEW flock the record is being moved to belongs to the org.
    if (data.flockId && data.flockId !== originalRecord.flockId) {
      await this.getFlockById(organizationId, data.flockId);
    }
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    // P3: build the full diff. The old code only applied a `count` delta to
    // the ORIGINAL flock, so REASSIGNING a record to a different flock
    // double-decremented the old one and never touched the new one. Pass both
    // sides so the repository can credit the old flock and debit the new one
    // atomically.
    const newCount = data.count ?? originalRecord.count;
    const movedFlock = data.flockId && data.flockId !== originalRecord.flockId;
    const diff = {
      // Net change applied to the flock the record stays with.
      countDelta: newCount - originalRecord.count,
      // The flock the record stays with (used for the stationary count-change
      // case; ignored when the record is reassigned via from/to).
      flockId: originalRecord.flockId,
      // Old flock is credited back for the full original count when the record
      // leaves it (reassignment) — otherwise the repo applies countDelta only.
      ...(movedFlock ? { from: { flockId: originalRecord.flockId, count: originalRecord.count } } : {}),
      ...(movedFlock ? { to: { flockId: data.flockId as string, count: newCount } } : {}),
    };
    const record = await this.repo.updateMortalityRecordWithFlockAdjust(id, { ...data, date }, diff);
    this.events.emitDomainEvent('poultry', 'updated', { ...record, organizationId });
    return record;
  }

  async deleteMortalityRecord(organizationId: string, id: string): Promise<void> {
    const record = await this.getMortalityRecordById(organizationId, id);
    // P3: credit the flock back and delete the row in ONE transaction.
    await this.repo.deleteMortalityRecordWithFlockRestore(id, { flockId: record.flockId, count: record.count });
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
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

  async deleteMedication(organizationId: string, id: string): Promise<void> {
    await this.getMedicationById(organizationId, id);
    await this.repo.deleteMedication(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
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

  async deleteEggProduction(organizationId: string, id: string): Promise<void> {
    await this.getEggProductionById(organizationId, id);
    await this.repo.deleteEggProduction(id);
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
  }

  // ── PoultrySale ──
  async createPoultrySale(organizationId: string, data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'> & { date?: Date | string }): Promise<PoultrySale> {
    this.requireOrg(organizationId);
    if (data.farmId) await this.assertFarmInOrg(data.farmId, organizationId);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : new Date();
    // P2: when the sale is tied to a flock, the birds must LEAVE the flock in
    // the same transaction that writes the sale row — and the quantity is
    // validated against live availability inside that transaction (the Zod
    // schema already rejects non-positive quantities, so a negative "sale"
    // can no longer silently ADD birds).
    let record: PoultrySale;
    if (data.flockId) {
      record = await this.repo.createPoultrySaleWithFlockAdjust(
        { ...data, organizationId, date },
        data.flockId,
        data.quantity,
      );
    } else {
      record = await this.repo.createPoultrySale({ ...data, organizationId, date });
    }
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
    const original = await this.getPoultrySaleById(organizationId, id);
    if (data.farmId) await this.assertFarmInOrg(data.farmId, organizationId);
    if (data.flockId) await this.getFlockById(organizationId, data.flockId);
    const date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : undefined;
    const { organizationId: _ignored, ...rest } = data;
    const newQuantity = data.quantity ?? original.quantity;
    const newFlockId = data.flockId ?? original.flockId ?? null;
    const movedFlock = newFlockId && newFlockId !== (original.flockId ?? null);
    // P2: re-credit the OLD flock and re-debit the NEW one (or just the
    // quantity delta) when a sale is edited, atomically with the row update.
    if (newFlockId) {
      const adjustments = {
        ...(original.flockId && original.flockId !== newFlockId
          ? { from: { flockId: original.flockId, quantity: original.quantity } }
          : {}),
        ...(movedFlock || data.quantity !== undefined
          ? { to: { flockId: newFlockId, quantity: newQuantity } }
          : {}),
      };
      const record = await this.repo.updatePoultrySaleWithFlockAdjust(id, { ...rest, date }, adjustments);
      this.events.emitDomainEvent('poultry', 'updated', record);
      return record;
    }
    const record = await this.repo.updatePoultrySale(id, { ...rest, date });
    this.events.emitDomainEvent('poultry', 'updated', record);
    return record;
  }

  async deletePoultrySale(organizationId: string, id: string): Promise<void> {
    const original = await this.getPoultrySaleById(organizationId, id);
    // P2: birds that came back (the sale is removed) rejoin the flock,
    // atomically with the row delete.
    await this.repo.deletePoultrySaleWithFlockRestore(id, {
      flockId: original.flockId ?? null,
      quantity: original.quantity,
      organizationId,
    });
    this.events.emitDomainEvent('poultry', 'deleted', { id, organizationId });
  }
}
