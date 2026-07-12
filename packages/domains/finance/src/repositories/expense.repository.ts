import { Repository, Id } from '@farm/domain-core';
import { Expense } from '../entities/expense.entity';

export interface ExpenseRepository extends Repository<Expense> {
  findByFarmId(farmId: Id): Promise<Expense[]>;
  findByOrganizationId(organizationId: Id): Promise<Expense[]>;
  findByDateRange(startDate: Date, endDate: Date, farmId: Id): Promise<Expense[]>;
}
