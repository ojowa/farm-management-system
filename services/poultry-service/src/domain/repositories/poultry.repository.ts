import {
  PoultryHouse,
  Pen,
  Breed,
  Flock,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
} from '../entities/poultry.entity';

export interface PaginationOptions {
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

export interface PoultryHouseRepository {
  findById(id: string): Promise<PoultryHouse | null>;
  findAll(filter: PoultryHouseFilter, options: PaginationOptions): Promise<PaginatedResult<PoultryHouse>>;
  create(data: Omit<PoultryHouse, 'id'>): Promise<PoultryHouse>;
  update(id: string, data: Partial<PoultryHouse>): Promise<PoultryHouse>;
  delete(id: string): Promise<void>;
}

export interface PenRepository {
  findById(id: string): Promise<Pen | null>;
  findAll(filter: PenFilter, options: PaginationOptions): Promise<PaginatedResult<Pen>>;
  create(data: Omit<Pen, 'id'>): Promise<Pen>;
  update(id: string, data: Partial<Pen>): Promise<Pen>;
  delete(id: string): Promise<void>;
}

export interface BreedRepository {
  findById(id: string): Promise<Breed | null>;
  findAll(filter: BreedFilter, options: PaginationOptions): Promise<PaginatedResult<Breed>>;
  create(data: Omit<Breed, 'id'>): Promise<Breed>;
  update(id: string, data: Partial<Breed>): Promise<Breed>;
  delete(id: string): Promise<void>;
}

export interface FlockRepository {
  findById(id: string): Promise<Flock | null>;
  findAll(filter: FlockFilter, options: PaginationOptions): Promise<PaginatedResult<Flock>>;
  create(data: Omit<Flock, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flock>;
  update(id: string, data: Partial<Flock>): Promise<Flock>;
  delete(id: string): Promise<void>;
}

export interface FeedingRecordRepository {
  findById(id: string): Promise<FeedingRecord | null>;
  findAll(filter: FeedingRecordFilter, options: PaginationOptions): Promise<PaginatedResult<FeedingRecord>>;
  create(data: Omit<FeedingRecord, 'id' | 'createdAt'>): Promise<FeedingRecord>;
  update(id: string, data: Partial<FeedingRecord>): Promise<FeedingRecord>;
  delete(id: string): Promise<void>;
}

export interface VaccinationRecordRepository {
  findById(id: string): Promise<VaccinationRecord | null>;
  findAll(filter: VaccinationRecordFilter, options: PaginationOptions): Promise<PaginatedResult<VaccinationRecord>>;
  create(data: Omit<VaccinationRecord, 'id' | 'createdAt'>): Promise<VaccinationRecord>;
  update(id: string, data: Partial<VaccinationRecord>): Promise<VaccinationRecord>;
  delete(id: string): Promise<void>;
}

export interface MortalityRecordRepository {
  findById(id: string): Promise<MortalityRecord | null>;
  findAll(filter: MortalityRecordFilter, options: PaginationOptions): Promise<PaginatedResult<MortalityRecord>>;
  create(data: Omit<MortalityRecord, 'id' | 'createdAt'>): Promise<MortalityRecord>;
  update(id: string, data: Partial<MortalityRecord>): Promise<MortalityRecord>;
  delete(id: string): Promise<void>;
}

export interface MedicationRepository {
  findById(id: string): Promise<Medication | null>;
  findAll(filter: MedicationFilter, options: PaginationOptions): Promise<PaginatedResult<Medication>>;
  create(data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication>;
  update(id: string, data: Partial<Medication>): Promise<Medication>;
  delete(id: string): Promise<void>;
}
