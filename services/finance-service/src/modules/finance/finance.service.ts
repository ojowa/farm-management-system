import { Injectable, NotFoundException } from '@nestjs/common';
import { FinanceRepository } from './finance.repository';
import { emitFinanceEvent } from '@farm/utils';

@Injectable()
export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  private async assertFarmExists(farmId: string) {
    const farm = await this.repository.getFarmById(farmId);
    if (!farm) throw new NotFoundException(`Farm with ID ${farmId} not found`);
  }

  private toDate(value: Date | string): Date {
    return typeof value === 'string' ? new Date(value) : value;
  }

  async createExpense(data: any, organizationId: string) {
    await this.assertFarmExists(data.farmId);
    const expense = await this.repository.createExpense({
      farmId: data.farmId, title: data.title, amount: data.amount, date: this.toDate(data.date),
    }, organizationId);
    await emitFinanceEvent('created', expense);
    return expense;
  }

  async getExpenseById(id: string) {
    const expense = await this.repository.getExpenseById(id);
    if (!expense) throw new NotFoundException(`Expense with ID ${id} not found`);
    return expense;
  }

  async getAllExpenses(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllExpenses(filter, sortBy, sortOrder, page, limit);
  }

  async updateExpense(id: string, data: any) {
    await this.getExpenseById(id);
    if (data.farmId) await this.assertFarmExists(data.farmId);
    const expense = await this.repository.updateExpense(id, { ...data, date: data.date ? this.toDate(data.date) : undefined });
    await emitFinanceEvent('updated', expense);
    return expense;
  }

  async deleteExpense(id: string) {
    await this.getExpenseById(id);
    await this.repository.deleteExpense(id);
    await emitFinanceEvent('deleted', { id });
    return { deleted: true };
  }

  async createSale(data: any, organizationId: string) {
    await this.assertFarmExists(data.farmId);
    const sale = await this.repository.createSale({
      farmId: data.farmId, item: data.item, quantity: data.quantity, price: data.price, total: data.total, date: this.toDate(data.date),
    }, organizationId);
    await emitFinanceEvent('created', sale);
    return sale;
  }

  async getSaleById(id: string) {
    const sale = await this.repository.getSaleById(id);
    if (!sale) throw new NotFoundException(`Sale with ID ${id} not found`);
    return sale;
  }

  async getAllSales(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    return this.repository.getAllSales(filter, sortBy, sortOrder, page, limit);
  }

  async updateSale(id: string, data: any) {
    await this.getSaleById(id);
    if (data.farmId) await this.assertFarmExists(data.farmId);
    const sale = await this.repository.updateSale(id, { ...data, date: data.date ? this.toDate(data.date) : undefined });
    await emitFinanceEvent('updated', sale);
    return sale;
  }

  async deleteSale(id: string) {
    await this.getSaleById(id);
    await this.repository.deleteSale(id);
    await emitFinanceEvent('deleted', { id });
    return { deleted: true };
  }

  async createBudget(data: any, organizationId: string) {
    if (data.farmId) await this.assertFarmExists(data.farmId);
    const budget = await this.repository.createBudget({
      name: data.name,
      description: data.description,
      farmId: data.farmId,
      startDate: this.toDate(data.startDate),
      endDate: this.toDate(data.endDate),
    }, organizationId);
    await emitFinanceEvent('created', budget);
    return budget;
  }

  async getBudgetById(id: string) {
    const budget = await this.repository.getBudgetById(id);
    if (!budget) throw new NotFoundException(`Budget with ID ${id} not found`);
    return budget;
  }

  async getAllBudgets(organizationId: string, filters?: { status?: string; farmId?: string }) {
    return this.repository.getAllBudgets(organizationId, filters);
  }

  async updateBudget(id: string, data: any) {
    await this.getBudgetById(id);
    if (data.farmId) await this.assertFarmExists(data.farmId);
    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = this.toDate(data.startDate);
    if (data.endDate) updateData.endDate = this.toDate(data.endDate);
    const budget = await this.repository.updateBudget(id, updateData);
    await emitFinanceEvent('updated', budget);
    return budget;
  }

  async deleteBudget(id: string) {
    await this.getBudgetById(id);
    await this.repository.deleteBudget(id);
    await emitFinanceEvent('deleted', { id });
    return { deleted: true };
  }

  async addCategory(budgetId: string, data: { name: string; budgetAmount: number }) {
    await this.getBudgetById(budgetId);
    const category = await this.repository.addCategory(budgetId, data);
    await emitFinanceEvent('updated', { id: budgetId });
    return category;
  }

  async updateCategory(id: string, data: { name?: string; budgetAmount?: number; spentAmount?: number }) {
    const categories = await this.repository.getCategoriesByBudget('any');
    const category = categories.find((c: any) => c.id === id);
    if (!category) throw new NotFoundException(`Category with ID ${id} not found`);
    const updated = await this.repository.updateCategory(id, data);
    await emitFinanceEvent('updated', { id: category.budgetId });
    return updated;
  }

  async deleteCategory(id: string) {
    const categories = await this.repository.getCategoriesByBudget('any');
    const category = categories.find((c: any) => c.id === id);
    if (!category) throw new NotFoundException(`Category with ID ${id} not found`);
    await this.repository.deleteCategory(id);
    await emitFinanceEvent('updated', { id: category.budgetId });
    return { deleted: true };
  }

  async refreshSpentAmounts(budgetId: string, organizationId: string) {
    await this.getBudgetById(budgetId);
    await this.repository.computeSpentAmounts(budgetId, organizationId);
    return this.getBudgetById(budgetId);
  }
}
