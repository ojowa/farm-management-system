import { Livestock, HealthRecord, BreedingRecord, WeightRecord, VaccinationSchedule } from '../entities/livestock.entity';

export interface LivestockRepository {
  findById(id: string): Promise<Livestock | null>;
  findAll(filter: LivestockFilter, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ data: Livestock[]; total: number }>;
  create(data: Omit<Livestock, 'id' | 'createdAt' | 'updatedAt'>): Promise<Livestock>;
  update(id: string, data: Partial<Livestock>): Promise<Livestock>;
  delete(id: string): Promise<void>;
  getFarmById(id: string): Promise<{ id: string } | null>;
}

export interface HealthRecordRepository {
  findByLivestockId(livestockId: string, organizationId: string): Promise<HealthRecord[]>;
  create(data: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord>;
  update(id: string, data: Partial<HealthRecord>): Promise<HealthRecord>;
}

export interface BreedingRecordRepository {
  findAll(organizationId: string, filter?: { status?: string }): Promise<BreedingRecord[]>;
  findUpcoming(organizationId: string): Promise<BreedingRecord[]>;
  create(data: Omit<BreedingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BreedingRecord>;
  update(id: string, data: Partial<BreedingRecord>): Promise<BreedingRecord>;
}

export interface WeightRecordRepository {
  findByLivestockId(livestockId: string, organizationId: string): Promise<WeightRecord[]>;
  findByFlockId(flockId: string, organizationId: string): Promise<WeightRecord[]>;
  create(data: Omit<WeightRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeightRecord>;
}

export interface VaccinationScheduleRepository {
  findByLivestockId(livestockId: string, organizationId: string): Promise<VaccinationSchedule[]>;
  findOverdue(organizationId: string): Promise<VaccinationSchedule[]>;
  create(data: Omit<VaccinationSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaccinationSchedule>;
  update(id: string, data: Partial<VaccinationSchedule>): Promise<VaccinationSchedule>;
}

export interface LivestockFilter {
  farmId?: string;
  species?: string;
  status?: string;
  search?: string;
}
