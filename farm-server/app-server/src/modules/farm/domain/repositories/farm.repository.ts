import { Farm, Field, FieldWithFarm } from '../entities/farm.entity';

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
    search?: string;
    status?: string;
    farmType?: string;
  }): Promise<{ farms: Farm[]; total: number }>;
  create(data: Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farm>;
  /** Atomic bulk create (single transaction) — used by import. */
  createMany(data: Array<Omit<Farm, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Farm[]>;
  update(id: string, organizationId: string, data: Partial<Farm>): Promise<Farm>;
  delete(id: string, organizationId: string): Promise<void>;
}

export interface FieldRepository {
  /** Field has no organizationId of its own; scope through the parent farm. */
  findById(id: string, organizationId: string): Promise<FieldWithFarm | null>;
  findByFarmId(farmId: string, organizationId: string): Promise<FieldWithFarm[]>;
  /**
   * Every field of one tenant, still scoped through the parent farm — the
   * task-link picker needs the whole parcel list before a farm is chosen.
   */
  findByOrganizationId(organizationId: string): Promise<FieldWithFarm[]>;
  create(data: Omit<Field, 'id'>): Promise<Field>;
  /** Callers must verify scoped existence first (service does via findById). */
  update(id: string, data: Partial<Field>): Promise<Field>;
  /** Callers must verify scoped existence first (service does via findById). */
  delete(id: string): Promise<void>;
}
