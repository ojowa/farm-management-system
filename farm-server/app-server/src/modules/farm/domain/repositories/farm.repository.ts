import { Farm, Field } from '../entities/farm.entity';

/**
 * Every read/write is organization-scoped: `organizationId` is the caller's
 * tenant (derived from the JWT in the controller), never a client param.
 * `findAll` (unscoped listing) was removed deliberately — there is no
 * legitimate cross-tenant view of farms.
 */
export interface FarmRepository {
  findById(id: string, organizationId: string): Promise<Farm | null>;
  findByOrganizationId(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ farms: Farm[]; total: number }>;
  create(data: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm>;
  update(id: string, organizationId: string, data: Partial<Farm>): Promise<Farm>;
  delete(id: string, organizationId: string): Promise<void>;
}

export interface FieldRepository {
  /** Field has no organizationId of its own; scope through the parent farm. */
  findById(id: string, organizationId: string): Promise<Field | null>;
  findByFarmId(farmId: string, organizationId: string): Promise<Field[]>;
  create(data: Omit<Field, 'id'>): Promise<Field>;
  /** Callers must verify scoped existence first (service does via findById). */
  update(id: string, data: Partial<Field>): Promise<Field>;
  /** Callers must verify scoped existence first (service does via findById). */
  delete(id: string): Promise<void>;
}
