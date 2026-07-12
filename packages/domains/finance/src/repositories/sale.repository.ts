import { Repository, Id } from '@farm/domain-core';
import { Sale } from '../entities/sale.entity';

export interface SaleRepository extends Repository<Sale> {
  findByFarmId(farmId: Id): Promise<Sale[]>;
  findByOrganizationId(organizationId: Id): Promise<Sale[]>;
  findByItem(item: string, farmId: Id): Promise<Sale[]>;
  findByDateRange(startDate: Date, endDate: Date, farmId: Id): Promise<Sale[]>;
}
