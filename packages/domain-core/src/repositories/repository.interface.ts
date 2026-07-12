import { AggregateRoot } from '../entities/aggregate-root';
import { Id } from '../value-objects/id.value-object';

export interface Repository<T extends AggregateRoot<unknown>> {
  findById(id: Id): Promise<T | null>;
  save(entity: T): Promise<void>;
  delete(id: Id): Promise<void>;
  exists(id: Id): Promise<boolean>;
}
