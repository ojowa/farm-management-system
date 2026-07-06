import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /pest-disease - List records
router.get('/', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const { type, severity, farmId } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (type) where.type = String(type);
    if (severity) where.severity = String(severity);
    if (farmId) where.farmId = String(farmId);
    const records = await prisma.pestDiseaseRecord.findMany({ where, orderBy: { identifiedDate: 'desc' } });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GET /pest-disease/active - Currently active issues
router.get('/active', authMiddleware({ permission: 'crop.read' }), async (req: Request, res: Response) => {
  try {
    const records = await prisma.pestDiseaseRecord.findMany({
      where: { organizationId: getOrgId(req), outcome: null },
      orderBy: { severity: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /pest-disease - Create record
router.post('/', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { cropCycleId, farmId, type, name, severity, identifiedDate, treatment, notes } = req.body;
    if (!farmId || !type || !name || !identifiedDate) {
      return res.status(400).json({ error: 'farmId, type, name, and identifiedDate are required' });
    }
    const record = await prisma.pestDiseaseRecord.create({
      data: {
        organizationId: getOrgId(req),
        cropCycleId: cropCycleId || null, farmId,
        type, name, severity: severity || 'LOW',
        identifiedDate: new Date(identifiedDate),
        treatment: treatment?.trim() || null,
        notes: notes?.trim() || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /pest-disease/:id - Update record
router.put('/:id', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    const { treatment, treatedDate, outcome, severity, notes } = req.body;
    const updateData: any = {};
    if (treatment !== undefined) updateData.treatment = treatment?.trim() || null;
    if (treatedDate !== undefined) updateData.treatedDate = treatedDate ? new Date(treatedDate) : null;
    if (outcome !== undefined) updateData.outcome = outcome?.trim() || null;
    if (severity !== undefined) updateData.severity = severity;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    const record = await prisma.pestDiseaseRecord.update({ where: { id: req.params.id }, data: updateData });
    res.json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /pest-disease/:id
router.delete('/:id', authMiddleware({ permission: 'crop.write' }), async (req: Request, res: Response) => {
  try {
    await prisma.pestDiseaseRecord.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const pestDiseaseRouter = router;