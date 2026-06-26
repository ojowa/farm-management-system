import { FinanceRepository } from './finance.repository';
import {
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateSaleRequest,
  UpdateSaleRequest,
} from '@farm/types';

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
    return this.repository.createExpense({
      farmId: data.farmId,
      title: data.title,
      amount: data.amount,
      date: this.toDate(data.date),
    });
  }

  async getExpenseById(id: string) {
    const expense = await this.repository.getExpenseById(id);
    if (!expense) {
      throw new Error(`Expense with ID ${id} not found`);
    }
    return expense;
  }

  async getAllExpenses() {
    return this.repository.getAllExpenses();
  }

  async updateExpense(id: string, data: UpdateExpenseRequest) {
    await this.getExpenseById(id);
    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }
    return this.repository.updateExpense(id, {
      ...data,
      date: data.date ? this.toDate(data.date) : undefined,
    });
  }

  async deleteExpense(id: string) {
    await this.getExpenseById(id);
    return this.repository.deleteExpense(id);
  }

  // --- Sale ---
  async createSale(data: CreateSaleRequest) {
    await this.assertFarmExists(data.farmId);
    return this.repository.createSale({
      farmId: data.farmId,
      item: data.item,
      quantity: data.quantity,
      price: data.price,
      total: data.total,
      date: this.toDate(data.date),
    });
  }

  async getSaleById(id: string) {
    const sale = await this.repository.getSaleById(id);
    if (!sale) {
      throw new Error(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  async getAllSales() {
    return this.repository.getAllSales();
  }

  async updateSale(id: string, data: UpdateSaleRequest) {
    await this.getSaleById(id);
    if (data.farmId) {
      await this.assertFarmExists(data.farmId);
    }
    return this.repository.updateSale(id, {
      ...data,
      date: data.date ? this.toDate(data.date) : undefined,
    });
  }

  async deleteSale(id: string) {
    await this.getSaleById(id);
    return this.repository.deleteSale(id);
  }
}

