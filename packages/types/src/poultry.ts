// Poultry Type Definitions

export interface PoultryHouse {
  id: string;
  farmId: string;
  name: string;
  capacity: number;
}

export interface CreatePoultryHouseRequest {
  farmId: string;
  name: string;
  capacity: number;
}

export interface UpdatePoultryHouseRequest {
  farmId?: string;
  name?: string;
  capacity?: number;
}

export interface Pen {
  id: string;
  poultryHouseId: string;
  name: string;
  capacity: number;
}

export interface CreatePenRequest {
  poultryHouseId: string;
  name: string;
  capacity: number;
}

export interface UpdatePenRequest {
  poultryHouseId?: string;
  name?: string;
  capacity?: number;
}

export interface Breed {
  id: string;
  name: string;
  birdType: string; // e.g. BROILER, LAYER
}

export interface CreateBreedRequest {
  name: string;
  birdType: string;
}

export interface UpdateBreedRequest {
  name?: string;
  birdType?: string;
}

export interface Flock {
  id: string;
  organizationId: string;
  farmId: string;
  penId: string;
  breedId: string;
  batchCode: string;
  birdCount: number;
  currentCount: number;
  arrivalDate: Date;
  currentAgeDays: number;
  status: string; // e.g. ACTIVE, SOLD, etc
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFlockRequest {
  organizationId: string;
  farmId: string;
  penId: string;
  breedId: string;
  batchCode: string;
  birdCount: number;
  currentCount: number;
  arrivalDate: Date | string;
  currentAgeDays: number;
  status: string;
}

export interface UpdateFlockRequest {
  organizationId?: string;
  farmId?: string;
  penId?: string;
  breedId?: string;
  batchCode?: string;
  birdCount?: number;
  currentCount?: number;
  arrivalDate?: Date | string;
  currentAgeDays?: number;
  status?: string;
}

export interface FeedingRecord {
  id: string;
  flockId: string;
  feedType: string;
  quantityKg: number;
  date: Date;
  createdAt: Date;
}

export interface CreateFeedingRecordRequest {
  flockId: string;
  feedType: string;
  quantityKg: number;
  date: Date | string;
}

export interface UpdateFeedingRecordRequest {
  flockId?: string;
  feedType?: string;
  quantityKg?: number;
  date?: Date | string;
}

export interface VaccinationRecord {
  id: string;
  flockId: string;
  vaccine: string;
  dosage?: string | null;
  date: Date;
  createdAt: Date;
}

export interface CreateVaccinationRecordRequest {
  flockId: string;
  vaccine: string;
  dosage?: string | null;
  date: Date | string;
}

export interface UpdateVaccinationRecordRequest {
  flockId?: string;
  vaccine?: string;
  dosage?: string | null;
  date?: Date | string;
}

export interface MortalityRecord {
  id: string;
  flockId: string;
  count: number;
  cause?: string | null;
  date: Date;
  createdAt: Date;
}

export interface CreateMortalityRecordRequest {
  flockId: string;
  count: number;
  cause?: string | null;
  date: Date | string;
}

export interface UpdateMortalityRecordRequest {
  flockId?: string;
  count?: number;
  cause?: string | null;
  date?: Date | string;
}

// Retain compatibility for deprecated types if needed
export interface PoultryBatch {
  id: string;
  farmId: string;
  type: 'BROILER' | 'LAYER';
  quantity: number;
  arrivalDate: Date;
  status: 'ACTIVE' | 'SOLD' | 'DECEASED';
  createdAt: Date;
  updatedAt: Date;
}

// Medication Types

export interface Medication {
  id: string;
  flockId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date | null;
  notes?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMedicationRequest {
  flockId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  notes?: string | null;
}

export interface UpdateMedicationRequest {
  flockId?: string;
  name?: string;
  dosage?: string;
  frequency?: string;
  startDate?: Date | string;
  endDate?: Date | string | null;
  notes?: string | null;
  status?: string;
}
