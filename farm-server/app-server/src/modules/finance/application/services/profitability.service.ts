import { Inject, Injectable } from '@nestjs/common';
import {
  ExpenseRepository,
  SaleRepository,
  FarmLookupRepository,
} from '../../domain/repositories/finance.repository';
import { Expense, Sale } from '../../domain/entities/finance.entity';
import { CurrencyApplicationService } from '../../currency/application/services/currency.service';

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

@Injectable()
export class ProfitabilityService {
  constructor(
    @Inject('ExpenseRepository') private readonly expenseRepo: ExpenseRepository,
    @Inject('SaleRepository') private readonly saleRepo: SaleRepository,
    @Inject('FarmLookupRepository') private readonly farmLookupRepo: FarmLookupRepository,
    private readonly currencyService: CurrencyApplicationService,
  ) {}

  async getByFarm(organizationId: string, farmId?: string, startDate?: string, endDate?: string) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const farmWhere: Record<string, any> = { organizationId };
    if (farmId) farmWhere.id = farmId;

    const farms = await this.farmLookupRepo.findMany({
      where: farmWhere,
      select: { id: true, name: true, farmType: true },
    });

    const results = [];

    for (const farm of farms) {
      const expenseWhere: Record<string, any> = { farmId: farm.id, organizationId, status: 'POSTED' };
      if (Object.keys(dateFilter).length) expenseWhere.date = dateFilter;

      const saleWhere: Record<string, any> = { farmId: farm.id, organizationId, status: 'POSTED' };
      if (Object.keys(dateFilter).length) saleWhere.date = dateFilter;

      const [expenses, sales] = await Promise.all([
        this.expenseRepo.findMany({ where: expenseWhere }),
        this.saleRepo.findMany({ where: saleWhere }),
      ]);

      const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + ((e as any).amountInBase || 0), 0);
      const totalRevenue = sales.reduce((sum: number, s: Sale) => sum + ((s as any).amountInBase || 0), 0);
      const netProfit = totalRevenue - totalExpenses;

      const categories: Record<string, number> = {};
      expenses.forEach((e: Expense) => {
        const cat = categorizeExpense((e as any).title);
        categories[cat] = (categories[cat] || 0) + ((e as any).amount || 0);
      });

      results.push({
        farmId: farm.id,
        farmName: farm.name,
        farmType: farm.farmType,
        totalExpenses,
        totalRevenue,
        netProfit,
        profitMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        categories,
        expenseCount: expenses.length,
        saleCount: sales.length,
      });
    }

    return results;
  }

  async getSummary(organizationId: string, startDate?: string, endDate?: string) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereBase: Record<string, any> = { organizationId, status: 'POSTED' };
    if (Object.keys(dateFilter).length) whereBase.date = dateFilter;

    const [expenses, sales] = await Promise.all([
      this.expenseRepo.findMany({ where: whereBase }),
      this.saleRepo.findMany({ where: whereBase }),
    ]);

    const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + ((e as any).amountInBase || 0), 0);
    const totalRevenue = sales.reduce((sum: number, s: Sale) => sum + ((s as any).amountInBase || 0), 0);

    const categories: Record<string, number> = {};
    expenses.forEach((e: Expense) => {
      const cat = categorizeExpense((e as any).title);
      categories[cat] = (categories[cat] || 0) + ((e as any).amountInBase || 0);
    });

    return {
      totalExpenses,
      totalRevenue,
      netProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
      categories,
      fxGainLoss: await this.getFxGainLoss(organizationId),
    };
  }

  /**
   * Unrealized FX gain/loss: for each posted row in a non-base currency, the
   * difference between its current base-currency value (at the latest rate)
   * and the amountInBase recorded at transaction time. Positive = gain.
   */
  async getFxGainLoss(organizationId: string): Promise<number> {
    const { prisma } = await import('@farm/database');
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });
    const baseCurrency = org?.currency ?? 'USD';

    const [expenses, sales] = await Promise.all([
      this.expenseRepo.findMany({ where: { organizationId, status: 'POSTED' } }),
      this.saleRepo.findMany({ where: { organizationId, status: 'POSTED' } }),
    ]);

    let gainLoss = 0;
    const round2 = (n: number) => Math.round(n * 100) / 100;

    for (const row of [...expenses, ...sales]) {
      const currency = (row as any).currency;
      const amountInBase = Number((row as any).amountInBase || 0);
      const amount = (row as any).amount ?? (row as any).total ?? 0;
      if (!currency || currency === baseCurrency) continue;
      try {
        const { convertedAmount: currentValue } = await this.currencyService.convert(
          Number(amount),
          currency,
          baseCurrency,
        );
        gainLoss += round2(currentValue - amountInBase);
      } catch {
        // No rate available: skip rather than distort the total.
      }
    }

    return round2(gainLoss);
  }
}
