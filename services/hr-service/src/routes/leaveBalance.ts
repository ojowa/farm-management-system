import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserId(req: Request): string {
  return String((req as any).user?.sub || '');
}

// GET /leave/balance - Get leave balances
router.get('/', authMiddleware({ permission: 'leave.read' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = req.query.userId as string || getUserId(req);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const balances = await scopedPrisma.leaveBalance.findMany({
      where: { organizationId: orgId, userId, year },
      include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
    });

    // Also return leave types that don't have a balance yet
    const types = await scopedPrisma.leaveType.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, daysPerYear: true, isPaid: true },
    });

    const result = types.map((t) => {
      const existing = balances.find((b) => b.leaveTypeId === t.id);
      return {
        leaveTypeId: t.id,
        leaveTypeName: t.name,
        isPaid: t.isPaid,
        totalDays: existing?.totalDays ?? t.daysPerYear,
        usedDays: existing?.usedDays ?? 0,
        remainingDays: (existing?.totalDays ?? t.daysPerYear) - (existing?.usedDays ?? 0),
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /leave/balance - Set/adjust leave balance (ORG_OWNER+)
router.put('/', authMiddleware({ roles: ['ORGANIZATION_OWNER', 'SUPER_ADMIN'], permission: 'leave.write' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { userId, leaveTypeId, year, totalDays } = req.body;

    if (!userId || !leaveTypeId || !year || totalDays === undefined) {
      return res.status(400).json({ error: 'userId, leaveTypeId, year, and totalDays are required' });
    }

    const balance = await scopedPrisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      create: { organizationId: orgId, userId, leaveTypeId, year, totalDays, usedDays: 0 },
      update: { totalDays },
    });
    res.json(balance);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const leaveBalanceRouter = router;
