import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

function categorizeExpense(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('feed') || t.includes('food')) return 'Feed';
  if (t.includes('labor') || t.includes('salary') || t.includes('wage')) return 'Labor';
  if (t.includes('medicine') || t.includes('veterinary') || t.includes('health')) return 'Medicine';
  if (t.includes('equipment') || t.includes('machinery') || t.includes('tool')) return 'Equipment';
  if (t.includes('seed') || t.includes('fertilizer') || t.includes('chemical')) return 'Inputs';
  if (t.includes('fuel') || t.includes('gas') || t.includes('transport')) return 'Transport';
  if (t.includes('water') || t.includes('irrigation')) return 'Water';
  if (t.includes('rent') || t.includes('lease')) return 'Rent';
  return 'Other';
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('profitability')
export class ProfitabilityController {
  @Permission('finance.read')
  @Get('farm')
  async getByFarm(
    @Query('farmId') farmId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') orgId?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const farmWhere: any = {};
    if (orgId) farmWhere.organizationId = orgId;
    if (farmId) farmWhere.id = farmId;

    const farms = await scopedPrisma.farm.findMany({ where: farmWhere });
    const results = [];

    for (const farm of farms) {
      const expenses = await scopedPrisma.expense.findMany({
        where: { farmId: farm.id, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
      });
      const sales = await scopedPrisma.sale.findMany({
        where: { farmId: farm.id, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
      });

      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const netProfit = totalRevenue - totalExpenses;

      const categories: Record<string, number> = {};
      expenses.forEach((e: any) => {
        const cat = categorizeExpense(e.title);
        categories[cat] = (categories[cat] || 0) + e.amount;
      });

      results.push({
        farmId: farm.id, farmName: farm.name, farmType: (farm as any).farmType,
        totalExpenses, totalRevenue, netProfit,
        profitMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        categories, expenseCount: expenses.length, saleCount: sales.length,
      });
    }

    return results;
  }

  @Permission('finance.read')
  @Get('summary')
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') orgId?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (Object.keys(dateFilter).length) where.date = dateFilter;

    const [expenses, sales] = await Promise.all([
      scopedPrisma.expense.findMany({ where }),
      scopedPrisma.sale.findMany({ where }),
    ]);

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const categories: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = categorizeExpense(e.title);
      categories[cat] = (categories[cat] || 0) + e.amount;
    });

    return {
      totalExpenses, totalRevenue,
      netProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
      categories,
    };
  }
}
