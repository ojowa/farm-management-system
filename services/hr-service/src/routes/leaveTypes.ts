import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /leave/types - List leave types for this org
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const types = await scopedPrisma.leaveType.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { leaveRequests: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(types);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /leave/types - Create leave type (ORG_OWNER+)
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { name, daysPerYear, isPaid } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const existing = await scopedPrisma.leaveType.findFirst({ where: { name: name.trim(), organizationId: orgId } });
    if (existing) return res.status(409).json({ error: 'Leave type already exists' });

    const type = await scopedPrisma.leaveType.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        daysPerYear: daysPerYear ?? 0,
        isPaid: isPaid ?? true,
      },
    });
    res.status(201).json(type);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /leave/types/:id - Update leave type
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.leaveType.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Leave type not found' });

    const { name, daysPerYear, isPaid, isActive } = req.body;
    const type = await scopedPrisma.leaveType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(daysPerYear !== undefined && { daysPerYear }),
        ...(isPaid !== undefined && { isPaid }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(type);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /leave/types/:id - Delete leave type
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.leaveType.findFirst({
      where: { id },
      include: { _count: { select: { leaveRequests: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Leave type not found' });
    if ((existing as any)._count.leaveRequests > 0) {
      return res.status(400).json({ error: 'Cannot delete leave type with existing requests' });
    }
    await scopedPrisma.leaveType.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const leaveTypesRouter = router;
