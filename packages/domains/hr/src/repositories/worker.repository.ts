import { Repository, Id } from '@farm/domain-core';
import { Worker } from '../entities/worker.entity';

export interface WorkerRepository extends Repository<Worker> {
  findByFarmId(farmId: Id): Promise<Worker[]>;
  findByName(name: string, organizationId: Id): Promise<Worker[]>;
}
