/**
 * Transform backend responses into the shapes mobile screens expect.
 *
 * Backend returns raw Prisma objects. Mobile screens expect denormalized,
 * UI-ready shapes. This module bridges the gap.
 */

// ── Farm ──────────────────────────────────────────────────────────────
/** Backend shape from GET /farms */
export interface RawFarm {
  id: string;
  organizationId: string;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  size?: number | null;
  status?: string | null;
  fields?: Array<{ id: string; name: string; size: number }>;
  poultryHouses?: Array<{ id: string; name: string; capacity: number }>;
  createdAt?: string;
  updatedAt?: string;
}

/** Mobile screen shape */
export interface MobileFarm {
  id: string;
  name: string;
  location: string;
  size: number;
  crops: number;
  animals: number;
  status: 'active' | 'inactive';
}

export function transformFarm(raw: RawFarm): MobileFarm {
  const fields = raw.fields ?? [];
  const poultryHouses = raw.poultryHouses ?? [];
  // Use backend size if set, otherwise compute from fields
  const size = raw.size ?? fields.reduce((sum, f) => sum + (f.size ?? 0), 0);
  return {
    id: raw.id,
    name: raw.name,
    location: raw.location ?? 'No location',
    size,
    crops: 0, // requires separate crop-cycle query
    animals: poultryHouses.reduce((sum, h) => sum + (h.capacity ?? 0), 0),
    status: (raw.status as 'active' | 'inactive') ?? 'active',
  };
}

// ── Crop ──────────────────────────────────────────────────────────────
/** Backend shape from GET /crops (minimal: just id + name) */
export interface RawCrop {
  id: string;
  name: string;
}

/** Mobile screen shape */
export interface MobileCrop {
  id: string;
  name: string;
  farm: string;
  farmId?: string;
  type: string;
  area: number;
  plantedDate: string;
  health: number;
  status: 'growing' | 'harvesting' | 'completed';
}

export function transformCrop(
  raw: RawCrop,
  farmName?: string,
  cycle?: { plantingDate?: string; harvestDate?: string; health?: number; status?: string; field?: { size?: number } }
): MobileCrop {
  const hasHarvested = !!cycle?.harvestDate;
  const hasPlanted = !!cycle?.plantingDate;
  return {
    id: raw.id,
    name: raw.name,
    farm: farmName ?? 'Unknown farm',
    farmId: cycle?.field ? undefined : undefined,
    type: raw.name, // crop name doubles as type
    area: cycle?.field?.size ?? 0,
    plantedDate: cycle?.plantingDate ?? '',
    health: cycle?.health ?? (hasHarvested ? 100 : hasPlanted ? 75 : 0),
    status: (cycle?.status as MobileCrop['status']) ?? (hasHarvested ? 'completed' : hasPlanted ? 'growing' : 'growing'),
  };
}

// ── Livestock ─────────────────────────────────────────────────────────
/** Backend shape from GET /livestock */
export interface RawLivestock {
  id: string;
  farmId: string;
  species: string;
  breed?: string | null;
  gender: string;
  birthDate: string;
  status: string; // HEALTHY, SICK, SOLD, DECEASED
  createdAt?: string;
  updatedAt?: string;
}

/** Mobile screen shape */
export interface MobileAnimal {
  id: string;
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: number;
  health: 'healthy' | 'sick' | 'treatment';
  farm: string;
  farmId?: string;
  lastCheckup: string;
}

const LIVESTOCK_HEALTH_MAP: Record<string, MobileAnimal['health']> = {
  HEALTHY: 'healthy',
  SICK: 'sick',
  SOLD: 'treatment',
  DECEASED: 'treatment',
};

export function transformLivestock(raw: RawLivestock, farmName?: string): MobileAnimal {
  return {
    id: raw.id,
    name: raw.breed ?? raw.species,
    type: 'livestock',
    breed: raw.breed ?? raw.species,
    quantity: 1,
    health: LIVESTOCK_HEALTH_MAP[raw.status?.toUpperCase()] ?? 'healthy',
    farm: farmName ?? 'Unknown farm',
    farmId: raw.farmId,
    lastCheckup: raw.updatedAt ?? raw.createdAt ?? '',
  };
}

// ── Poultry (Flock) ──────────────────────────────────────────────────
/** Backend shape from GET /flocks */
export interface RawFlock {
  id: string;
  organizationId: string;
  farmId: string;
  penId: string;
  breedId: string;
  batchCode: string;
  birdCount: number;
  currentCount: number;
  arrivalDate: string;
  currentAgeDays: number;
  status: string; // ACTIVE, SOLD, etc.
  farm?: { name?: string } | null;
  pen?: { name?: string } | null;
  breed?: { name?: string; birdType?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

const POULTRY_HEALTH_MAP: Record<string, MobileAnimal['health']> = {
  ACTIVE: 'healthy',
  SOLD: 'treatment',
  DECEASED: 'sick',
};

export function transformFlock(raw: RawFlock): MobileAnimal {
  return {
    id: raw.id,
    name: raw.batchCode,
    type: 'poultry',
    breed: raw.breed?.name ?? raw.breed?.birdType ?? 'Unknown',
    quantity: raw.currentCount ?? raw.birdCount ?? 0,
    health: POULTRY_HEALTH_MAP[raw.status?.toUpperCase()] ?? 'healthy',
    farm: raw.farm?.name ?? 'Unknown farm',
    farmId: raw.farmId,
    lastCheckup: raw.updatedAt ?? raw.createdAt ?? raw.arrivalDate ?? '',
  };
}

// ── Finance ───────────────────────────────────────────────────────────
/** Backend shape from GET /expenses */
export interface RawExpense {
  id: string;
  farmId: string;
  title: string;
  amount: number;
  date: string;
  createdAt?: string;
}

/** Backend shape from GET /sales */
export interface RawSale {
  id: string;
  farmId: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  createdAt?: string;
}

/** Mobile screen shape */
export interface MobileTransaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  icon: string;
}

const EXPENSE_ICONS: Record<string, string> = {
  Seeds: '🌱',
  Fertilizer: '🧪',
  Feed: '🐄',
  Veterinary: '💊',
  Equipment: '🚜',
  Labor: '👷',
  Utilities: '⚡',
  Other: '💸',
};

function inferExpenseCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('seed')) return 'Seeds';
  if (lower.includes('fertil')) return 'Fertilizer';
  if (lower.includes('feed')) return 'Feed';
  if (lower.includes('vet') || lower.includes('medicine')) return 'Veterinary';
  if (lower.includes('equipment') || lower.includes('machine')) return 'Equipment';
  if (lower.includes('labor') || lower.includes('worker')) return 'Labor';
  if (lower.includes('util') || lower.includes('electric') || lower.includes('water')) return 'Utilities';
  return 'Other';
}

export function transformExpense(raw: RawExpense): MobileTransaction {
  const category = inferExpenseCategory(raw.title);
  return {
    id: raw.id,
    title: raw.title,
    description: '',
    amount: -(Math.abs(raw.amount)), // expenses are negative
    type: 'expense',
    category,
    date: raw.date ?? raw.createdAt ?? '',
    icon: EXPENSE_ICONS[category] ?? '💸',
  };
}

export function transformSale(raw: RawSale): MobileTransaction {
  return {
    id: raw.id,
    title: raw.item,
    description: `${raw.quantity} units @ $${raw.price.toFixed(2)}`,
    amount: raw.total ?? raw.quantity * raw.price,
    type: 'income',
    category: 'Crops',
    date: raw.date ?? raw.createdAt ?? '',
    icon: '💰',
  };
}
