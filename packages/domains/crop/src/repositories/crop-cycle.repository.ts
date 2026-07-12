import { Repository, Id } from '@farm/domain-core';
import { CropCycle } from '../entities/crop-cycle.entity';

export interface CropCycleRepository extends Repository<CropCycle> {
  findByCropId(cropId: Id): Promise<CropCycle[]>;
  findByFieldId(fieldId: Id): Promise<CropCycle[]>;
  findActiveByFieldId(fieldId: Id): Promise<CropCycle | null>;
  findByOrganizationId(organizationId: Id): Promise<CropCycle[]>;
}
