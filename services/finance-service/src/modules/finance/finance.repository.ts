import { scopedPrisma as prisma } from '@farm/database';

export class FinanceRepository {
  // --- Expense CRUD ---
  async createExpense(data: { farmId: string; title: string; amount: number; date: Date }) {
    return prisma.expense.create({ data });
  }

  async getExpenseById(id: string) {
    return prisma.expense.findUnique({ where: { id } });
  }

  async getAllExpenses(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' as const } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.expense.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
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

  async getAllSales(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.search) {
      where.OR = [
        { item: { contains: filter.search, mode: 'insensitive' as const } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.sale.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.sale.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
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

