import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /shift-assignments - List assignments (with optional date range filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { startDate, endDate, userId } = req.query;

    const where: any = { organizationId: orgId };
    if (userId) where.userId = String(userId);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(String(startDate));
      if (endDate) where.date.lte = new Date(String(endDate));
    }

    const assignments = await scopedPrisma.shiftAssignment.findMany({
      where,
      include: { shift: true },
      orderBy: { date: 'asc' },
    });
    res.json(assignments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /shift-assignments - Create assignment (MANAGER+)
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { shiftId, userId, date, notes } = req.body;
    if (!shiftId || !userId || !date) {
      return res.status(400).json({ error: 'shiftId, userId, and date are required' });
    }

    const shift = await scopedPrisma.shift.findFirst({ where: { id: shiftId, organizationId: orgId } });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    const existing = await scopedPrisma.shiftAssignment.findFirst({
      where: { shiftId, userId, date: new Date(date) },
    });
    if (existing) return res.status(409).json({ error: 'User already assigned to this shift on this date' });

    const assignment = await scopedPrisma.shiftAssignment.create({
      data: {
        organizationId: orgId,
        shiftId,
        userId,
        date: new Date(date),
        notes: notes || null,
      },
      include: { shift: true },
    });
    res.status(201).json(assignment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /shift-assignments/bulk - Bulk create assignments for a week
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { assignments } = req.body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'assignments array is required' });
    }

    const created = await scopedPrisma.shiftAssignment.createMany({
      data: assignments.map((a: any) => ({
        organizationId: orgId,
        shiftId: a.shiftId,
        userId: a.userId,
        date: new Date(a.date),
        notes: a.notes || null,
      })),
      skipDuplicates: true,
    });
    res.status(201).json({ count: created.count });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /shift-assignments/:id - Remove assignment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.shiftAssignment.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });
    await scopedPrisma.shiftAssignment.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const shiftAssignmentsRouter = router;
