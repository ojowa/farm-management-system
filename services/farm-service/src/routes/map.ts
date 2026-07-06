import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /map/all - Get all farm locations for map view
router.get('/all', async (req: Request, res: Response) => {
  try {
    const farms = await prisma.farm.findMany({
      where: { organizationId: getOrgId(req) },
      select: { id: true, name: true, farmType: true, latitude: true, longitude: true, location: true, status: true },
    });
    res.json(farms);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// PUT /map/:id/location - Update farm GPS coordinates
router.put('/:id/location', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const farm = await prisma.farm.update({
      where: { id: req.params.id },
      data: { latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null },
    });
    res.json(farm);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const mapRouter = router;
