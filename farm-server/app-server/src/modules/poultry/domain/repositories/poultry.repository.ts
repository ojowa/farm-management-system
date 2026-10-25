import {
  PoultryHouse,
  Pen,
  Breed,
  Flock,
  FlockWrite,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
  EggProduction,
  PoultrySale,
} from '../entities/poultry.entity';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Every org-scoped filter carries a required `organizationId`: the repository
// uses it to constrain queries to the caller's organization, either directly
// (Flock, EggProduction, PoultrySale) or through the owning chain
// (House → Farm, Pen → House → Farm, records → Flock). `Breed` is a shared
// catalog with no organization column, so BreedFilter intentionally has none.

export interface PoultryHouseFilter {
  organizationId: string;
  farmId?: string;
  name?: string;
}

export interface PenFilter {
  organizationId: string;
  poultryHouseId?: string;
  /** Narrow to the pens of a single farm via Pen → House → Farm. */
  farmId?: string;
  name?: string;
}

export interface BreedFilter {
  name?: string;
  birdType?: string;
}

export interface FlockFilter {
  organizationId: string;
  farmId?: string;
  poultryHouseId?: string;
  penId?: string;
  breedId?: string;
  status?: string;
  search?: string;
}

export interface FeedingRecordFilter {
  organizationId: string;
  flockId?: string;
  poultryHouseId?: string;
  feedType?: string;
}

export interface VaccinationRecordFilter {
  organizationId: string;
  flockId?: string;
  vaccine?: string;
}

export interface MortalityRecordFilter {
  organizationId: string;
  flockId?: string;
}

export interface MedicationFilter {
  organizationId: string;
  flockId?: string;
  status?: string;
  search?: string;
}

export interface EggProductionFilter {
  organizationId: string;
  flockId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PoultrySaleFilter {
  organizationId: string;
  farmId?: string;
  flockId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PoultryAggregateRepository {
  // Ownership helper: the FK only proves a farm exists, not that it belongs
  // to the caller's organization.
  farmExistsInOrg(farmId: string, organizationId: string): Promise<boolean>;

  // PoultryHouse
  findPoultryHouseById(id: string, organizationId: string): Promise<PoultryHouse | null>;
  findAllPoultryHouses(filter: PoultryHouseFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultryHouse>>;
  createPoultryHouse(data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse>;
  updatePoultryHouse(id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse>;
  deletePoultryHouse(id: string): Promise<void>;

  // Pen
  findPenById(id: string, organizationId: string): Promise<Pen | null>;
  findAllPens(filter: PenFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Pen>>;
  createPen(data: Omit<Pen, 'id'> & { farmId?: string }): Promise<Pen>;
  updatePen(id: string, data: Partial<Pen>): Promise<Pen>;
  deletePen(id: string): Promise<void>;

  // Breed (shared catalog — no organization scoping)
  findBreedById(id: string): Promise<Breed | null>;
  findAllBreeds(filter: BreedFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Breed>>;
  createBreed(data: Omit<Breed, 'id'> & { organizationId?: string }): Promise<Breed>;
  updateBreed(id: string, data: Partial<Breed>): Promise<Breed>;
  deleteBreed(id: string): Promise<void>;

  // Flock
  findFlockById(id: string, organizationId: string): Promise<Flock | null>;
  /** P6: in-org batchCode lookup so the service can return a clear 409. */
  findFlockByBatchCode(organizationId: string, batchCode: string, excludeId?: string): Promise<Flock | null>;
  findAllFlocks(filter: FlockFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Flock>>;
  createFlock(data: Omit<FlockWrite, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flock>;
  updateFlock(id: string, data: Partial<FlockWrite>): Promise<Flock>;
  deleteFlock(id: string): Promise<void>;

  // FeedingRecord
  findFeedingRecordById(id: string, organizationId: string): Promise<FeedingRecord | null>;
  findAllFeedingRecords(filter: FeedingRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<FeedingRecord>>;
  createFeedingRecord(data: Omit<FeedingRecord, 'id' | 'createdAt'>): Promise<FeedingRecord>;
  updateFeedingRecord(id: string, data: Partial<FeedingRecord>): Promise<FeedingRecord>;
  deleteFeedingRecord(id: string): Promise<void>;

  // VaccinationRecord
  findVaccinationRecordById(id: string, organizationId: string): Promise<VaccinationRecord | null>;
  findAllVaccinationRecords(filter: VaccinationRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<VaccinationRecord>>;
  createVaccinationRecord(data: Omit<VaccinationRecord, 'id' | 'createdAt'>): Promise<VaccinationRecord>;
  updateVaccinationRecord(id: string, data: Partial<VaccinationRecord>): Promise<VaccinationRecord>;
  deleteVaccinationRecord(id: string): Promise<void>;

  // MortalityRecord
  findMortalityRecordById(id: string, organizationId: string): Promise<MortalityRecord | null>;
  findAllMortalityRecords(filter: MortalityRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<MortalityRecord>>;
  createMortalityRecord(data: Omit<MortalityRecord, 'id' | 'createdAt'>): Promise<MortalityRecord>;
  /** P3: create the record AND decrement the flock count in one transaction. */
  createMortalityRecordWithFlockAdjust(
    data: Omit<MortalityRecord, 'id' | 'createdAt'>,
    count: number,
  ): Promise<MortalityRecord>;
  /** P3: apply the full count/flock reassignment diff to BOTH flocks atomically. */
  updateMortalityRecordWithFlockAdjust(
    id: string,
    data: Partial<MortalityRecord> & { date?: Date | string },
    diff: { countDelta: number; flockId?: string; from?: { flockId: string; count: number }; to?: { flockId: string; count: number } },
  ): Promise<MortalityRecord>;
  /** P3: credit the flock back for the removed birds, then delete — atomically. */
  deleteMortalityRecordWithFlockRestore(id: string, record: { flockId: string; count: number }): Promise<void>;
  updateMortalityRecord(id: string, data: Partial<MortalityRecord>): Promise<MortalityRecord>;
  deleteMortalityRecord(id: string): Promise<void>;

  // Medication
  findMedicationById(id: string, organizationId: string): Promise<Medication | null>;
  findAllMedications(filter: MedicationFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Medication>>;
  createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication>;
  updateMedication(id: string, data: Partial<Medication>): Promise<Medication>;
  deleteMedication(id: string): Promise<void>;

  // EggProduction
  findEggProductionById(id: string, organizationId: string): Promise<EggProduction | null>;
  findAllEggProductions(filter: EggProductionFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<EggProduction>>;
  createEggProduction(data: Omit<EggProduction, 'id' | 'createdAt' | 'updatedAt'>): Promise<EggProduction>;
  updateEggProduction(id: string, data: Partial<EggProduction>): Promise<EggProduction>;
  deleteEggProduction(id: string): Promise<void>;

  // PoultrySale
  findPoultrySaleById(id: string, organizationId: string): Promise<PoultrySale | null>;
  findAllPoultrySales(filter: PoultrySaleFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultrySale>>;
  createPoultrySale(data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt'>): Promise<PoultrySale>;
  /** P2: create the sale AND decrement the flock count (SOLD at 0) atomically. */
  createPoultrySaleWithFlockAdjust(
    data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt'>,
    flockId: string,
    quantity: number,
  ): Promise<PoultrySale>;
  /** P2: re-credit the OLD flock and re-debit the NEW one when a sale is edited. */
  updatePoultrySaleWithFlockAdjust(
    id: string,
    data: Partial<PoultrySale>,
    adjustments: { from?: { flockId: string; quantity: number }; to?: { flockId: string; quantity: number } },
  ): Promise<PoultrySale>;
  /** P2: birds that came back (sale removed) rejoin the flock, atomically. */
  deletePoultrySaleWithFlockRestore(
    id: string,
    sale: { flockId: string | null; quantity: number; organizationId: string },
  ): Promise<void>;
  updatePoultrySale(id: string, data: Partial<PoultrySale>): Promise<PoultrySale>;
  deletePoultrySale(id: string): Promise<void>;
}
