import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /profitability/farm?farmId=&startDate=&endDate=
router.get('/farm', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { farmId, startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(String(startDate));
    if (endDate) dateFilter.lte = new Date(String(endDate));

    const farmWhere: any = { organizationId: orgId };
    if (farmId) farmWhere.id = String(farmId);

    const farms = await prisma.farm.findMany({ where: farmWhere });
    const results = [];

    for (const farm of farms) {
      const expenses = await prisma.expense.findMany({
        where: { farmId: farm.id, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
      });
      const sales = await prisma.sale.findMany({
        where: { farmId: farm.id, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) },
      });

      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Auto-categorize expenses
      const categories: Record<string, number> = {};
      expenses.forEach((e: any) => {
        const cat = categorizeExpense(e.title);
        categories[cat] = (categories[cat] || 0) + e.amount;
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

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /profitability/summary?startDate=&endDate=
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(String(startDate));
    if (endDate) dateFilter.lte = new Date(String(endDate));

    const where = { organizationId: orgId, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) };

    const [expenses, sales] = await Promise.all([
      prisma.expense.findMany({ where }),
      prisma.sale.findMany({ where }),
    ]);

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const categories: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = categorizeExpense(e.title);
      categories[cat] = (categories[cat] || 0) + e.amount;
    });

    res.json({
      totalExpenses,
      totalRevenue,
      netProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
      categories,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

export const profitabilityRouter = router;
