export interface PoultryHouse {
  id: string;
  farmId: string;
  name: string;
  capacity: number;
}

export interface Pen {
  id: string;
  poultryHouseId: string;
  /**
   * Denormalized on create (`createPen` stamps it from the owning house) so a
   * pen can be filtered by farm in one query. Optional because the owning
   * house is the source of truth — always prefer the Pen → House → Farm link
   * when resolving which farm a pen belongs to.
   */
  farmId?: string;
  name: string;
  capacity: number;
}

export interface Breed {
  id: string;
  name: string;
  birdType: string;
}

/**
 * Read-only joins returned alongside a flock (`GET /flocks`, `GET /flocks/:id`).
 *
 * Clients render breed/pen/farm names directly from these; the flat ids above
 * stay authoritative for writes. Every join is fetched inside the same
 * organization-scoped query, so nothing extra is ever exposed.
 */
export interface FlockRelations {
  breed?: { id: string; name: string; birdType: string } | null;
  pen?:
    | {
        id: string;
        name: string;
        poultryHouseId: string;
        farmId: string;
        capacity: number;
        poultryHouse?: { id: string; name: string; farmId: string; capacity: number } | null;
      }
    | null;
  farm?: { id: string; name: string } | null;
}

export interface Flock extends FlockRelations {
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

/** What a flock write may carry: the scalars only — the joins are read-only. */
export type FlockWrite = Omit<Flock, keyof FlockRelations>;

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
