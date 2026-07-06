import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /export/inventory?format=csv|json
router.get('/export', async (req: Request, res: Response) => {
  try {
    const format = String(req.query.format || 'json');
    const items = await prisma.inventory.findMany();

    if (format === 'csv') {
      const headers = 'Name,Category,Quantity,Unit\n';
      const rows = items.map((i: any) => `${i.name},${i.category},${i.quantity},${i.unit}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
      return res.send(headers + rows);
    }
    res.json(items);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /import - Import inventory items
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'data array is required' });

    const orgId = getOrgId(req);
    const created = await prisma.inventory.createMany({
      data: data.map((item: any) => ({
        farmId: item.farmId || null,
        name: item.name,
        category: item.category || 'Other',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'units',
      })),
      skipDuplicates: true,
    });

    res.status(201).json({ count: created.count, message: `${created.count} items imported` });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const inventoryImportExportRouter = router;
