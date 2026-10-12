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

export interface PoultryHouseFilter {
  farmId?: string;
  name?: string;
}

export interface PenFilter {
  poultryHouseId?: string;
  name?: string;
}

export interface BreedFilter {
  name?: string;
  birdType?: string;
}

export interface FlockFilter {
  farmId?: string;
  penId?: string;
  breedId?: string;
  status?: string;
  search?: string;
}

export interface FeedingRecordFilter {
  flockId?: string;
  feedType?: string;
}

export interface VaccinationRecordFilter {
  flockId?: string;
  vaccine?: string;
}

export interface MortalityRecordFilter {
  flockId?: string;
}

export interface MedicationFilter {
  flockId?: string;
  status?: string;
  search?: string;
}

export interface EggProductionFilter {
  flockId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PoultrySaleFilter {
  farmId?: string;
  flockId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PoultryAggregateRepository {
  // PoultryHouse
  findPoultryHouseById(id: string): Promise<PoultryHouse | null>;
  findAllPoultryHouses(filter: PoultryHouseFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultryHouse>>;
  createPoultryHouse(data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse>;
  updatePoultryHouse(id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse>;
  deletePoultryHouse(id: string): Promise<void>;

  // Pen
  findPenById(id: string): Promise<Pen | null>;
  findAllPens(filter: PenFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Pen>>;
  createPen(data: Omit<Pen, 'id'>): Promise<Pen>;
  updatePen(id: string, data: Partial<Pen>): Promise<Pen>;
  deletePen(id: string): Promise<void>;

  // Breed
  findBreedById(id: string): Promise<Breed | null>;
  findAllBreeds(filter: BreedFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Breed>>;
  createBreed(data: Omit<Breed, 'id'>): Promise<Breed>;
  updateBreed(id: string, data: Partial<Breed>): Promise<Breed>;
  deleteBreed(id: string): Promise<void>;

  // Flock
  findFlockById(id: string): Promise<Flock | null>;
  findAllFlocks(filter: FlockFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Flock>>;
  createFlock(data: Omit<Flock, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flock>;
  updateFlock(id: string, data: Partial<Flock>): Promise<Flock>;
  deleteFlock(id: string): Promise<void>;

  // FeedingRecord
  findFeedingRecordById(id: string): Promise<FeedingRecord | null>;
  findAllFeedingRecords(filter: FeedingRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<FeedingRecord>>;
  createFeedingRecord(data: Omit<FeedingRecord, 'id' | 'createdAt'>): Promise<FeedingRecord>;
  updateFeedingRecord(id: string, data: Partial<FeedingRecord>): Promise<FeedingRecord>;
  deleteFeedingRecord(id: string): Promise<void>;

  // VaccinationRecord
  findVaccinationRecordById(id: string): Promise<VaccinationRecord | null>;
  findAllVaccinationRecords(filter: VaccinationRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<VaccinationRecord>>;
  createVaccinationRecord(data: Omit<VaccinationRecord, 'id' | 'createdAt'>): Promise<VaccinationRecord>;
  updateVaccinationRecord(id: string, data: Partial<VaccinationRecord>): Promise<VaccinationRecord>;
  deleteVaccinationRecord(id: string): Promise<void>;

  // MortalityRecord
  findMortalityRecordById(id: string): Promise<MortalityRecord | null>;
  findAllMortalityRecords(filter: MortalityRecordFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<MortalityRecord>>;
  createMortalityRecord(data: Omit<MortalityRecord, 'id' | 'createdAt'>): Promise<MortalityRecord>;
  updateMortalityRecord(id: string, data: Partial<MortalityRecord>): Promise<MortalityRecord>;
  deleteMortalityRecord(id: string): Promise<void>;

  // Medication
  findMedicationById(id: string): Promise<Medication | null>;
  findAllMedications(filter: MedicationFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<Medication>>;
  createMedication(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication>;
  updateMedication(id: string, data: Partial<Medication>): Promise<Medication>;
  deleteMedication(id: string): Promise<void>;

  // EggProduction
  findEggProductionById(id: string): Promise<EggProduction | null>;
  findAllEggProductions(filter: EggProductionFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<EggProduction>>;
  createEggProduction(data: Omit<EggProduction, 'id' | 'createdAt' | 'updatedAt'>): Promise<EggProduction>;
  updateEggProduction(id: string, data: Partial<EggProduction>): Promise<EggProduction>;
  deleteEggProduction(id: string): Promise<void>;

  // PoultrySale
  findPoultrySaleById(id: string): Promise<PoultrySale | null>;
  findAllPoultrySales(filter: PoultrySaleFilter, sortBy: string, sortOrder: 'asc' | 'desc', page: number, limit: number): Promise<PaginatedResult<PoultrySale>>;
  createPoultrySale(data: Omit<PoultrySale, 'id' | 'createdAt' | 'updatedAt'>): Promise<PoultrySale>;
  updatePoultrySale(id: string, data: Partial<PoultrySale>): Promise<PoultrySale>;
  deletePoultrySale(id: string): Promise<void>;
}
