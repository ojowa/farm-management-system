import { Repository, Id } from '@farm/domain-core';
import { Livestock, LivestockStatus } from '../entities/livestock.entity';
import { LivestockSpecies } from '../value-objects/livestock-species.value-object';

export interface LivestockRepository extends Repository<Livestock> {
  findByFarmId(farmId: Id): Promise<Livestock[]>;
  findBySpecies(species: LivestockSpecies, organizationId: Id): Promise<Livestock[]>;
  findByStatus(status: LivestockStatus, farmId: Id): Promise<Livestock[]>;
}
