import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /breeding - List breeding records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (status) where.status = String(status);
    const records = await prisma.breedingRecord.findMany({ where, orderBy: { breedingDate: 'desc' } });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /breeding - Create breeding record
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { sireId, sireName, damId, damName, breedingDate, expectedDueDate, notes } = req.body;
    if (!sireId || !damId || !breedingDate) return res.status(400).json({ error: 'sireId, damId, and breedingDate are required' });

    const record = await prisma.breedingRecord.create({
      data: {
        organizationId: getOrgId(req),
        sireId, sireName: sireName || null,
        damId, damName: damName || null,
        breedingDate: new Date(breedingDate),
        expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
        notes: notes?.trim() || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /breeding/:id - Update breeding record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { status, actualBirthDate, offspringCount, notes } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (actualBirthDate !== undefined) updateData.actualBirthDate = actualBirthDate ? new Date(actualBirthDate) : null;
    if (offspringCount !== undefined) updateData.offspringCount = offspringCount;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const record = await prisma.breedingRecord.update({ where: { id: req.params.id }, data: updateData });
    res.json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /breeding/upcoming - Upcoming due dates
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const records = await prisma.breedingRecord.findMany({
      where: {
        organizationId: getOrgId(req),
        status: { in: ['BRED', 'CONFIRMED'] },
        expectedDueDate: { gte: new Date() },
      },
      orderBy: { expectedDueDate: 'asc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const breedingRouter = router;
