export interface PoultryHouse {
  id: string;
  farmId: string;
  name: string;
  capacity: number;
}

export interface Pen {
  id: string;
  poultryHouseId: string;
  name: string;
  capacity: number;
}

export interface Breed {
  id: string;
  name: string;
  birdType: string;
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
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedingRecord {
  id: string;
  flockId: string;
  feedType: string;
  quantityKg: number;
  date: Date;
  createdAt: Date;
}

export interface VaccinationRecord {
  id: string;
  flockId: string;
  vaccine: string;
  dosage: string | null;
  date: Date;
  createdAt: Date;
}

export interface MortalityRecord {
  id: string;
  flockId: string;
  count: number;
  cause: string | null;
  date: Date;
  createdAt: Date;
}

export interface Medication {
  id: string;
  flockId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
