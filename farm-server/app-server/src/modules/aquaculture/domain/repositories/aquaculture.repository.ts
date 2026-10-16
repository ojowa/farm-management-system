import {
  Pond,
  PondStocking,
  PondFeeding,
  PondWaterQuality,
  PondHarvest,
} from '../entities/aquaculture.entity';

export interface PondFilter {
  organizationId: string;
  farmId?: string;
  status?: string;
  search?: string;
}

export interface PondListOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type PondWrite = Omit<Pond, 'id' | 'createdAt' | 'updatedAt'>;
export type PondStockingWrite = Omit<PondStocking, 'id' | 'createdAt' | 'updatedAt'>;
export type PondFeedingWrite = Omit<PondFeeding, 'id' | 'createdAt' | 'updatedAt'>;
export type PondWaterQualityWrite = Omit<PondWaterQuality, 'id' | 'createdAt' | 'updatedAt'>;
export type PondHarvestWrite = Omit<PondHarvest, 'id' | 'createdAt' | 'updatedAt'>;

export interface AquacultureRepository {
  // Ponds
  findPondById(id: string, organizationId: string): Promise<Pond | null>;
  findAllPonds(filter: PondFilter, options?: PondListOptions): Promise<{ data: Pond[]; total: number }>;
  createPond(data: PondWrite): Promise<Pond>;
  updatePond(id: string, data: Partial<Pond>): Promise<Pond>;
  deletePond(id: string): Promise<void>;
  getFarmById(id: string, organizationId: string): Promise<{ id: string } | null>;

  // Stockings
  findStockingById(id: string, organizationId: string): Promise<PondStocking | null>;
  listStockings(pondId: string, organizationId: string): Promise<PondStocking[]>;
  createStocking(data: PondStockingWrite): Promise<PondStocking>;
  updateStocking(id: string, data: Partial<PondStocking>): Promise<PondStocking>;
  deleteStocking(id: string): Promise<void>;

  // Feedings
  findFeedingById(id: string, organizationId: string): Promise<PondFeeding | null>;
  listFeedings(pondId: string, organizationId: string): Promise<PondFeeding[]>;
  createFeeding(data: PondFeedingWrite): Promise<PondFeeding>;
  deleteFeeding(id: string): Promise<void>;

  // Water quality
  findWaterQualityById(id: string, organizationId: string): Promise<PondWaterQuality | null>;
  listWaterQuality(pondId: string, organizationId: string): Promise<PondWaterQuality[]>;
  createWaterQuality(data: PondWaterQualityWrite): Promise<PondWaterQuality>;
  deleteWaterQuality(id: string): Promise<void>;

  // Harvests
  findHarvestById(id: string, organizationId: string): Promise<PondHarvest | null>;
  listHarvests(pondId: string, organizationId: string): Promise<PondHarvest[]>;
  createHarvest(data: PondHarvestWrite): Promise<PondHarvest>;
  deleteHarvest(id: string): Promise<void>;
}
