import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /shifts - List shifts for this org
router.get('/', authMiddleware({ permission: 'roster.read' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const shifts = await scopedPrisma.shift.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(shifts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /shifts - Create shift (ORG_OWNER+)
router.post('/', authMiddleware({ roles: ['ORGANIZATION_OWNER', 'SUPER_ADMIN', 'FARM_MANAGER'], permission: 'roster.write' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { name, startTime, endTime, color } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Name, startTime, and endTime are required' });
    }

    const existing = await scopedPrisma.shift.findFirst({ where: { name: name.trim(), organizationId: orgId } });
    if (existing) return res.status(409).json({ error: 'Shift already exists' });

    const shift = await scopedPrisma.shift.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        startTime,
        endTime,
        color: color || '#3B82F6',
      },
    });
    res.status(201).json(shift);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /shifts/:id - Update shift
router.put('/:id', authMiddleware({ roles: ['ORGANIZATION_OWNER', 'SUPER_ADMIN', 'FARM_MANAGER'], permission: 'roster.write' }), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.shift.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Shift not found' });

    const { name, startTime, endTime, color, isActive } = req.body;
    const shift = await scopedPrisma.shift.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(shift);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /shifts/:id - Delete shift
router.delete('/:id', authMiddleware({ roles: ['ORGANIZATION_OWNER', 'SUPER_ADMIN', 'FARM_MANAGER'], permission: 'roster.write' }), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.shift.findFirst({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Shift not found' });
    if ((existing as any)._count.assignments > 0) {
      return res.status(400).json({ error: 'Cannot delete shift with existing assignments' });
    }
    await scopedPrisma.shift.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const shiftsRouter = router;
