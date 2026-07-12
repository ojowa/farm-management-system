import { Repository } from '@farm/domain-core';
import { Farm } from '../entities/farm.entity';

export interface FarmRepository extends Repository<Farm> {
  findByOrganizationId(organizationId: string): Promise<Farm[]>;
  findByName(name: string): Promise<Farm | null>;
}
