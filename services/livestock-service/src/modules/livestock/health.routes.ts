import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /health/livestock/:livestockId - Health history for an animal
router.get('/livestock/:livestockId', async (req: Request, res: Response) => {
  try {
    const records = await prisma.healthRecord.findMany({
      where: { livestockId: req.params.livestockId, organizationId: getOrgId(req) },
      orderBy: { date: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /health/livestock/:livestockId - Add health record
router.post('/livestock/:livestockId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type, date, description, veterinarian, medications, cost, nextCheckupDate } = req.body;
    if (!type || !date || !description) return res.status(400).json({ error: 'type, date, and description are required' });

    const record = await prisma.healthRecord.create({
      data: {
        organizationId: getOrgId(req),
        livestockId: req.params.livestockId,
        type, date: new Date(date), description,
        veterinarian: veterinarian || null,
        medications: medications || null,
        cost: cost || null,
        nextCheckupDate: nextCheckupDate ? new Date(nextCheckupDate) : null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /health/vaccinations/:livestockId - Vaccination schedule
router.get('/vaccinations/:livestockId', async (req: Request, res: Response) => {
  try {
    const records = await prisma.vaccinationSchedule.findMany({
      where: { livestockId: req.params.livestockId, organizationId: getOrgId(req) },
      orderBy: { scheduledDate: 'asc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /health/vaccinations/:livestockId - Schedule vaccination
router.post('/vaccinations/:livestockId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { vaccineName, scheduledDate, notes } = req.body;
    if (!vaccineName || !scheduledDate) return res.status(400).json({ error: 'vaccineName and scheduledDate are required' });

    const record = await prisma.vaccinationSchedule.create({
      data: {
        organizationId: getOrgId(req),
        livestockId: req.params.livestockId,
        vaccineName, scheduledDate: new Date(scheduledDate),
        notes: notes?.trim() || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /health/vaccinations/:id/administer - Mark vaccination as administered
router.put('/vaccinations/:id/administer', async (req: Request, res: Response) => {
  try {
    const record = await prisma.vaccinationSchedule.update({
      where: { id: req.params.id },
      data: { status: 'ADMINISTERD', administeredDate: new Date() },
    });
    res.json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /health/overdue - Animals with overdue vaccinations
router.get('/overdue', async (req: Request, res: Response) => {
  try {
    const records = await prisma.vaccinationSchedule.findMany({
      where: {
        organizationId: getOrgId(req),
        status: 'SCHEDULED',
        scheduledDate: { lt: new Date() },
      },
      orderBy: { scheduledDate: 'asc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const healthRouter = router;
