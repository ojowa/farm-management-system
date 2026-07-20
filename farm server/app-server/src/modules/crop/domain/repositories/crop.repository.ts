import { Crop, CropCycle } from '../entities/crop.entity';

export interface CropRepository {
  findById(id: string): Promise<Crop | null>;
  findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { name?: string };
  }): Promise<{ crops: Crop[]; total: number }>;
  create(data: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>): Promise<Crop>;
  update(id: string, data: Partial<Pick<Crop, 'name'>>): Promise<Crop>;
  delete(id: string): Promise<void>;
}

export interface CropCycleRepository {
  findById(id: string): Promise<CropCycle | null>;
  findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    filter?: { fieldId?: string; cropId?: string; status?: string };
  }): Promise<{ cycles: CropCycle[]; total: number }>;
  create(data: Omit<CropCycle, 'id' | 'createdAt' | 'updatedAt'>): Promise<CropCycle>;
  update(id: string, data: Partial<Pick<CropCycle, 'fieldId' | 'cropId' | 'plantingDate' | 'harvestDate' | 'status'>>): Promise<CropCycle>;
  delete(id: string): Promise<void>;
}
