import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /yield/crop/:cropId - Yield history
router.get('/crop/:cropId', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const records = await prisma.yieldRecord.findMany({
      where: { cropId: req.params.cropId, organizationId: getOrgId(req) },
      orderBy: { harvestedDate: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /yield/crop/:cropId - Record yield
router.post('/crop/:cropId', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { cropCycleId, quantity, unit, quality, harvestedDate, notes } = req.body;
    if (!quantity || !harvestedDate) return res.status(400).json({ error: 'quantity and harvestedDate are required' });

    const record = await prisma.yieldRecord.create({
      data: {
        organizationId: getOrgId(req),
        cropId: req.params.cropId,
        cropCycleId: cropCycleId || null,
        quantity: Number(quantity),
        unit: unit || 'kg',
        quality: quality || null,
        harvestedDate: new Date(harvestedDate),
        notes: notes?.trim() || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /yield/crop/:cropId/summary - Yield summary
router.get('/crop/:cropId/summary', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const records = await prisma.yieldRecord.findMany({
      where: { cropId: req.params.cropId, organizationId: getOrgId(req) },
      orderBy: { harvestedDate: 'asc' },
    });

    const totalYield = records.reduce((sum: number, r: any) => sum + r.quantity, 0);
    const avgYield = records.length > 0 ? Math.round((totalYield / records.length) * 100) / 100 : 0;
    const latestYield = records.length > 0 ? records[records.length - 1].quantity : 0;
    const previousYield = records.length > 1 ? records[records.length - 2].quantity : null;
    const trend = previousYield !== null ? (latestYield > previousYield ? 'up' : latestYield < previousYield ? 'down' : 'stable') : null;

    res.json({ totalYield, avgYield, totalRecords: records.length, latestYield, trend, records });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const yieldRouter = router;
