import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /lifecycle/calendar - Calendar view data
router.get('/calendar', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { farmId, year, month } = req.query;

    const where: any = { organizationId: orgId };
    if (farmId) where.farmId = String(farmId);

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const stages = await (scopedPrisma as any).cropStage.findMany({
      where: {
        ...where,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } },
        ],
      },
      include: { cropCycle: { include: { crop: true, field: { include: { farm: true } } } } },
      orderBy: { startDate: 'asc' },
    });

    res.json(stages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /lifecycle/crop-cycle/:cropCycleId/stages - Get stages for a crop cycle
router.get('/crop-cycle/:cropCycleId/stages', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const stages = await (scopedPrisma as any).cropStage.findMany({
      where: { cropCycleId: req.params.cropCycleId },
      orderBy: { startDate: 'asc' },
    });
    res.json(stages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /lifecycle/crop-cycle/:cropCycleId/stages - Add a stage
router.post('/crop-cycle/:cropCycleId/stages', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const user = (req as any).user;
    const { stage, startDate, endDate, notes } = req.body;

    if (!stage || !startDate) {
      return res.status(400).json({ error: 'stage and startDate are required' });
    }

    const record = await (scopedPrisma as any).cropStage.create({
      data: {
        organizationId: orgId,
        cropCycleId: req.params.cropCycleId,
        stage,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes?.trim() || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /lifecycle/stages/:id - Update a stage
router.put('/stages/:id', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const { stage, startDate, endDate, notes } = req.body;
    const updateData: any = {};
    if (stage !== undefined) updateData.stage = stage;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const record = await (scopedPrisma as any).cropStage.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /lifecycle/stages/:id - Delete a stage
router.delete('/stages/:id', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    await (scopedPrisma as any).cropStage.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const lifecycleRouter = router;
