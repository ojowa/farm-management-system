import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /export/farms?format=csv|json
router.get('/export/farms', async (req: Request, res: Response) => {
  try {
    const format = String(req.query.format || 'json');
    const farms = await prisma.farm.findMany({ where: { organizationId: getOrgId(req) } });

    if (format === 'csv') {
      const headers = 'Name,Type,Location,Size,Status\n';
      const rows = farms.map((f: any) => `${f.name},${f.farmType},${f.location || ''},${f.size},${f.status}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=farms.csv');
      return res.send(headers + rows);
    }
    res.json(farms);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /import/farms - Import farms from JSON
router.post('/import/farms', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'data array is required' });

    const orgId = getOrgId(req);
    const created = await prisma.farm.createMany({
      data: data.map((f: any) => ({
        organizationId: orgId,
        name: f.name,
        farmType: f.farmType || f.farm_type || 'CROP',
        location: f.location || null,
        size: Number(f.size) || 0,
        status: f.status || 'active',
      })),
      skipDuplicates: true,
    });

    res.status(201).json({ count: created.count, message: `${created.count} farms imported` });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// GET /export/crops?format=csv|json
router.get('/export/crops', async (req: Request, res: Response) => {
  try {
    const format = String(req.query.format || 'json');
    const crops = await prisma.crop.findMany();

    if (format === 'csv') {
      const headers = 'Name\n';
      const rows = crops.map((c: any) => c.name).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=crops.csv');
      return res.send(headers + rows);
    }
    res.json(crops);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// GET /export/workers?format=csv|json
router.get('/export/workers', async (req: Request, res: Response) => {
  try {
    const format = String(req.query.format || 'json');
    const workers = await prisma.worker.findMany();

    if (format === 'csv') {
      const headers = 'Name,Role\n';
      const rows = workers.map((w: any) => `${w.name},${w.role}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=workers.csv');
      return res.send(headers + rows);
    }
    res.json(workers);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export const importExportRouter = router;
