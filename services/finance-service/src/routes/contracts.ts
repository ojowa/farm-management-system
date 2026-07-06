import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /contracts - List contracts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (type) where.type = String(type);
    if (status) where.status = String(status);
    const contracts = await prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(contracts);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /contracts - Create contract
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type, buyerSellerName, entityId, entityType, startDate, endDate, value, terms } = req.body;
    if (!type || !buyerSellerName || !startDate || !value) {
      return res.status(400).json({ error: 'type, buyerSellerName, startDate, and value are required' });
    }
    const contract = await prisma.contract.create({
      data: {
        organizationId: getOrgId(req), type, buyerSellerName,
        entityId: entityId || null, entityType: entityType || null,
        startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
        value: Number(value), terms: terms?.trim() || null,
        createdById: user?.sub || null, createdByName: user?.email || null,
      },
    });
    res.status(201).json(contract);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /contracts/:id - Update contract
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { type, buyerSellerName, startDate, endDate, value, status, terms } = req.body;
    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (buyerSellerName !== undefined) updateData.buyerSellerName = buyerSellerName;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (value !== undefined) updateData.value = Number(value);
    if (status !== undefined) updateData.status = status;
    if (terms !== undefined) updateData.terms = terms?.trim() || null;
    const contract = await prisma.contract.update({ where: { id: req.params.id }, data: updateData });
    res.json(contract);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /contracts/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const contractsRouter = router;
