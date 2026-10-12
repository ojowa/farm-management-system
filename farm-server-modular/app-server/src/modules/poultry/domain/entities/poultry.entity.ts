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

export interface EggProduction {
  id: string;
  organizationId: string;
  flockId: string;
  date: Date;
  totalEggs: number;
  goodEggs: number;
  brokenEggs: number;
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PoultrySale {
  id: string;
  organizationId: string;
  farmId: string | null;
  flockId: string | null;
  date: Date;
  buyerName: string | null;
  birdType: string;
  quantity: number;
  weight: number | null;
  pricePerBird: number | null;
  totalAmount: number;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
