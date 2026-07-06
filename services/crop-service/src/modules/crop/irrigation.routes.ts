import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /irrigation/schedule - Active schedules
router.get('/schedule', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const { farmId } = req.query;
    const where: any = { organizationId: getOrgId(req), isActive: true };
    if (farmId) where.farmId = String(farmId);
    const schedules = await prisma.irrigationSchedule.findMany({ where, orderBy: { nextRun: 'asc' } });
    res.json(schedules);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /irrigation/schedule - Create schedule
router.post('/schedule', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { farmId, cropCycleId, name, frequency, waterAmount, unit, startDate, endDate } = req.body;
    if (!farmId || !name || !frequency || !waterAmount || !startDate) {
      return res.status(400).json({ error: 'farmId, name, frequency, waterAmount, and startDate are required' });
    }
    const schedule = await prisma.irrigationSchedule.create({
      data: {
        organizationId: getOrgId(req), farmId,
        cropCycleId: cropCycleId || null,
        name, frequency, waterAmount: Number(waterAmount), unit: unit || 'liters',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextRun: new Date(startDate),
        createdById: user?.sub || null,
      },
    });
    res.status(201).json(schedule);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /irrigation/schedule/:id - Update schedule
router.put('/schedule/:id', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const { name, frequency, waterAmount, unit, isActive, endDate } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (waterAmount !== undefined) updateData.waterAmount = Number(waterAmount);
    if (unit !== undefined) updateData.unit = unit;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    const schedule = await prisma.irrigationSchedule.update({ where: { id: req.params.id }, data: updateData });
    res.json(schedule);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /irrigation/schedule/:id
router.delete('/schedule/:id', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    await prisma.irrigationSchedule.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// POST /irrigation/log - Record irrigation event
router.post('/log', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { scheduleId, farmId, date, duration, waterAmount, unit, notes } = req.body;
    if (!scheduleId || !farmId || !date || !waterAmount) {
      return res.status(400).json({ error: 'scheduleId, farmId, date, and waterAmount are required' });
    }
    const log = await prisma.irrigationLog.create({
      data: {
        organizationId: getOrgId(req), scheduleId, farmId,
        date: new Date(date), duration: duration || null,
        waterAmount: Number(waterAmount), unit: unit || 'liters',
        notes: notes?.trim() || null,
        recordedById: user?.sub || null,
        recordedByName: user?.email || null,
      },
    });
    // Update schedule lastRun
    await prisma.irrigationSchedule.update({ where: { id: scheduleId }, data: { lastRun: new Date(date) } });
    res.status(201).json(log);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /irrigation/log - List logs
router.get('/log', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const { farmId, scheduleId } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (farmId) where.farmId = String(farmId);
    if (scheduleId) where.scheduleId = String(scheduleId);
    const logs = await prisma.irrigationLog.findMany({ where, orderBy: { date: 'desc' } });
    res.json(logs);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const irrigationRouter = router;