export interface Pond {
  id: string;
  organizationId: string;
  farmId: string;
  name: string;
  pondType: string;
  area: number | null;
  waterSource: string | null;
  capacity: number | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PondStocking {
  id: string;
  organizationId: string;
  pondId: string;
  species: string;
  strain: string | null;
  count: number;
  source: string | null;
  totalCost: number | null;
  stockedAt: Date;
  expectedHarvestAt: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PondFeeding {
  id: string;
  organizationId: string;
  pondId: string;
  stockingId: string | null;
  feedType: string;
  quantityKg: number;
  cost: number | null;
  fedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PondWaterQuality {
  id: string;
  organizationId: string;
  pondId: string;
  ph: number | null;
  temperatureC: number | null;
  dissolvedOxygen: number | null;
  ammonia: number | null;
  turbidity: number | null;
  recordedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PondHarvest {
  id: string;
  organizationId: string;
  pondId: string;
  stockingId: string | null;
  quantityKg: number;
  count: number | null;
  unitPrice: number | null;
  revenue: number | null;
  harvestedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
