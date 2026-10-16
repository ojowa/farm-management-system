export interface ProfitabilityResult {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
}

export interface FarmProfitabilityParams {
  revenue: number;
  expenses: number;
  investment?: number;
}

export class ProfitabilityCalculator {
  static calculate(params: FarmProfitabilityParams): ProfitabilityResult {
    const { revenue, expenses, investment = expenses } = params;
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const roi = investment > 0 ? (netProfit / investment) * 100 : 0;

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    };
  }

  static calculateFromMonthlyData(monthlyData: Array<{ revenue: number; expenses: number }>): ProfitabilityResult {
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);

    return this.calculate({ revenue: totalRevenue, expenses: totalExpenses });
  }

  static calculateByCategory(items: Array<{ category: string; amount: number }>): Map<string, number> {
    const totals = new Map<string, number>();
    for (const item of items) {
      const current = totals.get(item.category) || 0;
      totals.set(item.category, current + item.amount);
    }
    return totals;
  }
}
