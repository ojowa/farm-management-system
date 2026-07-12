import { Id } from '@farm/domain-core';
import { Flock } from '../entities/flock.entity';

export interface FlockRepository {
  findById(id: Id): Promise<Flock | null>;
  findByFarmId(farmId: Id): Promise<Flock[]>;
  findByBatchCode(batchCode: string): Promise<Flock | null>;
  save(flock: Flock): Promise<void>;
  delete(id: Id): Promise<void>;
}
