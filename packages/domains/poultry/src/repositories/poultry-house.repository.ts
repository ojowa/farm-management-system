import { Id } from '@farm/domain-core';
import { PoultryHouse } from '../entities/poultry-house.entity';

export interface PoultryHouseRepository {
  findById(id: Id): Promise<PoultryHouse | null>;
  findByFarmId(farmId: Id): Promise<PoultryHouse[]>;
  save(poultryHouse: PoultryHouse): Promise<void>;
  delete(id: Id): Promise<void>;
}
