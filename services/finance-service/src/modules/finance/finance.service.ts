import { FinanceRepository } from './finance.repository';
import {
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateSaleRequest,
  UpdateSaleRequest,
} from '@farm/types';
import { emitFinanceEvent } from '../../../../../shared-services/events/event-emitter';

export class FinanceService {
  private repository = new FinanceRepository();

  private async assertFarmExists(farmId: string) {
    const farm = await this.repository.getFarmById(farmId);
    if (!farm) {
      throw new Error(`Farm with ID ${farmId} not found`);
    }
  }

  private toDate(value: Date | string): Date {
    return typeof value === 'string' ? new Date(value) : value;
  }

  // --- Expense ---
  async createExpense(data: CreateExpenseRequest) {
    await this.assertFarmExists(data.farmId);
    const expense = await this.repository.createExpense({
      farmId: data.farmId,
      title: data.title,
      amount: data.amount,
      date: this.toDate(data.date),
    });
    await emitFinanceEvent('created', expense);
    return expense;
  }

  async getExpenseById(id: string) {
    const expense = await this.repository.getExpenseById(id);
    if (!expense) {
      throw new Error(`Expense with ID ${id} not found`);
    }
    return expense;
  }

  async getAllExpenses(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllExpenses(filter, sortBy, sortOrder, page, limit);
  }

  async updateExpense(id: string, data: UpdateExpenseRequest) {
    await this.getExpenseById(id);
    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }
    const expense = await this.repository.updateExpense(id, {
      ...data,
      date: data.date ? this.toDate(data.date) : undefined,
    });
    await emitFinanceEvent('updated', expense);
    return expense;
  }

  async deleteExpense(id: string) {
    await this.getExpenseById(id);
    await this.repository.deleteExpense(id);
    await emitFinanceEvent('deleted', { id });
    return { deleted: true };
  }

  // --- Sale ---
  async createSale(data: CreateSaleRequest) {
    await this.assertFarmExists(data.farmId);
    const sale = await this.repository.createSale({
      farmId: data.farmId,
      item: data.item,
      quantity: data.quantity,
      price: data.price,
      total: data.total,
      date: this.toDate(data.date),
    });
    await emitFinanceEvent('created', sale);
    return sale;
  }

  async getSaleById(id: string) {
    const sale = await this.repository.getSaleById(id);
    if (!sale) {
      throw new Error(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  async getAllSales(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllSales(filter, sortBy, sortOrder, page, limit);
  }

  async updateSale(id: string, data: UpdateSaleRequest) {
    await this.getSaleById(id);
    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }
    const sale = await this.repository.updateSale(id, {
      ...data,
      date: data.date ? this.toDate(data.date) : undefined,
    });
    await emitFinanceEvent('updated', sale);
    return sale;
  }

  async deleteSale(id: string) {
    await this.getSaleById(id);
    await this.repository.deleteSale(id);
    await emitFinanceEvent('deleted', { id });
    return { deleted: true };
  }
}

