import { scopedPrisma as prisma } from '@farm/database';

export class FinanceRepository {
  async createExpense(data: { farmId: string; title: string; amount: number; date: Date }, organizationId: string) {
    return prisma.expense.create({ data: { ...data, organizationId } });
  }

  async getExpenseById(id: string) {
    return prisma.expense.findUnique({ where: { id } });
  }

  async getAllExpenses(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.search) where.OR = [{ title: { contains: filter.search, mode: 'insensitive' as const } }];
    const [data, total] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.expense.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateExpense(id: string, data: any) {
    return prisma.expense.update({ where: { id }, data });
  }

  async deleteExpense(id: string) {
    return prisma.expense.delete({ where: { id } });
  }

  async createSale(data: { farmId: string; item: string; quantity: number; price: number; total: number; date: Date }, organizationId: string) {
    return prisma.sale.create({ data: { ...data, organizationId } });
  }

  async getSaleById(id: string) {
    return prisma.sale.findUnique({ where: { id } });
  }

  async getAllSales(filter: any = {}, sortBy: string = 'date', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filter.farmId) where.farmId = filter.farmId;
    if (filter.search) where.OR = [{ item: { contains: filter.search, mode: 'insensitive' as const } }];
    const [data, total] = await Promise.all([
      prisma.sale.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.sale.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateSale(id: string, data: any) {
    return prisma.sale.update({ where: { id }, data });
  }

  async deleteSale(id: string) {
    return prisma.sale.delete({ where: { id } });
  }

  async getFarmById(id: string) {
    return prisma.farm.findUnique({ where: { id } });
  }

  async createBudget(data: { name: string; description?: string; farmId?: string; startDate: Date; endDate: Date }, organizationId: string) {
    return prisma.budget.create({
      data: { ...data, organizationId, farmId: data.farmId || null },
      include: { categories: true },
    });
  }

  async getBudgetById(id: string) {
    return prisma.budget.findUnique({ where: { id }, include: { categories: true } });
  }

  async getAllBudgets(organizationId: string, filters?: { status?: string; farmId?: string }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.farmId) where.farmId = filters.farmId;
    return prisma.budget.findMany({
      where,
      include: { categories: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBudget(id: string, data: any) {
    return prisma.budget.update({ where: { id }, data, include: { categories: true } });
  }

  async deleteBudget(id: string) {
    return prisma.budget.delete({ where: { id } });
  }

  async addCategory(budgetId: string, data: { name: string; budgetAmount: number }) {
    return prisma.budgetCategory.create({ data: { ...data, budgetId } });
  }

  async updateCategory(id: string, data: { name?: string; budgetAmount?: number; spentAmount?: number }) {
    return prisma.budgetCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    return prisma.budgetCategory.delete({ where: { id } });
  }

  async getCategoriesByBudget(budgetId: string) {
    return prisma.budgetCategory.findMany({ where: { budgetId } });
  }

  async computeSpentAmounts(budgetId: string, organizationId: string) {
    const budget = await prisma.budget.findUnique({ where: { id: budgetId }, include: { categories: true } });
    if (!budget) return;

    for (const cat of budget.categories) {
      const result = await prisma.expense.aggregate({
        where: {
          organizationId,
          ...(budget.farmId ? { farmId: budget.farmId } : {}),
          title: { contains: cat.name, mode: 'insensitive' },
          date: { gte: budget.startDate, lte: budget.endDate },
        },
        _sum: { amount: true },
      });
      await prisma.budgetCategory.update({
        where: { id: cat.id },
        data: { spentAmount: result._sum.amount || 0 },
      });
    }
  }
}
