import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /weight/livestock/:livestockId - Weight history for an animal
router.get('/livestock/:livestockId', async (req: Request, res: Response) => {
  try {
    const records = await prisma.weightRecord.findMany({
      where: { livestockId: req.params.livestockId, organizationId: getOrgId(req) },
      orderBy: { recordedDate: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /weight/livestock/:livestockId - Record weight
router.post('/livestock/:livestockId', async (req: Request, res: Response) => {
  try {
    const { weight, unit, recordedDate, notes } = req.body;
    if (!weight || !recordedDate) return res.status(400).json({ error: 'weight and recordedDate are required' });

    const record = await prisma.weightRecord.create({
      data: {
        organizationId: getOrgId(req),
        livestockId: req.params.livestockId,
        weight: Number(weight),
        unit: unit || 'kg',
        recordedDate: new Date(recordedDate),
        notes: notes?.trim() || null,
        createdById: (req as any).user?.sub || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /weight/flock/:flockId - Weight history for a flock
router.get('/flock/:flockId', async (req: Request, res: Response) => {
  try {
    const records = await prisma.weightRecord.findMany({
      where: { flockId: req.params.flockId, organizationId: getOrgId(req) },
      orderBy: { recordedDate: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /weight/flock/:flockId - Record flock weight
router.post('/flock/:flockId', async (req: Request, res: Response) => {
  try {
    const { weight, unit, recordedDate, notes } = req.body;
    if (!weight || !recordedDate) return res.status(400).json({ error: 'weight and recordedDate are required' });

    const record = await prisma.weightRecord.create({
      data: {
        organizationId: getOrgId(req),
        flockId: req.params.flockId,
        weight: Number(weight),
        unit: unit || 'kg',
        recordedDate: new Date(recordedDate),
        notes: notes?.trim() || null,
        createdById: (req as any).user?.sub || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const weightRouter = router;
