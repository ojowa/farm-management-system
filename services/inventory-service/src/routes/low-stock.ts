import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /low-stock - Items below minimum quantity (DB-level filtering)
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const lowStock = await scopedPrisma.$queryRaw`
      SELECT * FROM "Inventory"
      WHERE "minimumQuantity" > 0
        AND "quantity" <= "minimumQuantity"
        AND "farmId" IN (
          SELECT id FROM "Farm" WHERE "organizationId" = ${orgId}
        )
      ORDER BY ("quantity" / NULLIF("minimumQuantity", 0)) ASC
    `;
    res.json(lowStock);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /:id/reorder - Trigger reorder notification
router.post('/:id/reorder', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await scopedPrisma.inventory.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    res.json({ message: `Reorder notification triggered for ${item.name}`, item });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const lowStockRouter = router;
