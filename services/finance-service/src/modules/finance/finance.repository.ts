import { prisma } from '@farm/database';

export class FinanceRepository {
  // --- Expense CRUD ---
  async createExpense(data: { farmId: string; title: string; amount: number; date: Date }) {
    return prisma.expense.create({ data });
  }

  async getExpenseById(id: string) {
    return prisma.expense.findUnique({ where: { id } });
  }

  async getAllExpenses() {
    return prisma.expense.findMany({ orderBy: { date: 'desc' } });
  }

  async updateExpense(
    id: string,
    data: { farmId?: string; title?: string; amount?: number; date?: Date }
  ) {
    return prisma.expense.update({ where: { id }, data });
  }

  async deleteExpense(id: string) {
    return prisma.expense.delete({ where: { id } });
  }

  // --- Sale CRUD ---
  async createSale(data: {
    farmId: string;
    item: string;
    quantity: number;
    price: number;
    total: number;
    date: Date;
  }) {
    return prisma.sale.create({ data });
  }

  async getSaleById(id: string) {
    return prisma.sale.findUnique({ where: { id } });
  }

  async getAllSales() {
    return prisma.sale.findMany({ orderBy: { date: 'desc' } });
  }

  async updateSale(
    id: string,
    data: {
      farmId?: string;
      item?: string;
      quantity?: number;
      price?: number;
      total?: number;
      date?: Date;
    }
  ) {
    return prisma.sale.update({ where: { id }, data });
  }

  async deleteSale(id: string) {
    return prisma.sale.delete({ where: { id } });
  }

  // --- Cross-entity helpers ---
  async getFarmById(id: string) {
    return prisma.farm.findUnique({ where: { id } });
  }
}

