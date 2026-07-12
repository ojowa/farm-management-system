export interface Livestock {
  id: string;
  farmId: string;
  species: string;
  breed: string | null;
  gender: string;
  birthDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthRecord {
  id: string;
  organizationId: string;
  livestockId: string;
  type: string;
  date: Date;
  description: string;
  veterinarian: string | null;
  medications: string | null;
  cost: number | null;
  nextCheckupDate: Date | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreedingRecord {
  id: string;
  organizationId: string;
  sireId: string;
  sireName: string | null;
  damId: string;
  damName: string | null;
  breedingDate: Date;
  expectedDueDate: Date | null;
  actualBirthDate: Date | null;
  offspringCount: number | null;
  status: string;
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightRecord {
  id: string;
  organizationId: string;
  livestockId: string | null;
  flockId: string | null;
  weight: number;
  unit: string;
  recordedDate: Date;
  notes: string | null;
  createdById: string | null;
  createdAt: Date;
}

export interface VaccinationSchedule {
  id: string;
  organizationId: string;
  livestockId: string;
  vaccineName: string;
  scheduledDate: Date;
  administeredDate: Date | null;
  status: string;
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
