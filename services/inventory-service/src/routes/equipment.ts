import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /equipment - List equipment
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, farmId } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (status) where.status = String(status);
    if (farmId) where.farmId = String(farmId);
    const items = await prisma.equipment.findMany({ where, orderBy: { name: 'asc' } });
    res.json(items);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /equipment - Create equipment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, model, serialNumber, farmId, purchaseDate, purchaseCost, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const item = await prisma.equipment.create({
      data: {
        organizationId: getOrgId(req), name, type: type || 'OTHER',
        model: model || null, serialNumber: serialNumber || null,
        farmId: farmId || null, purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost || null, notes: notes?.trim() || null,
      },
    });
    res.status(201).json(item);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /equipment/:id - Update equipment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, type, model, serialNumber, status, purchaseDate, purchaseCost, lastMaintenance, nextMaintenance, notes } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (model !== undefined) updateData.model = model;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
    if (status !== undefined) updateData.status = status;
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (purchaseCost !== undefined) updateData.purchaseCost = purchaseCost;
    if (lastMaintenance !== undefined) updateData.lastMaintenance = lastMaintenance ? new Date(lastMaintenance) : null;
    if (nextMaintenance !== undefined) updateData.nextMaintenance = nextMaintenance ? new Date(nextMaintenance) : null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    const item = await prisma.equipment.update({ where: { id: req.params.id }, data: updateData });
    res.json(item);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /equipment/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.equipment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /equipment/:id/maintenance - Maintenance history
router.get('/:id/maintenance', async (req: Request, res: Response) => {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      where: { equipmentId: req.params.id },
      orderBy: { date: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /equipment/:id/maintenance - Add maintenance record
router.post('/:id/maintenance', async (req: Request, res: Response) => {
  try {
    const { type, date, cost, description, performedBy } = req.body;
    if (!date || !description) return res.status(400).json({ error: 'date and description are required' });
    const record = await prisma.maintenanceRecord.create({
      data: {
        organizationId: getOrgId(req), equipmentId: req.params.id,
        type: type || 'SCHEDULED', date: new Date(date),
        cost: cost || null, description, performedBy: performedBy || null,
      },
    });
    // Update equipment lastMaintenance
    await prisma.equipment.update({ where: { id: req.params.id }, data: { lastMaintenance: new Date(date) } });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const equipmentRouter = router;
