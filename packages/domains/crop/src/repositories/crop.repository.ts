import { Repository, Id } from '@farm/domain-core';
import { Crop } from '../entities/crop.entity';

export interface CropRepository extends Repository<Crop> {
  findByName(name: string, organizationId: Id): Promise<Crop | null>;
  findByOrganizationId(organizationId: Id): Promise<Crop[]>;
}
