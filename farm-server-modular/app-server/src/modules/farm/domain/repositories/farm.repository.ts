import { Farm, Field } from '../entities/farm.entity';

export interface FarmRepository {
  findById(id: string): Promise<Farm | null>;
  findByOrganizationId(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ farms: Farm[]; total: number }>;
  create(data: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm>;
  update(id: string, data: Partial<Farm>): Promise<Farm>;
  delete(id: string): Promise<void>;
  findAll(options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ farms: Farm[]; total: number }>;
}

export interface FieldRepository {
  findById(id: string): Promise<Field | null>;
  findByFarmId(farmId: string): Promise<Field[]>;
  create(data: Omit<Field, 'id'>): Promise<Field>;
  update(id: string, data: Partial<Field>): Promise<Field>;
  delete(id: string): Promise<void>;
}
