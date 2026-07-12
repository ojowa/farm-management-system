import { Id } from '@farm/domain-core';
import { Field } from '../entities/field.entity';

export interface FieldRepository {
  findById(id: Id): Promise<Field | null>;
  findByFarmId(farmId: string): Promise<Field[]>;
  save(entity: Field): Promise<void>;
  delete(id: Id): Promise<void>;
  exists(id: Id): Promise<boolean>;
}
